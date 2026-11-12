/**
 * Promo Tracker - Google Apps Script Backend Web App
 * 
 * จัดการการบันทึกโปรโมชั่นกาแฟซอง และ บะหมี่/โจ๊ก/ข้าวต้ม ลง Google Sheet และรูปภาพลง Google Drive
 * 
 * Script Properties ที่ต้องตั้งค่า:
 * - SECRET: รหัสลับความปลอดภัยที่ตรงกับ APPS_SCRIPT_SECRET ใน Next.js
 * - FOLDER_ID: Google Drive Folder ID สำหรับเก็บรูปภาพ
 * - SPREADSHEET_ID: 11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4 (หรือเว้นว่างถ้าผูกกับชีตโดยตรง)
 * - SHEET_NAME: PRT (ค่าเริ่มต้นสำหรับกาแฟซอง)
 */

function getSettings() {
  var props = PropertiesService.getScriptProperties();
  return {
    SECRET: props.getProperty('SECRET') || '',
    FOLDER_ID: props.getProperty('FOLDER_ID') || '',
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID') || '11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4',
    SHEET_NAME: props.getProperty('SHEET_NAME') || 'PRT'
  };
}

function getSheet(targetSheetName) {
  var settings = getSettings();
  var ss;
  try {
    if (settings.SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(settings.SPREADSHEET_ID);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  } catch (err) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    throw new Error('ไม่พบ Google Spreadsheet โปรดตรวจสอบ SPREADSHEET_ID');
  }
  
  var actualSheetName = targetSheetName || settings.SHEET_NAME || 'PRT';
  var sheet = ss.getSheetByName(actualSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(actualSheetName);
    // เพิ่ม Header แถวที่ 1 หากยังไม่มี
    sheet.appendRow([
      'Date', 'Store', 'Brand', 'Item Name', 'Color/Package',
      'Pack Size', 'Promotion', 'Channel', 'Freq/Week',
      'Period', 'Machanic', 'Retail Price', 'Pro Price', 'Image'
    ]);
  }
  return sheet;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // พยายามขอล็อคสูงสุด 30 วินาที ป้องกัน Concurrency Conflict
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: 'ระบบกำลังทำงานอื่นอยู่ โปรดลองใหม่อีกครั้งในอีกสักครู่ (Lock timeout)'
    });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'ไม่พบข้อมูลใน Request Body' });
    }

    var payload = JSON.parse(e.postData.contents);
    var settings = getSettings();

    // 1. ตรวจสอบ Secret Key
    if (!settings.SECRET || payload.secret !== settings.SECRET) {
      return jsonResponse({
        ok: false,
        error: 'Unauthorized: Secret key ไม่ถูกต้องหรือไม่ตรงกับที่ตั้งไว้ใน Apps Script'
      });
    }

    var action = payload.action;
    var sheetName = payload.sheetName || 'PRT';

    // 2. แยกตาม Action
    if (action === 'checkDuplicates') {
      return handleCheckDuplicates(payload, sheetName);
    } else if (action === 'save') {
      return handleSave(payload, sheetName);
    } else if (action === 'list') {
      return handleList(payload, sheetName);
    } else {
      return jsonResponse({ ok: false, error: 'ไม่รู้จัก action: ' + action });
    }

  } catch (err) {
    return jsonResponse({
      ok: false,
      error: 'เกิดข้อผิดพลาดภายใน Apps Script: ' + err.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function doGet(e) {
  return jsonResponse({
    ok: true,
    message: 'Promo Tracker Google Apps Script Web App is running'
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * แปลงสตริง วัน/เดือน/ปี (dd/mm/yyyy ค.ศ.) เป็น Date Object
 */
function parseDateDMY(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  var parts = String(dateStr).trim().split('/');
  if (parts.length === 3) {
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    // แปลง พ.ศ. เป็น ค.ศ. หากเกิน 2400
    if (year > 2400) year -= 543;
    return new Date(Date.UTC(year, month, day));
  }
  var parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * คำนวณช่วงสัปดาห์ (จันทร์ - อาทิตย์) คืนค่าสตริงเอกลักษณ์ของสัปดาห์ เช่น "2026-W45"
 */
function getWeekKey(dateObj) {
  if (!dateObj) return 'unknown';
  var d = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
  var dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + (weekNo < 10 ? '0' + weekNo : weekNo);
}

/**
 * Action: checkDuplicates
 */
function handleCheckDuplicates(payload, sheetName) {
  var rows = payload.rows || [];
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  
  var existingRecords = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var dateVal = r[0];
    var storeVal = String(r[1] || '').trim();
    var brandVal = String(r[2] || '').trim();
    var colorVal = String(r[4] || '').trim();
    var periodVal = String(r[9] || '').trim();
    var proPriceVal = parseFloat(r[12]) || 0;
    
    var d = parseDateDMY(dateVal);
    var weekKey = d ? getWeekKey(d) : '';
    
    existingRecords.push({
      store: storeVal,
      brand: brandVal,
      color: colorVal,
      period: periodVal,
      proPrice: proPriceVal.toFixed(2),
      weekKey: weekKey
    });
  }

  var batchCounts = {};

  var results = rows.map(function(item) {
    var itemDate = parseDateDMY(item.date);
    var itemWeekKey = itemDate ? getWeekKey(itemDate) : '';
    var itemStore = String(item.store || '').trim();
    var itemBrand = String(item.brand || '').trim();
    var itemColor = String(item.color || '').trim();
    var itemPeriod = String(item.period || '').trim();
    var itemProPrice = (parseFloat(item.proPrice) || 0).toFixed(2);

    var existingFreq = 0;
    var isDuplicate = false;
    var duplicateReason = '';

    for (var j = 0; j < existingRecords.length; j++) {
      var ex = existingRecords[j];
      if (ex.store === itemStore && ex.brand === itemBrand && ex.weekKey === itemWeekKey) {
        existingFreq++;
      }
      
      if (
        ex.store === itemStore &&
        ex.brand === itemBrand &&
        ex.color === itemColor &&
        ex.period === itemPeriod &&
        ex.proPrice === itemProPrice
      ) {
        isDuplicate = true;
        duplicateReason = 'พบข้อมูล Store, Brand, Color/Package, Period และ Pro Price ตรงกับในชีตแล้ว';
      }
    }

    var batchKey = itemStore + '|' + itemBrand + '|' + itemWeekKey;
    var priorInBatch = batchCounts[batchKey] || 0;
    batchCounts[batchKey] = priorInBatch + 1;

    var totalFreq = existingFreq + priorInBatch + 1;

    return {
      freqWeek: totalFreq,
      isDuplicate: isDuplicate,
      duplicateReason: duplicateReason
    };
  });

  return jsonResponse({
    ok: true,
    results: results
  });
}

/**
 * Action: save
 */
function handleSave(payload, sheetName) {
  var rows = payload.rows || [];
  var images = payload.images || [];
  var settings = getSettings();
  var sheet = getSheet(sheetName);

  if (rows.length === 0) {
    return jsonResponse({ ok: false, error: 'ไม่มีแถวข้อมูลที่จะบันทึก' });
  }

  var driveFolder = null;
  if (settings.FOLDER_ID) {
    try {
      driveFolder = DriveApp.getFolderById(settings.FOLDER_ID);
    } catch (e) {
      Logger.log('ไม่สามารถเข้าถึง Folder ID: ' + e.toString());
    }
  }

  var imageUrlMap = {};
  var uploadedUrls = [];

  for (var k = 0; k < images.length; k++) {
    var img = images[k];
    if (!img.base64) continue;
    
    var viewUrl = '';
    if (driveFolder) {
      try {
        var now = new Date();
        var yyyy = now.getFullYear();
        var mm = ('0' + (now.getMonth() + 1)).slice(-2);
        var subfolderName = yyyy + '-' + mm;
        
        var subfolders = driveFolder.getFoldersByName(subfolderName);
        var targetSubfolder;
        if (subfolders.hasNext()) {
          targetSubfolder = subfolders.next();
        } else {
          targetSubfolder = driveFolder.createFolder(subfolderName);
        }

        var rawBase64 = img.base64;
        if (rawBase64.indexOf(',') > -1) {
          rawBase64 = rawBase64.split(',')[1];
        }
        var mimeType = img.mimeType || 'image/jpeg';
        var decodedBytes = Utilities.base64Decode(rawBase64);
        var fileName = img.filename || ('promo_' + Utilities.formatDate(now, 'GMT+7', 'yyyyMMdd_HHmmss') + '_' + (k + 1) + '.jpg');
        
        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        var file = targetSubfolder.createFile(blob);
        
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        viewUrl = file.getUrl();
      } catch (uploadErr) {
        Logger.log('บันทึกรูปภาพลง Drive ล้มเหลว: ' + uploadErr.toString());
        viewUrl = '';
      }
    }

    if (img.id) {
      imageUrlMap[img.id] = viewUrl;
    }
    uploadedUrls.push(viewUrl);
  }

  var appendRows = [];
  for (var idx = 0; idx < rows.length; idx++) {
    var r = rows[idx];
    
    var imgUrl = '';
    if (r.imageId && imageUrlMap[r.imageId]) {
      imgUrl = imageUrlMap[r.imageId];
    } else if (r.imageUrl) {
      imgUrl = r.imageUrl;
    } else if (uploadedUrls.length > 0) {
      imgUrl = uploadedUrls[0];
    }

    var imageFormula = imgUrl ? '=HYPERLINK("' + imgUrl + '","ดูรูป")' : '';

    var rowArray = [
      r.date || '',
      r.store || '',
      r.brand || '',
      r.itemName || '',
      r.color || '',
      parseInt(r.packSize, 10) || '',
      r.promotion || '',
      r.channel || '',
      parseInt(r.freqWeek, 10) || 1,
      r.period || '',
      r.machanic || '',
      formatPriceNumber(r.retailPrice),
      formatPriceNumber(r.proPrice),
      imageFormula
    ];

    appendRows.push(rowArray);
  }

  var startRow = sheet.getLastRow() + 1;
  var numRows = appendRows.length;
  var numCols = 14;

  var range = sheet.getRange(startRow, 1, numRows, numCols);
  range.setValues(appendRows);

  var priceRange = sheet.getRange(startRow, 12, numRows, 2);
  priceRange.setNumberFormat('#,##0.00');

  var dateRange = sheet.getRange(startRow, 1, numRows, 1);
  dateRange.setNumberFormat('@');

  return jsonResponse({
    ok: true,
    rowsAdded: numRows,
    sheetName: sheetName,
    imageUrls: uploadedUrls,
    spreadsheetUrl: sheet.getParent().getUrl()
  });
}

function formatPriceNumber(val) {
  if (val === null || val === undefined || val === '') return '';
  var num = parseFloat(val);
  return isNaN(num) ? '' : num;
}

/**
 * Action: list
 */
function handleList(payload, sheetName) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ ok: true, sheetName: sheetName, rows: [] });
  }

  var count = payload.limit || 50;
  var startRow = Math.max(2, lastRow - count + 1);
  var numRows = lastRow - startRow + 1;

  var range = sheet.getRange(startRow, 1, numRows, 14);
  var values = range.getValues();
  var formulas = range.getFormulas();

  var resultList = [];
  for (var i = values.length - 1; i >= 0; i--) {
    var r = values[i];
    var f = formulas[i];

    var imgUrl = '';
    var formulaN = f[13] || '';
    var match = formulaN.match(/HYPERLINK\("([^"]+)"/i);
    if (match && match[1]) {
      imgUrl = match[1];
    }

    resultList.push({
      date: formatDateString(r[0]),
      store: r[1] || '',
      brand: r[2] || '',
      itemName: r[3] || '',
      color: r[4] || '',
      packSize: r[5] || '',
      promotion: r[6] || '',
      channel: r[7] || '',
      freqWeek: r[8] || '',
      period: r[9] || '',
      machanic: r[10] || '',
      retailPrice: r[11] !== '' ? Number(r[11]).toFixed(2) : '',
      proPrice: r[12] !== '' ? Number(r[12]).toFixed(2) : '',
      imageUrl: imgUrl
    });
  }

  return jsonResponse({
    ok: true,
    sheetName: sheetName,
    rows: resultList
  });
}

function formatDateString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var d = ('0' + val.getDate()).slice(-2);
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    var y = val.getFullYear();
    if (y > 2400) y -= 543;
    return d + '/' + m + '/' + y;
  }
  return String(val);
}
