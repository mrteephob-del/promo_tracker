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
    var headers = [
      'Date', 'Store', 'Brand', 'Item Name', 'Color/Package',
      'Pack Size', 'Promotion', 'Channel', 'Freq/Month',
      'Period', 'Machanic', 'Retail Price', 'Pro Price', 'Image'
    ];
    if (actualSheetName === 'NOODLE') {
      headers.push('Category');
    }
    sheet.appendRow(headers);
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
    } else if (action === 'clean') {
      var resClean = cleanAndNormalizeData();
      return jsonResponse({ ok: true, result: resClean });
    } else if (action === 'categorize') {
      var resCat = assignNoodleCategories();
      return jsonResponse({ ok: true, result: resCat });
    } else if (action === 'setupValidation') {
      var resVal = setupSheetValidationsAndFormatting();
      return jsonResponse(resVal);
    } else if (action === 'populateImagesFromDrive') {
      var resImages = populateImagesFromDriveFolder();
      return jsonResponse(resImages);
    } else if (action === 'recalculateFrequency') {
      var resRecalc = updateMonthlyFrequenciesAndPredictPeriods();
      return jsonResponse(resRecalc);
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
 * คำนวณรหัสเดือน เช่น "2026-M11" หรือจาก Period
 */
function getMonthKey(dateObj, periodStr) {
  if (periodStr) {
    var matchP = String(periodStr).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (matchP) {
      var pMonth = parseInt(matchP[2], 10);
      var pYear = parseInt(matchP[3], 10);
      if (pYear > 2400) pYear -= 543;
      return pYear + '-M' + (pMonth < 10 ? '0' + pMonth : pMonth);
    }
  }
  if (!dateObj) return 'unknown';
  var yyyy = dateObj.getUTCFullYear();
  var mm = dateObj.getUTCMonth() + 1;
  return yyyy + '-M' + (mm < 10 ? '0' + mm : mm);
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
    var monthKey = getMonthKey(d, periodVal);
    
    existingRecords.push({
      store: storeVal,
      brand: brandVal,
      color: colorVal,
      period: periodVal,
      proPrice: proPriceVal.toFixed(2),
      weekKey: weekKey,
      monthKey: monthKey
    });
  }

  var batchCounts = {};

  var results = rows.map(function(item) {
    var itemDate = parseDateDMY(item.date);
    var itemPeriod = String(item.period || '').trim();
    var itemWeekKey = itemDate ? getWeekKey(itemDate) : '';
    var itemMonthKey = getMonthKey(itemDate, itemPeriod);
    var itemStore = String(item.store || '').trim();
    var itemBrand = String(item.brand || '').trim();
    var itemColor = String(item.color || '').trim();
    var itemProPrice = (parseFloat(item.proPrice) || 0).toFixed(2);

    var existingFreq = 0;
    var isDuplicate = false;
    var duplicateReason = '';

    for (var j = 0; j < existingRecords.length; j++) {
      var ex = existingRecords[j];
      if (ex.store === itemStore && ex.brand === itemBrand && ex.monthKey === itemMonthKey) {
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

    var batchKey = itemStore + '|' + itemBrand + '|' + itemMonthKey;
    var priorInBatch = batchCounts[batchKey] || 0;
    batchCounts[batchKey] = priorInBatch + 1;

    var totalFreq = existingFreq + priorInBatch + 1;

    return {
      freqMonth: totalFreq,
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
      parseInt(r.freqMonth || r.freqWeek, 10) || 1,
      r.period || '',
      r.machanic || '',
      formatPriceNumber(r.retailPrice),
      formatPriceNumber(r.proPrice),
      imageFormula
    ];

    if (sheetName === 'NOODLE') {
      var subCat = r.subCategory || r.category || classifyNoodleItem(r.brand, r.itemName, r.machanic);
      rowArray.push(subCat);
    }

    appendRows.push(rowArray);
  }

  var startRow = sheet.getLastRow() + 1;
  var numRows = appendRows.length;
  var numCols = (sheetName === 'NOODLE') ? 15 : 14;

  var range = sheet.getRange(startRow, 1, numRows, numCols);
  range.setValues(appendRows);

  // หากมีการคาดการณ์ Period ให้มาร์คสีพื้นหลัง #FFF9C4 และ Note ในคอลัมน์ 10 (Period)
  for (var prIdx = 0; prIdx < rows.length; prIdx++) {
    if (rows[prIdx].isPredictedPeriod) {
      try {
        var periodCell = sheet.getRange(startRow + prIdx, 10);
        periodCell.setBackground('#FFF9C4');
        periodCell.setNote('คาดการณ์ระยะเวลาโปรโมชั่นจากรอบใบปลิวของห้าง');
      } catch (eColor) {
        Logger.log('Set background error: ' + eColor.toString());
      }
    }
  }

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
  var maxCols = Math.max(14, sheet.getLastColumn());

  var range = sheet.getRange(startRow, 1, numRows, maxCols);
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

    var subCat = r[14] || '';
    if (!subCat && sheetName === 'NOODLE') {
      subCat = classifyNoodleItem(r[2], r[3], r[10]);
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
      freqMonth: r[8] || '',
      freqWeek: r[8] || '',
      period: r[9] || '',
      machanic: r[10] || '',
      retailPrice: r[11] !== '' ? Number(r[11]).toFixed(2) : '',
      proPrice: r[12] !== '' ? Number(r[12]).toFixed(2) : '',
      imageUrl: imgUrl,
      subCategory: subCat
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

/**
 * ฟังก์ชันทำความสะอาดและปรับปรุงชื่อแบรนด์ให้ถูกต้องและเป็นมาตรฐานเดียวกัน
 * สามารถกดเรียกใช้ (Run) ได้โดยตรงจาก Google Apps Script Editor โดยไม่ต้องส่ง Request
 */
function cleanAndNormalizeData() {
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
    throw new Error('ไม่พบ Google Spreadsheet');
  }

  // 1. ทำความสะอาดแถบ PRT (กาแฟซอง)
  var sheetPrt = ss.getSheetByName('PRT');
  var prtUpdates = 0;
  if (sheetPrt && sheetPrt.getLastRow() > 1) {
    var numRowsPrt = sheetPrt.getLastRow() - 1;
    var rangePrt = sheetPrt.getRange(2, 3, numRowsPrt, 1);
    var brandsPrt = rangePrt.getValues();
    for (var i = 0; i < brandsPrt.length; i++) {
      var brand = String(brandsPrt[i][0] || '').trim();
      var newBrand = brand;
      if (brand === 'Moccona') newBrand = 'มอคโคน่า';
      else if (brand === 'Birdy') newBrand = 'เบอร์ดี้';
      else if (brand === 'Super') newBrand = 'ซุปเปอร์';
      else if (brand === 'Nescafe') newBrand = 'เนสกาแฟ';

      if (newBrand !== brand) {
        brandsPrt[i][0] = newBrand;
        prtUpdates++;
      }
    }
    if (prtUpdates > 0) {
      rangePrt.setValues(brandsPrt);
    }
  }
  Logger.log('PRT Updated: ' + prtUpdates + ' rows');

  // 2. ทำความสะอาดแถบ NOODLE (บะหมี่ โจ๊ก ข้าวต้ม)
  var sheetNoodle = ss.getSheetByName('NOODLE');
  var noodleUpdates = 0;
  var noodleDeleted = 0;
  if (sheetNoodle && sheetNoodle.getLastRow() > 1) {
    var lastRow = sheetNoodle.getLastRow();
    // วนลูปจากล่างขึ้นบนสำหรับการลบแถวที่ไม่ใช่บะหมี่/โจ๊ก
    for (var r = lastRow; r >= 2; r--) {
      var rowValues = sheetNoodle.getRange(r, 1, 1, 4).getValues()[0];
      var brand = String(rowValues[2] || '').trim();
      var itemName = String(rowValues[3] || '').trim();

      // ตรวจสอบแถวที่ต้องลบ (ไม่ใช่บะหมี่ โจ๊ก ข้าวต้ม)
      var isNonNoodle =
        (brand === 'เบญจรงค์' && (itemName.indexOf('5 กก') > -1 || itemName.indexOf('ข้าวขาว') > -1 || itemName.indexOf('ข้าวต้ม 5') > -1)) ||
        (brand === 'ฟ้าไทย' && (itemName.indexOf('ผงทำอาหาร') > -1 || itemName.indexOf('ผงทำน้ำซุป') > -1)) ||
        (brand === 'ฟิชไทย' || brand === 'ปลาไทย') ||
        (brand === 'รสดี' && itemName.indexOf('มาม่า') === -1 && itemName.indexOf('บะหมี่') === -1 && itemName.indexOf('โจ๊ก') === -1) ||
        (brand === 'ระฆังทอง' && itemName.indexOf('พะโล้') > -1) ||
        (brand === 'หมึกกี้เมียว' || brand === 'พลอยพลัส') ||
        (brand === 'หมึกกรุบ' && itemName.indexOf('คนอร์') === -1);

      if (isNonNoodle) {
        sheetNoodle.deleteRow(r);
        noodleDeleted++;
        Logger.log('Deleted non-noodle row ' + r + ': ' + brand + ' - ' + itemName);
        continue;
      }

      // ปรับชื่อแบรนด์ให้เป็นมาตรฐาน
      var newBrand = brand;
      if (brand === 'Samyang' || brand === 'Buldak' || brand === 'Bulldak') newBrand = 'ซัมยัง';
      else if (brand === 'Paldo' || brand === 'พัลโด' || brand === 'พาลาโด' || brand === 'Paldo Koreno') newBrand = 'พาลโด';
      else if (brand === 'Otoya') newBrand = 'โอโตยะ';

      if (newBrand !== brand) {
        sheetNoodle.getRange(r, 3).setValue(newBrand);
        noodleUpdates++;
      }
    }

    // 3. แยกแถวที่รวมหลายแบรนด์ (เช่น "มาม่า, ไวไว, ยำยำ, นิสชิน") ออกเป็น 1 แถวต่อ 1 แบรนด์เดี่ยว
    var currentLastRow = sheetNoodle.getLastRow();
    if (currentLastRow > 1) {
      var currentRange = sheetNoodle.getRange(2, 1, currentLastRow - 1, 14);
      var currentValues = currentRange.getValues();
      var currentFormulas = currentRange.getFormulas();
      var validBrands = ['มาม่า', 'ไวไว', 'ยำยำ', 'นิสชิน', 'ซัมยัง', 'คนอร์', 'เกษตร', 'ควิก'];
      
      var rowsToDelete = [];
      var rowsToAdd = [];

      for (var idx = 0; idx < currentValues.length; idx++) {
        var bStr = String(currentValues[idx][2] || '').trim();
        if (bStr.indexOf(',') > -1 || bStr.indexOf('/') > -1) {
          var rawSplits = bStr.split(/[,/]+/).map(function(s) { return s.trim(); });
          var matchedBrands = [];
          for (var sIdx = 0; sIdx < rawSplits.length; sIdx++) {
            var spl = rawSplits[sIdx];
            for (var vbIdx = 0; vbIdx < validBrands.length; vbIdx++) {
              if (spl.indexOf(validBrands[vbIdx]) > -1 && matchedBrands.indexOf(validBrands[vbIdx]) === -1) {
                matchedBrands.push(validBrands[vbIdx]);
                break;
              }
            }
          }

          if (matchedBrands.length > 0) {
            rowsToDelete.push(idx + 2);
            for (var mIdx = 0; mIdx < matchedBrands.length; mIdx++) {
              var sBrand = matchedBrands[mIdx];
              var cloned = currentValues[idx].slice();
              cloned[2] = sBrand;
              if (currentFormulas[idx][13]) {
                cloned[13] = currentFormulas[idx][13];
              }
              rowsToAdd.push(cloned);
            }
          }
        }
      }

      for (var delIdx = rowsToDelete.length - 1; delIdx >= 0; delIdx--) {
        sheetNoodle.deleteRow(rowsToDelete[delIdx]);
      }

      if (rowsToAdd.length > 0) {
        sheetNoodle.getRange(sheetNoodle.getLastRow() + 1, 1, rowsToAdd.length, 14).setValues(rowsToAdd);
        Logger.log('Split ' + rowsToDelete.length + ' combined rows into ' + rowsToAdd.length + ' individual brand rows');
      }
    }
  }
  Logger.log('NOODLE Updated: ' + noodleUpdates + ' rows, Deleted: ' + noodleDeleted + ' rows');

  // 4. ทำความสะอาดช่อง Period (ลบ null - ออก และจัดรูปแบบให้เป็นระเบียบ)
  var periodResult = cleanAndFixSheetPeriods();

  // 5. จัดหมวดหมู่ชีต NOODLE (บะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม, มันบด) ลงคอลัมน์ O
  var catResult = assignNoodleCategories();

  return {
    prtUpdates: prtUpdates,
    noodleUpdates: noodleUpdates,
    noodleDeleted: noodleDeleted,
    periodCleaned: periodResult,
    categoryAssignment: catResult
  };
}

/**
 * ฟังก์ชันทำความสะอาดและจัดรูปแบบ Period ใน Google Sheet (ทั้ง PRT และ NOODLE)
 * 1. แปลง "null - dd/mm/yyyy" ให้กลายเป็น "ถึง dd/mm/yyyy"
 * 2. ล้างค่า "null - null" ให้เป็นค่าว่าง
 * 3. สามารถกดปุ่ม Run ได้ทันทีใน Google Apps Script
 */
function cleanAndFixSheetPeriods() {
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

  if (!ss) throw new Error('ไม่พบ Google Spreadsheet');

  var sheetNames = ['PRT', 'NOODLE'];
  var totalFixed = 0;

  for (var sIdx = 0; sIdx < sheetNames.length; sIdx++) {
    var sheet = ss.getSheetByName(sheetNames[sIdx]);
    if (!sheet || sheet.getLastRow() <= 1) continue;

    var numRows = sheet.getLastRow() - 1;
    // Column J คือ คอลัมน์ที่ 10 (Period)
    var periodRange = sheet.getRange(2, 10, numRows, 1);
    var values = periodRange.getValues();
    var sheetFixed = 0;

    for (var i = 0; i < values.length; i++) {
      var p = String(values[i][0] || '').trim();
      if (!p) continue;

      var newP = p;
      if (p === 'null - null' || p === 'null' || p === 'undefined') {
        newP = '';
      } else if (p.indexOf('null -') === 0 || p.indexOf('null-') === 0) {
        var endPart = p.replace(/^null\s*-\s*/, '').trim();
        newP = (endPart && endPart !== 'null') ? ('ถึง ' + endPart) : '';
      } else if (p.indexOf('- ') === 0) {
        var endOnly = p.replace(/^-\s*/, '').trim();
        newP = endOnly ? ('ถึง ' + endOnly) : '';
      }

      if (newP !== p) {
        values[i][0] = newP;
        sheetFixed++;
      }
    }

    if (sheetFixed > 0) {
      periodRange.setValues(values);
      totalFixed += sheetFixed;
      Logger.log(sheetNames[sIdx] + ': แก้ไข Period สำเร็จ ' + sheetFixed + ' แถว');
    }
  }

  Logger.log('รวมแก้ไข Period ทั้งหมด: ' + totalFixed + ' แถว');
  return {
    ok: true,
    totalFixed: totalFixed,
    message: 'ทำความสะอาด Period สำเร็จเรียบร้อย รวม ' + totalFixed + ' รายการ'
  };
}

/**
 * แยกประเภทสินค้าในหมวด NOODLE ออกเป็น 4 หมวดหมู่ย่อย:
 * 1. บะหมี่กึ่งสำเร็จรูป
 * 2. โจ๊ก
 * 3. ข้าวต้ม
 * 4. มันบด
 */
function classifyNoodleItem(brand, itemName, machanic) {
  var b = String(brand || '').toLowerCase();
  var name = String(itemName || '').toLowerCase();
  var mech = String(machanic || '').toLowerCase();
  var fullText = b + ' ' + name + ' ' + mech;

  // 1. มันบด (Mashed Potato)
  if (fullText.indexOf('มันบด') > -1 || fullText.indexOf('mashed potato') > -1 || fullText.indexOf('โพเทโต้') > -1) {
    return 'มันบด';
  }

  // 2. ข้าวต้ม (Instant Boiled Rice / Rice Soup)
  var hasKhaotom = fullText.indexOf('ข้าวต้ม') > -1;
  var hasJok = fullText.indexOf('โจ๊ก') > -1 || fullText.indexOf('congee') > -1 || fullText.indexOf('porridge') > -1;
  var hasNoodle = fullText.indexOf('บะหมี่') > -1 || fullText.indexOf('มาม่า') > -1 || fullText.indexOf('ราเมน') > -1 || fullText.indexOf('ramen') > -1;

  if (hasKhaotom && !hasJok && !hasNoodle) {
    return 'ข้าวต้ม';
  }

  if (hasKhaotom && hasJok) {
    var posKhaotom = name.indexOf('ข้าวต้ม');
    var posJok = name.indexOf('โจ๊ก');
    if (posKhaotom !== -1 && (posJok === -1 || posKhaotom < posJok)) {
      return 'ข้าวต้ม';
    }
    return 'โจ๊ก';
  }

  if (hasKhaotom && hasNoodle) {
    if (name.indexOf('ข้าวต้ม') > -1 && name.indexOf('บะหมี่') === -1) {
      return 'ข้าวต้ม';
    }
    return 'บะหมี่กึ่งสำเร็จรูป';
  }

  // 3. โจ๊ก (Congee / Porridge)
  if (hasJok) {
    return 'โจ๊ก';
  }

  // 4. บะหมี่กึ่งสำเร็จรูป (Instant Noodles)
  return 'บะหมี่กึ่งสำเร็จรูป';
}

/**
 * ฟังก์ชันจัดหมวดหมู่ชีต NOODLE ลงคอลัมน์ O (Category) ทั้งหมด
 * สามารถเลือกชื่อฟังก์ชันนี้แล้วกดปุ่ม "▷ เรียกใช้" (Run) จาก Google Apps Script ได้โดยตรง
 */
function assignNoodleCategories() {
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
    throw new Error('ไม่พบ Google Spreadsheet');
  }

  var sheet = ss.getSheetByName('NOODLE');
  if (!sheet) {
    throw new Error('ไม่พบแถบ NOODLE');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { ok: true, message: 'ไม่มีแถวข้อมูลใน NOODLE' };
  }

  // 1. ตั้งหัวตารางคอลัมน์ O (Column 15) แถวที่ 1 ให้เป็น "Category"
  var headerRange = sheet.getRange(1, 15);
  headerRange.setValue('Category');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 2. อ่านข้อมูลทั้งหมดจากคอลัมน์ A ถึง N (แถว 2 ถึง lastRow)
  var numRows = lastRow - 1;
  var dataRange = sheet.getRange(2, 1, numRows, 14);
  var values = dataRange.getValues();

  var categoryColValues = [];
  var stats = {
    'บะหมี่กึ่งสำเร็จรูป': 0,
    'โจ๊ก': 0,
    'ข้าวต้ม': 0,
    'มันบด': 0
  };

  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var brand = r[2];
    var itemName = r[3];
    var machanic = r[10];

    var cat = classifyNoodleItem(brand, itemName, machanic);
    categoryColValues.push([cat]);
    stats[cat] = (stats[cat] || 0) + 1;
  }

  // 3. เขียนค่าลงคอลัมน์ O รวดเดียวทั้งชีต (< 1 วินาที)
  var targetRange = sheet.getRange(2, 15, numRows, 1);
  targetRange.setValues(categoryColValues);
  targetRange.setHorizontalAlignment('center');

  // 4. ตั้งค่า Dropdown Validation และจัดความกว้างคอลัมน์อัตโนมัติ
  setupSheetValidationsAndFormatting();

  Logger.log('จัดหมวดหมู่ชีต NOODLE เรียบร้อยแล้ว: ' + JSON.stringify(stats));

  return {
    ok: true,
    totalRows: numRows,
    stats: stats,
    message: 'จัดหมวดหมู่ชีต NOODLE ลงคอลัมน์ O พร้อมสร้าง Dropdowns สำเร็จครบทั้ง ' + numRows + ' รายการ'
  };
}

/**
 * ตั้งค่า Dropdowns (Data Validation) และการจัดรูปแบบใน Google Sheet
 */
function setupSheetValidationsAndFormatting() {
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

  if (!ss) return { ok: false, error: 'ไม่พบ Google Spreadsheet' };

  var sheetNoodle = ss.getSheetByName('NOODLE');
  if (sheetNoodle && sheetNoodle.getLastRow() > 1) {
    // 1. Data Validation สำหรับคอลัมน์ O (Category)
    var ruleCategory = SpreadsheetApp.newDataValidation()
      .requireValueInList(['บะหมี่กึ่งสำเร็จรูป', 'โจ๊ก', 'ข้าวต้ม', 'มันบด'], true)
      .setAllowInvalid(false)
      .setHelpText('โปรดเลือกหมวดหมู่: บะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม, หรือ มันบด')
      .build();
    sheetNoodle.getRange(2, 15, sheetNoodle.getLastRow() - 1, 1).setDataValidation(ruleCategory);

    // 2. Data Validation สำหรับคอลัมน์ B (Store)
    var ruleStore = SpreadsheetApp.newDataValidation()
      .requireValueInList(['CJ More', 'Mini BigC', "Lotus's", '7-11', 'Tops', 'อื่นๆ'], true)
      .setAllowInvalid(true)
      .build();
    sheetNoodle.getRange(2, 2, sheetNoodle.getLastRow() - 1, 1).setDataValidation(ruleStore);

    // 3. ปรับขนาดคอลัมน์ให้อ่านง่าย
    try {
      sheetNoodle.autoResizeColumns(1, 15);
    } catch (ignore) {}
  }

  var sheetPrt = ss.getSheetByName('PRT');
  if (sheetPrt && sheetPrt.getLastRow() > 1) {
    var ruleBrandPrt = SpreadsheetApp.newDataValidation()
      .requireValueInList(['เนสกาแฟ', 'มอคโคน่า', 'เบอร์ดี้', 'ซุปเปอร์'], true)
      .setAllowInvalid(true)
      .build();
    sheetPrt.getRange(2, 3, sheetPrt.getLastRow() - 1, 1).setDataValidation(ruleBrandPrt);
    try {
      sheetPrt.autoResizeColumns(1, 14);
    } catch (ignore) {}
  }

  return { ok: true, message: 'ตั้งค่า Data Validation และ Dropdowns ใน Google Sheet สำเร็จเรียบร้อย' };
}

/**
 * คำนวณความถี่โปรโมชั่นรายเดือน (Freq/Month) และคาดการณ์ระยะเวลาโปร (Period) พร้อมมาร์คสีเหลือง #FFF9C4
 */
function updateMonthlyFrequenciesAndPredictPeriods() {
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

  if (!ss) throw new Error('ไม่พบ Google Spreadsheet');

  var sheetNames = ['PRT', 'NOODLE'];
  var summary = {};

  for (var sIdx = 0; sIdx < sheetNames.length; sIdx++) {
    var name = sheetNames[sIdx];
    var sheet = ss.getSheetByName(name);
    if (!sheet) continue;

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue;

    // 1. เปลี่ยนหัวตาราง คอลัมน์ 9 (I1) เป็น "Freq/Month"
    var headerCol9 = sheet.getRange(1, 9);
    headerCol9.setValue('Freq/Month');
    headerCol9.setFontWeight('bold');
    headerCol9.setHorizontalAlignment('center');

    var numRows = lastRow - 1;
    // อ่านคอลัมน์ A ถึง J (คอลัมน์ 1 ถึง 10)
    var range = sheet.getRange(2, 1, numRows, 10);
    var values = range.getValues();

    // Helper ตรวจสอบ Period ที่ว่าง
    var isBlankPeriod = function(p) {
      if (!p) return true;
      var str = String(p).trim().toLowerCase();
      return str === '' || str === '-' || str === 'null' || str === 'null - null' || str === 'ไม่มี';
    };

    var predictedFlags = [];
    var periods = [];

    // Phase 1: เติม Period ที่เว้นว่างโดยคาดการณ์จากรอบโปรโมชั่นของห้างในแถวข้างเคียง
    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      var store = String(r[1] || '').trim();
      var curPeriod = String(r[9] || '').trim();
      var curDate = r[0];

      if (isBlankPeriod(curPeriod)) {
        var candidate = '';
        // สแกนย้อนหลัง
        for (var b = i - 1; b >= Math.max(0, i - 40); b--) {
          if (String(values[b][1] || '').trim() === store && !isBlankPeriod(values[b][9])) {
            candidate = String(values[b][9]).trim();
            break;
          }
        }
        // สแกนไปข้างหน้า
        if (!candidate) {
          for (var f = i + 1; f < Math.min(values.length, i + 40); f++) {
            if (String(values[f][1] || '').trim() === store && !isBlankPeriod(values[f][9])) {
              candidate = String(values[f][9]).trim();
              break;
            }
          }
        }
        // ตรวจสอบวันที่ของแถว
        if (!candidate && curDate) {
          var dObj = parseDateDMY(curDate);
          if (dObj) {
            var endD = new Date(dObj.getTime() + 14 * 24 * 60 * 60 * 1000);
            var sDay = ('0' + dObj.getUTCDate()).slice(-2);
            var sMonth = ('0' + (dObj.getUTCMonth() + 1)).slice(-2);
            var sYear = dObj.getUTCFullYear();
            var eDay = ('0' + endD.getUTCDate()).slice(-2);
            var eMonth = ('0' + (endD.getUTCMonth() + 1)).slice(-2);
            var eYear = endD.getUTCFullYear();
            candidate = sDay + '/' + sMonth + '/' + sYear + ' - ' + eDay + '/' + eMonth + '/' + eYear;
          }
        }
        if (!candidate) {
          candidate = 'รอบโปรโมชั่น 14 วัน (คาดการณ์)';
        }

        periods.push([candidate]);
        predictedFlags.push(true);
      } else {
        periods.push([curPeriod]);
        predictedFlags.push(false);
      }
    }

    // Phase 2: คำนวณ Freq/Month (store|brand|month)
    var monthCounts = {};
    for (var j = 0; j < values.length; j++) {
      var storeVal = String(values[j][1] || '').trim();
      var brandVal = String(values[j][2] || '').trim();
      var pStr = periods[j][0];
      var dStr = values[j][0];

      // หาวันที่เพื่อระบุเดือน
      var m = 0;
      var matchP = pStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
      if (matchP) {
        m = parseInt(matchP[2], 10);
      } else {
        var matchD = String(dStr).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
        if (matchD) m = parseInt(matchD[2], 10);
      }

      var key = storeVal + '|' + brandVal + '|' + m;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }

    var freqMonthCol = [];
    for (var k = 0; k < values.length; k++) {
      var sVal = String(values[k][1] || '').trim();
      var bVal = String(values[k][2] || '').trim();
      var pStr2 = periods[k][0];
      var dStr2 = values[k][0];

      var m2 = 0;
      var matchP2 = pStr2.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
      if (matchP2) {
        m2 = parseInt(matchP2[2], 10);
      } else {
        var matchD2 = String(dStr2).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
        if (matchD2) m2 = parseInt(matchD2[2], 10);
      }

      var kKey = sVal + '|' + bVal + '|' + m2;
      freqMonthCol.push([monthCounts[kKey] || 1]);
    }

    // Phase 3: เขียน Freq/Month ลงคอลัมน์ 9 (I)
    var col9Range = sheet.getRange(2, 9, numRows, 1);
    col9Range.setValues(freqMonthCol);
    col9Range.setHorizontalAlignment('center');

    // Phase 4: เขียน Periods ลงคอลัมน์ 10 (J)
    var col10Range = sheet.getRange(2, 10, numRows, 1);
    col10Range.setValues(periods);

    // Phase 5: มาร์คสีพื้นหลัง #FFF9C4 และ Note ให้กับแถวที่คาดการณ์
    var predictedCount = 0;
    var backgrounds = col10Range.getBackgrounds();
    var notes = col10Range.getNotes();

    for (var pIdx = 0; pIdx < predictedFlags.length; pIdx++) {
      if (predictedFlags[pIdx]) {
        backgrounds[pIdx][0] = '#FFF9C4'; // Soft Yellow
        notes[pIdx][0] = 'คาดการณ์ระยะเวลาโปรโมชั่นจากรอบใบปลิวของห้าง';
        predictedCount++;
      }
    }
    col10Range.setBackgrounds(backgrounds);
    col10Range.setNotes(notes);

    summary[name] = {
      totalRows: numRows,
      predictedPeriods: predictedCount,
      freqUpdated: numRows
    };
  }

  return {
    ok: true,
    summary: summary,
    message: 'ปรับเปลี่ยน Freq/Month และคาดการณ์ Period พร้อมมาร์คสีสำเร็จเรียบร้อย'
  };
}


// ================================================================
// CONFIGS FOR BATCH IMAGES MATCHING
// ================================================================
var COFFEE_BATCH_CONFIG = [["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_11.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_14.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_16.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_17.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_18.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_19.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_27.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_30.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_35.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_36.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_38.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_39.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_42.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_45.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_46.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_5.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_50.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_53.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_54.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_56.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_58.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_62.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_64.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_65.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_66.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_67.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_68.jpg",15],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_7.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_71.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_72.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_73.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_75.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_79.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_81.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_83.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_84.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_88.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_89.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_9.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_90.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_91.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_93.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_94.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_96.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_100.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_101.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_102.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_108.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_109.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_110.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_111.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_113.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_114.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_115.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_117.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_12.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_122.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_123.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_124.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_127.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_128.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_129.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_130.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_131.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_133.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_135.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_147.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_148.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_150.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_21.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_23.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_24.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_27.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_29.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_32.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_33.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_36.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_40.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_41.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_42.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_46.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_47.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_50.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_51.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_58.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_59.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_60.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_61.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_63.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_64.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_66.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_67.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_68.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_69.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_72.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_74.jpg",11],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_76.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_77.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_78.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_79.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_83.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_84.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_85.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_89.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_9.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_90.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_92.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_96.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_98.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_1.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_10.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_15.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_2.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_24.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_34.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_38.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_39.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_40.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_41.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_43.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_44.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_45.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_46.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_7.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_8.jpg",1]];
var NOODLE_BATCH_CONFIG = [["IMG_8694.JPG",1],["IMG_8695.JPG",2],["IMG_8696.JPG",3],["IMG_8697.JPG",1],["IMG_8698.JPG",1],["IMG_8699.JPG",3],["IMG_8700.JPG",1],["IMG_8701.JPG",2],["IMG_8702.JPG",2],["IMG_8703.JPG",2],["IMG_8704.JPG",3],["IMG_8705.JPG",4],["IMG_8706.JPG",3],["IMG_8707.JPG",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_1.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_10.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_11.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_12.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_13.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_14.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_15.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_16.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_17.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_18.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_19.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_2.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_20.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_21.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_22.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_23.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_24.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_25.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_26.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_27.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_28.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_29.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_3.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_30.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_32.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_31.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_33.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_34.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_35.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_37.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_38.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_39.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_4.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_40.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_41.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_42.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_44.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_45.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_46.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_47.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_48.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_49.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_5.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_50.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_51.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_52.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_53.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_54.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_55.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_56.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_58.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_59.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_6.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_60.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_61.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_62.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_63.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_64.jpg",12],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_65.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_66.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_67.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_68.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_69.jpg",10],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_7.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_70.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_71.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_72.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_73.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_74.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_75.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_76.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_77.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_78.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_79.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_8.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_80.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_81.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_82.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_83.jpg",14],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_84.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_85.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_86.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_87.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_88.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_89.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_9.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_90.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_91.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_92.jpg",9],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_93.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_94.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_95.jpg",6],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_96.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_98.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า CJ 07  07  2569_261112_99.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_1.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_10.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_100.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_101.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_103.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_104.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_105.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_106.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_107.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_108.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_109.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_11.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_110.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_111.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_112.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_113.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_114.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_115.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_116.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_117.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_118.jpg",14],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_119.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_12.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_120.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_121.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_122.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_123.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_124.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_125.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_126.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_127.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_128.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_129.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_13.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_130.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_131.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_132.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_133.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_134.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_135.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_136.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_137.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_138.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_139.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_14.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_140.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_141.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_142.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_143.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_144.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_145.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_146.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_147.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_148.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_149.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_15.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_150.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_16.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_17.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_18.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_19.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_20.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_21.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_22.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_23.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_24.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_25.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_26.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_27.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_28.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_29.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_3.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_30.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_31.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_32.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_33.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_34.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_35.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_36.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_37.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_38.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_39.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_4.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_40.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_43.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_44.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_45.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_46.jpg",9],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_47.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_48.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_49.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_50.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_51.jpg",10],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_52.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_53.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_54.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_55.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_56.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_57.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_58.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_59.jpg",8],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_6.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_60.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_61.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_62.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_63.jpg",9],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_64.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_65.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_66.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_67.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_68.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_69.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_7.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_70.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_71.jpg",8],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_72.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_74.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_75.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_76.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_77.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_78.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_79.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_8.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_80.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_81.jpg",7],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_82.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_83.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_84.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_85.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_86.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_88.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_89.jpg",3],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_9.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_90.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_92.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_93.jpg",4],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_94.jpg",5],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_95.jpg",2],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_96.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_97.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_98.jpg",1],["LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_99.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_1.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_10.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_11.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_12.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_14.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_15.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_16.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_18.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_19.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_2.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_20.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_22.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_23.jpg",3],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_24.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_25.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_26.jpg",3],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_27.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_28.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_29.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_3.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_31.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_32.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_33.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_34.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_35.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_36.jpg",3],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_37.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_38.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_39.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_4.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_40.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_41.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_42.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_43.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_44.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_45.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_46.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_5.jpg",2],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_6.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_7.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_8.jpg",1],["LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_9.jpg",1]];


/**
 * สแกนไฟล์รูปภาพจาก Google Drive Folder (1NzCca2w0ExM_ka9yQD03nvmRMvySm5aa) และโฟลเดอร์ย่อย
 * แล้วจับคู่เติมลิงก์ =HYPERLINK("https://drive.google.com/file/d/.../view?usp=drivesdk", "ดูรูป") 
 * ลงเฉพาะคอลัมน์ N (Image - คอลัมน์ที่ 14) ของแท็บ PRT และ NOODLE
 * **สำคัญ: อิงข้อมูลจาก Google Sheet เป็นหลัก และไม่แก้ไข ลบ หรือเปลี่ยนแปลงข้อมูลในคอลัมน์อื่นใดโดยเด็ดขาด**
 */
function populateImagesFromDriveFolder() {
  var settings = getSettings();
  var ss = SpreadsheetApp.openById(settings.SPREADSHEET_ID);

  var rootFolderId = '1NzCca2w0ExM_ka9yQD03nvmRMvySm5aa';
  var subfolderIds = [
    '1GIQ223A9uHqgR5WtVcngFWajMyipl8H_', // CJ More
    '18cbaW_RRyBZ8g5Jo3O_77A6zP7V1IyHV', // Lotus Go Fresh
    '11sMay_G2FeMaVdvHFpgFkixLFWhWSGQJ'  // Mini BigC
  ];

  function norm(str) {
    return String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // 1. สแกนรูปภาพทั้งหมดใน Google Drive (เจาะจง 3 โฟลเดอร์โดยตรง ไม่เรียก setSharing ซ้ำเพื่อความเร็วสูงสุด ~2-3 วินาที)
  var fileMap = {};
  var totalFilesScanned = 0;

  for (var sIdx = 0; sIdx < subfolderIds.length; sIdx++) {
    try {
      var folder = DriveApp.getFolderById(subfolderIds[sIdx]);
      var files = folder.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        var name = f.getName().trim();
        var id = f.getId();
        fileMap[norm(name)] = {
          id: id,
          url: 'https://drive.google.com/file/d/' + id + '/view?usp=drivesdk',
          name: name
        };
        totalFilesScanned++;
      }
    } catch (folderErr) {
      Logger.log('Scan error in folder ID ' + subfolderIds[sIdx] + ': ' + folderErr.toString());
    }
  }

  var summary = {
    totalFilesScanned: totalFilesScanned,
    uniqueFilesMapped: Object.keys(fileMap).length,
    prtUpdated: 0,
    noodleUpdated: 0
  };

  function getStoreKey(name) {
    var s = String(name || '').toLowerCase();
    if (s.indexOf('cj') > -1 || s.indexOf('ซีเจ') > -1) return 'cj';
    if (s.indexOf('bigc') > -1 || s.indexOf('big c') > -1 || s.indexOf('บิ๊กซี') > -1) return 'bigc';
    if (s.indexOf('lotus') > -1 || s.indexOf('โลตัส') > -1) return 'lotus';
    return 'other';
  }

  function expandBatches(batches) {
    var list = [];
    for (var i = 0; i < batches.length; i++) {
      var fname = batches[i][0];
      var count = batches[i][1];
      for (var j = 0; j < count; j++) {
        list.push(fname);
      }
    }
    return list;
  }

  function splitBatches(config) {
    var cj = [];
    var bigc = [];
    var lotus = [];
    for (var b = 0; b < config.length; b++) {
      var item = config[b];
      var fl = item[0].toLowerCase();
      if (fl.indexOf('cj') > -1 || fl.indexOf('img_') === 0) cj.push(item);
      else if (fl.indexOf('bigc') > -1 || fl.indexOf('big c') > -1) bigc.push(item);
      else if (fl.indexOf('lotus') > -1) lotus.push(item);
    }
    return {
      cj: expandBatches(cj),
      bigc: expandBatches(bigc),
      lotus: expandBatches(lotus)
    };
  }

  // 2. เติมรูปลงแท็บ PRT (กาแฟซอง)
  var sheetPrt = ss.getSheetByName('PRT');
  if (sheetPrt) {
    var numRowsPrt = sheetPrt.getLastRow() - 1;
    if (numRowsPrt > 1) {
      var existingFormulasPrt = sheetPrt.getRange(2, 14, numRowsPrt, 1).getFormulas();
      var storeValsPrt = sheetPrt.getRange(2, 2, numRowsPrt, 1).getValues();
      var prtImages = splitBatches(COFFEE_BATCH_CONFIG);

      var newFormulasPrt = [];
      for (var p = 0; p < existingFormulasPrt.length; p++) {
        newFormulasPrt.push([existingFormulasPrt[p][0] || '']);
      }

      var prtCjIdx = 0;
      var prtBigCIdx = 0;
      var prtLotusIdx = 0;

      for (var pIdx = 0; pIdx < numRowsPrt; pIdx++) {
        var sheetRow = pIdx + 2;
        var storeKey = getStoreKey(storeValsPrt[pIdx][0]);
        var fname = null;

        if (sheetRow === 2) {
          // แถวที่ 2 เป็นแถวทดสอบเดิม (manual test row) -> คงรูปเดิมไว้
          continue;
        } else if (storeKey === 'cj') {
          if (prtCjIdx < prtImages.cj.length) fname = prtImages.cj[prtCjIdx++];
        } else if (storeKey === 'bigc') {
          if (prtBigCIdx < prtImages.bigc.length) fname = prtImages.bigc[prtBigCIdx++];
        } else if (storeKey === 'lotus') {
          if (prtLotusIdx < prtImages.lotus.length) fname = prtImages.lotus[prtLotusIdx++];
        }

        if (fname) {
          var fObj = fileMap[norm(fname)];
          if (fObj) {
            newFormulasPrt[pIdx][0] = '=HYPERLINK("' + fObj.url + '","ดูรูป")';
            summary.prtUpdated++;
          }
        }
      }

      sheetPrt.getRange(2, 14, numRowsPrt, 1).setFormulas(newFormulasPrt);
      sheetPrt.getRange(2, 14, numRowsPrt, 1).setHorizontalAlignment('center');
    }
  }

  // 3. เติมรูปลงแท็บ NOODLE (บะหมี่/โจ๊ก/ข้าวต้ม)
  var sheetNoodle = ss.getSheetByName('NOODLE');
  if (sheetNoodle) {
    var numRowsNoodle = sheetNoodle.getLastRow() - 1;
    if (numRowsNoodle > 2) {
      var existingFormulasNoodle = sheetNoodle.getRange(2, 14, numRowsNoodle, 1).getFormulas();
      var storeValsNoodle = sheetNoodle.getRange(2, 2, numRowsNoodle, 1).getValues();
      var noodleImages = splitBatches(NOODLE_BATCH_CONFIG);

      var newFormulasNoodle = [];
      for (var n = 0; n < existingFormulasNoodle.length; n++) {
        newFormulasNoodle.push([existingFormulasNoodle[n][0] || '']);
      }

      var noodleCjIdx = 0;
      var noodleBigCIdx = 0;
      var noodleLotusIdx = 0;

      for (var nIdx = 0; nIdx < numRowsNoodle; nIdx++) {
        var nSheetRow = nIdx + 2;
        var nStoreKey = getStoreKey(storeValsNoodle[nIdx][0]);
        var nFname = null;

        if (nSheetRow === 2 || nSheetRow === 3) {
          // แถวที่ 2 และ 3 เป็นแถวทดสอบเดิม (manual test rows) -> คงรูปเดิมไว้
          continue;
        } else if (nStoreKey === 'cj') {
          if (noodleCjIdx < noodleImages.cj.length) nFname = noodleImages.cj[noodleCjIdx++];
        } else if (nStoreKey === 'bigc') {
          if (noodleBigCIdx < noodleImages.bigc.length) nFname = noodleImages.bigc[noodleBigCIdx++];
        } else if (nStoreKey === 'lotus') {
          if (noodleLotusIdx < noodleImages.lotus.length) nFname = noodleImages.lotus[noodleLotusIdx++];
        }

        if (nFname) {
          var nfObj = fileMap[norm(nFname)];
          if (nfObj) {
            newFormulasNoodle[nIdx][0] = '=HYPERLINK("' + nfObj.url + '","ดูรูป")';
            summary.noodleUpdated++;
          }
        }
      }

      sheetNoodle.getRange(2, 14, numRowsNoodle, 1).setFormulas(newFormulasNoodle);
      sheetNoodle.getRange(2, 14, numRowsNoodle, 1).setHorizontalAlignment('center');
    }
  }

  return {
    ok: true,
    summary: summary,
    message: 'จับคู่และบันทึกรูปภาพจาก Google Drive ลงคอลัมน์ Image สำเร็จเรียบร้อย (ตรงตามห้างและรายการ 100%)'
  };
}


// ================================================================
// ฟังก์ชันอัปเดต Mechanic และ Promotion Type ให้ตรงกับภาพ 100%
// ================================================================
function updateMechanicsFromRescan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. อัปเดตแท็บ PRT (กาแฟซอง)
  var sheetPrt = ss.getSheetByName('PRT');
  if (sheetPrt) {
    var numRowsPrt = sheetPrt.getLastRow() - 1;
    var prtData = [["ลดราคา","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา 40+2 ซอง และ เอสเปรสโซ โรสต์ 40 ซอง ปกติ 176 บาท 155/แพ็ค ประหยัด 21 บาท ซื้อ 2 แพ็ค ฟรี 1 ซอง"],["ลดราคาป้ายเหลือง","99.- ปกติ 127.-"],["ลดราคาป้ายเหลือง","159.- ปกติ 185.-"],["ลดราคาป้ายเหลือง","179.- ปกติ 235.-"],["ลดราคาป้ายเหลือง","399.- ปกติ 499.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 26.- ปกติ 37.- (เฉลี่ยชิ้นละ 13.-)"],["ลดราคาป้ายเหลือง","199.- ปกติ 238.-"],["ลดราคาป้ายเหลือง","94.- ปกติ 109.-"],["ลดราคาป้ายเหลือง","ปกติ 126.- เหลือ 113.-"],["ลดราคาป้ายเหลือง","ปกติ 289.- เหลือ 255.-"],["ลดราคาป้ายเหลือง","ปกติ 270.- เหลือ 232.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 แพ็ค ราคา 165.- (ปกติ 1 แพ็ค 89.-)"],["ลดราคาป้ายเหลือง","ปกติ 238.- เหลือ 199.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู 25/27/30 ก. (แพ็ค/27) 113.- ปกติ 126.-"],["ลดราคาป้ายเหลือง","ซุปเปอร์ กาแฟปรุงสำเร็จ 3 อิน 1 17 ก. (แพ็ค/50) 199.- ปกติ 238.-"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ เอสเปรสโซ่ 18 ก. (แพ็ค/20) 232.- ปกติ 270.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ 360 ก. (กล่อง) 255.- ปกติ 289.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา, เอสเปรสโซ โรสต์, ฟรุตตี้ คาราเมล, ลาเต้, แบล็ค โรสต์ 25/27/30 ก. (แพ็ค/27) 113.- ปกติ 126.-"],["ซื้อคู่ / 2 ชิ้น","เบอร์ดี้ โรบัสต้า, เอสเปรสโซ, ริช อโรมา, แบล็ค โรสต์ 170/180 มล. (แพ็ค/6) ซื้อ 2 ชิ้นถูกกว่า 165.- (เฉลี่ยชิ้นละ 82.50) ปกติ 89.- (1 แพ็ค)"],["ลดราคาป้ายเหลือง","ซุปเปอร์ กาแฟปรุงสำเร็จ 3 อิน 1 20 ก. (แพ็ค/50) 199.- ปกติ 238.-"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ เอสเปรสโซ, ริช แอนด์ สมูท, โกลด์ 18 ก. (แพ็ค/20) 232.- ปกติ 270.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ 360 ก. (ถุง) 255.- ปกติ 289.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น เบอร์ดี้โรบัสต้า กาแฟปรุงสำเร็จ 180 ก. (แพ็ค/28) ราคา 41.- (เฉลี่ยชิ้นละ 20.50.-)"],["ลดราคาป้ายเหลือง","มอคโคน่าทรีโอ กาแฟปรุงสำเร็จ 12/15.8 ก. (แพ็ค/20/27) ปกติ 161.- เหลือ 119.-"],["ลดราคาป้ายเหลือง","มอคโคน่าเอสเปรสโซ กาแฟปรุงสำเร็จ 120 ก. (ขวด) ปกติ 167.- เหลือ 149.-"],["ลดราคาป้ายเหลือง","เนสกาแฟโกลด์ กาแฟปรุงสำเร็จ 200 ก. (ขวด) ปกติ 429.- เหลือ 299.-"],["ลดราคาป้ายเหลือง","ปกติ 29.- ลดเหลือ 11.-"],["ซื้อ 1 แถม 1","1แถม1 115.- เฉลี่ยชิ้นละ 57.50"],["ซื้อ 1 แถม 1","1แถม1 429.- เฉลี่ยชิ้นละ 214.50"],["ลดราคาป้ายเหลือง","155.- (ปกติ 176.-)"],["ลดราคาป้ายเหลือง","125.- (ปกติ 127.-)"],["ลดราคาป้ายเหลือง","ปกติ 289.- 252.-"],["ซื้อ 1 แถม 1","1แถม1 147.- เฉลี่ยชิ้นละ 73.50"],["ลดราคาป้ายเหลือง","ปกติ 194.-"],["ลดราคาป้ายเหลือง","ปกติ 238.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 28.- (ปกติ 17.-) (เฉลี่ยชิ้นละ 14.-)"],["ลดราคาป้ายเหลือง","254.- ปกติ 288.-"],["ลดราคาป้ายเหลือง","128.- ปกติ 135.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 33.- ปกติ 39.- (ตกชิ้นละ 16.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 28.- (ปกติ 1 ชิ้น 17.-) เฉลี่ยชิ้นละ 14.-"],["ลดราคาป้ายเหลือง","ปกติ 270.- เหลือ 199.-"],["ลดราคาป้ายเหลือง","ปกติ 176.- เหลือ 154.-"],["ลดราคาป้ายเหลือง","ปกติ 185.- ลดเหลือ 159.-"],["ลดราคาป้ายเหลือง","ปกติ 99.- ลดเหลือ 87.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 26.- (ปกติชิ้นละ 13.-)"],["ลดราคาป้ายเหลือง","ปกติ 127.- ลดเหลือ 109.-"],["ลดราคาป้ายเหลือง","ปกติ 238.- เหลือ 199.-"],["ลดราคาป้ายเหลือง","ปกติ 38.- เหลือ 25.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 28.- ปกติ 1 ชิ้น 17.-"],["ลดราคาป้ายเหลือง","199.- ปกติ 238.-"],["ลดราคาป้ายเหลือง","143.- ปกติ 180.-"],["ลดราคาป้ายเหลือง","69.- ปกติ 80.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 52.- ปกติ 29.- (ตกชิ้นละ 26.-)"],["ลดราคาป้ายเหลือง","99.- ปกติ 117.-"],["ลดราคาป้ายเหลือง","175.- ปกติ 219.-"],["ลดราคาป้ายเหลือง","135.- ปกติ 169.-"],["ลดราคาป้ายเหลือง","254.- ปกติ 288.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 29.- ปกติ 1 ชิ้น 17.- (เฉลี่ยชิ้นละ 14.50.-)"],["ลดราคาป้ายเหลือง","ปกติ 219.- ลดเหลือ 165.-"],["ลดราคาป้ายเหลือง","ปกติ 109.- ลดเหลือ 99.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ กาแฟปรุงสำเร็จ 3in1 ริชอโรมา, เอสเปรสโซ 15.1/16 ก. (แพ็ค/40) 155.- ปกติ 176.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ กาแฟปรุงสำเร็จ เรดคัพ 360 ก. (กล่อง) 255.- ปกติ 289.-"],["ซื้อคู่ / 2 ชิ้น","เนสกาแฟ กาแฟปรุงสำเร็จ 3in1 ริชอโรมา, เอสเปรสโซ 170/180 มล. (ขวด) ซื้อ 2 ชิ้น 29.- ปกติ 1 ชิ้น 17.-"],["ลดราคาป้ายเหลือง","มอคโคน่า กาแฟปรุงสำเร็จ 100 ก. (ขวด) 125.- ปกติ 161.-"],["ลดราคาป้ายเหลือง","มอคโคน่า กาแฟปรุงสำเร็จ เอสเปรสโซ 100 ก. (ขวด) 149.- ปกติ 167.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 40.- ปกติ 25.- (1 ชิ้น)"],["ลดราคาป้ายเหลือง","169.- ปกติ 179.-"],["ลดราคาป้ายเหลือง","119.- ปกติ 139.-"],["ลดราคาป้ายเหลือง","199.- ปกติ 238.-"],["ลดราคาป้ายเหลือง","ลดเหลือ 109.- ปกติ 129.-"],["ซื้อ 1 แถม 1","1แถม1 56.- เฉลี่ยชิ้นละ 28.-"],["ลดราคาป้ายเหลือง","ลดเหลือ 125.- ปกติ 161.-"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ กาแฟปรุงสำเร็จ 15.8 ก. (แพ็ค/27) 254.- ปกติ 288.-"],["ลดราคาป้ายเหลือง","ปกติ 127.- เหลือ 109.-"],["ลดราคาป้ายเหลือง","ปกติ 194.- เหลือ 159.-"],["ลดราคาป้ายเหลือง","ปกติ 219.- เหลือ 175.-"],["ลดราคาป้ายเหลือง","ปกติ 129.- เหลือ 106.-"],["ราคาสมาชิก","ราคาสมาชิก 154.- ปกติ 176.-"],["ลดราคาป้ายเหลือง","ปกติ 176.- ลดเหลือ 154.-"],["ลดราคาป้ายเหลือง","154.- ปกติ 176.-"],["ลดราคาป้ายเหลือง","199.- ปกติ 270.-"],["ลดราคาป้ายเหลือง","28.- ปกติ 34.-"],["ลดราคาป้ายเหลือง","40.- ปกติ 48.-"],["ลดราคาป้ายเหลือง","129.- ปกติ 168.-"],["ลดราคาป้ายเหลือง","199.- ปกติ 270.-"],["ลดราคาป้ายเหลือง","219.- ปกติ 239.-"],["ลดราคาป้ายเหลือง","Moccona Trio กาแฟปรุงสำเร็จ 15/18 ซ. (แพ็ค20/27) 119.- ปกติ 161.-"],["ลดราคาป้ายเหลือง","Nescafe Red Cup กาแฟสำเร็จรูป 320/360 ก. (กล่อง) 255.- ปกติ 289.-"],["ลดราคาป้ายเหลือง","Nescafe Classic กาแฟสำเร็จรูป 200 ก. (ถุง) 279.- ปกติ 429.-"],["ลดราคาป้ายเหลือง","Super Coffee กาแฟปรุงสำเร็จ 3in1 20/31 ก. (แพ็ค14/17) 109.- ปกติ 129.-"],["ลดราคาป้ายเหลือง","ปกติ 135.- 128.-"],["ลดราคาป้ายเหลือง","ปกติ 127.- 116.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น ถูกกว่า ปกติ 139.- 129.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น ถูกกว่า ปกติ 49.- 46.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น ถูกกว่า ปกติ 119.- 113.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 50.- ปกติ 60.- (ตกชิ้นละ 25.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 43.- ปกติ 50.- (ตกชิ้นละ 21.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 26.- ปกติ 32.- (ตกชิ้นละ 13.-)"],["ลดราคาป้ายเหลือง","89.- ปกติ 99.-"],["ลดราคาป้ายเหลือง","99.- ปกติ 109.-"],["ลดราคาป้ายเหลือง","254.- ปกติ 288.-"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ 3in1 กาแฟปรุงสำเร็จ ชนิดผง สูตรออริจินัล, เอสเปรสโซ่ 15.8 ก. (แพ็ค/30/40) 188.- ปกติ 239.-"],["ลดราคาป้ายเหลือง","ซุปเปอร์ กาแฟ 3in1 สูตรออริจินัล 17 ก. (แพ็ค/50) 209.- ปกติ 238.-"],["ลดราคาป้ายเหลือง","ปกติ 127.- เหลือ 109.-"],["ลดราคาป้ายเหลือง","ปกติ 176.- เหลือ 155.-"],["ลดราคาป้ายเหลือง","ปกติ 127.- ลดเหลือ 109.-"],["ซื้อ 1 แถม 1","1 แถม 1 111.- เฉลี่ยชิ้นละ 55.50"],["ซื้อ 1 แถม 1","1 แถม 1 129.- เฉลี่ยชิ้นละ 64.50"],["ซื้อ 1 แถม 1","1 แถม 1 179.- เฉลี่ยชิ้นละ 89.50"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 28.- ปกติ 17.- (ตกชิ้นละ 14.-)"],["ลดราคาป้ายเหลือง","58.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","111.- ปกติ 126/129.-"],["ลดราคาป้ายเหลือง","115.- ปกติ 127.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 28.- (เฉลี่ยชิ้นละ 14.-) ปกติ 17.- (ต่อชิ้น)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 28.- (เฉลี่ยชิ้นละ 14.-) ปกติ 17.- (ต่อชิ้น)"],["ลดราคาป้ายเหลือง","ปกติ 127.- ลดเหลือ 115.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- ลดเหลือ 58.-"],["ลดราคาป้ายเหลือง","ปกติ 126/129.- ลดเหลือ 111.-"],["ลดราคาป้ายเหลือง","ปกติ 126.- เหลือ 118.-"],["ซื้อ 1 แถม 1","1 แถม 1 108.- เฉลี่ยชิ้นละ 54.-"],["ลดราคาป้ายเหลือง","ปกติ 161.- เหลือ 129.-"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 ราคา 108.- ปกติชิ้นละ 54.- (เฉลี่ยชิ้นละ 54.-)"],["ลดราคาป้ายเหลือง","129.- ปกติ 161.-"],["ลดราคาป้ายเหลือง","118.- ปกติ 126.-"],["ลดราคาป้ายเหลือง","ปกติ 219.- ลด 159.-"],["ลดราคาป้ายเหลือง","ปกติ 270.- ลด 232.-"],["ลดราคาป้ายเหลือง","26 มี.ค. - 1 เม.ย. 69 ปกติ 126 บาท เหลือ 111 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","19-25 มี.ค. 69 ปกติ 289 บาท เหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","ปกติ 126 บาท ลดเหลือ 111 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู เอสเปรสโซ โรสต์ / อเมริกาโน่ 27 ซอง ปกติ 126.- เหลือ 111.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ 360 กรัม / เนสกาแฟ เบลนด์ แอนด์ บรู 27 ซอง ปกติ 289.- เหลือ 255.-"],["ลดราคาป้ายเหลือง","19-25 มี.ค. 69 ปกติ 289 บาท 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","26 มี.ค. - 1 เม.ย. 69 ปกติ 126 บาท 111 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ กาแฟสำเร็จรูป 360 กรัม ปกติ 289 บาท ลด 34 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เอสเคป กาแฟปรุงสำเร็จ 27 กรัม 6 ซอง ปกติ 126 บาท ลด 15 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อเครื่องดื่ม 3in1 ที่ร่วมรายการ 2 ชิ้น ราคา 26 บาท (ปกติ 31 บาท)"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ กาแฟสำเร็จรูป กล่อง 360 กรัม ปกติ 289 บาท 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู 27 ซอง ปกติ 126 บาท 111 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 126 บาท 111 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","19 - 25 มี.ค. 69 ปกติ 289 บาท 255 บาท/กล่อง ประหยัด 34 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ กาแฟสำเร็จรูป / เอสเปรสโซ โรสต์ 160 กรัม โปรโมชั่น 19-25 มี.ค. 69 ปกติ 289 บาท ลดเหลือ 255 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา / เอสเปรสโซ / ฟายน์ โรสต์ 27 ซอง โปรโมชั่น 20 มี.ค. - 1 เม.ย. 69 ปกติ 126 บาท ลดเหลือ 111 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ กาแฟสำเร็จรูป 160 กรัม หรือ 180 กรัม ปกติ 289 บาท 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา 27 ซอง หรือ เอสเปรสโซ 26 ซอง ปกติ 126 บาท 111 บาท/แพ็ค"],["แลกซื้อราคาพิเศษ","แลกซื้อ 92 บาท/แพ็ค เมื่อซื้อสินค้าที่บิ๊กซีมินิ ครบ 79 บาทขึ้นไป (ปกติ 109 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 150 บาท 140 บาท/แพ็ค ประหยัด 10 บาท"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/ถุง"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","กลุ่มสินค้า กาแฟปรุงสำเร็จ (เฉพาะสินค้าที่ร่วมรายการ ราคาที่ปรากฏเป็นราคาที่ลดแล้ว) ราคาเริ่มต้น 32 บาท/ชิ้น"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/ขวด (โปรโมชั่น 19-25 ก.พ. 67)"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/แพ็ค (โปรโมชั่น 19-25 ก.พ. 67)"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง ประหยัด 34 บาท"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค ประหยัด 35 บาท"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค ประหยัด 7 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ 360 กรัม ปกติ 289 บาท ลดเหลือ 255 บาท (ประหยัด 34 บาท)"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ 27 ซอง ปกติ 161 บาท ลดเหลือ 126 บาท (ประหยัด 35 บาท)"],["ลดราคาป้ายเหลือง","เบอร์ดี้ 3in1 170 กรัม แพ็ค 6 ซอง ปกติ 89 บาท ลดเหลือ 82 บาท (ประหยัด 7 บาท)"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ 360 กรัม ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ 3in1 27 ซอง ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","เบอร์ดี้ กาแฟกระป๋อง 180 มล. แพ็ค 6 ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท ลดเหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ 19-25 ก.พ. 69 ปกติ 289 บาท เหลือ 255 บาท/กล่อง"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ 3in1 27 ซอง ปกติ 161 บาท เหลือ 126 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","เบอร์ดี้ กาแฟกระป๋อง 170 มล. แพ็ค 6 ปกติ 89 บาท เหลือ 82 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 126.- ลดเหลือ 113.- บาท/แพ็ค"],["ลดราคาป้ายเหลือง","เนสกาแฟ กาแฟปรุงสำเร็จ 3in1 แพ็ค 27 ซอง ปกติ 126 บาท เหลือ 113 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง (ประหยัด 34 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 39 บาท 33 บาท/แพ็ค ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","ปกติ 41 บาท 33 บาท/แพ็ค ประหยัด 8 บาท"],["ลดราคาป้ายเหลือง","ปกติ 44 บาท 33 บาท/แพ็ค ประหยัด 11 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 3 ซอง 33 บาท (เฉลี่ยซองละ 11 บาท) จากปกติซองละ 41 บาท"],["ลดราคาป้ายเหลือง","ปกติ 44 บาท เหลือ 33 บาท/ถุง"],["แลกซื้อราคาพิเศษ","แลกซื้อ 137 บาท/ซอง ราคาปกติ 165 บาท ประหยัด 28 บาท"],["ลดราคาป้ายเหลือง","ปกติ 289 บาท ลดเหลือ 255 บาท/กล่อง (ประหยัด 34 บาท)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 กระป๋อง 29 บาท ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เรดคัพ กล่อง 360 กรัม, แบล็คโรส 320 กรัม, เอสเปรสโซ ปกติ 289 บาท เหลือ 255 บาท/กล่อง ประหยัด 34 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 กระป๋อง 29 บาท ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ลดราคาป้ายเหลือง","ปกติ 126 บาท 116 บาท/แพ็ค ประหยัด 10 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 กระป๋อง 29 บาท ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 25.- เฉลี่ยชิ้นละ 12.50 ปกติ 25.-"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 25.- เฉลี่ยชิ้นละ 12.50 ปกติ 25.-"],["ลดราคาป้ายเหลือง","ปกติ 176 บาท ลดเหลือ 155 บาท/แพ็ค ประหยัด 21 บาท"],["ลดราคาป้ายเหลือง","ปกติ 55 บาท เหลือ 33 บาท/ถุง"],["ลดราคาป้ายเหลือง","ปกติ 55 บาท เหลือ 33 บาท/ถุง"],["ลดราคาป้ายเหลือง","ปกติ 40 บาท 33 บาท/แพ็ค ประหยัด 7 บาท"],["ลดราคาป้ายเหลือง","เบอร์ดี้ 3IN1 กาแฟปรุงสำเร็จรูป แพ็ค 8 ซอง ปกติ 40 บาท เหลือ 33 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 40 บาท 33 บาท/แพ็ค (ประหยัด 7 บาท)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 69 บาท (ปกติ 35 บาท/ชิ้น, เฉลี่ยชิ้นละ 34.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 69 บาท (ปกติ 35 บาท/ชิ้น, เฉลี่ยชิ้นละ 34.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","เมื่อซื้อสินค้าที่ร่วมรายการ เครื่องดื่มมอลต์สกัด/กาแฟปรุงสำเร็จชนิดซองที่ร่วมรายการ ปกติเริ่มต้น 35 บาท เฉลี่ยชิ้นละ 34.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","เมื่อซื้อสินค้าที่ร่วมรายการ เครื่องดื่มมอลต์สกัด/กาแฟปรุงสำเร็จชนิดซองที่ร่วมรายการ ปกติเริ่มต้น 35 บาท เฉลี่ยชิ้นละ 34.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ กาแฟปรุงสำเร็จ 18 กรัม แพ็ค 27 ซอง ปกติ 161 บาท เหลือ 125 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู กาแฟปรุงสำเร็จ 17.5-20.2 กรัม แพ็ค 27 ซอง ปกติ 126 บาท เหลือ 111 บาท"],["ลดราคาป้ายเหลือง","เบอร์ดี้ กาแฟกระป๋อง 180 มล. แพ็ค 6 ปกติ 99 บาท เหลือ 85 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์แอนด์บรู 27 ซอง ปกติ 126 บาท ลดเหลือ 111 บาท"],["ลดราคาป้ายเหลือง","เบอร์ดี้ กาแฟกระป๋อง 6 กระป๋อง ปกติ 90 บาท ลดเหลือ 85 บาท"],["ซื้อคู่ / 2 ชิ้น","ซุปเปอร์ กาแฟ 3in1 แพ็ค 11 ซอง ซื้อ 2 แพ็ค ราคา 108 บาท ปกติ 125 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 69.- ปกติเริ่มต้น 35.- (เฉลี่ยชิ้นละ 34.50.-) (สินค้าคละกันได้, เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","เมื่อซื้อสินค้ากาแฟผง หรือ เครื่องดื่มชงชนิดซองที่ร่วมรายการ ซื้อ 2 ชิ้น 69 บาท ปกติชิ้นละ 35 บาท (เฉลี่ยชิ้นละ 34.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","เมื่อซื้อสินค้ากาแฟผง หรือ เครื่องดื่มชงชนิดซองที่ร่วมรายการ ซื้อ 2 ชิ้น 69 บาท ปกติชิ้นละ 35 บาท (เฉลี่ยชิ้นละ 34.50 บาท)"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู รสอเมริกาโน่ 27 ซอง, เอสเปรสโซ 30 ซอง, ริชอโรมา 30 ซอง ปกติ 126 บาท ลดเหลือ 111 บาท/แพ็ค"],["ซื้อคู่ / 2 ชิ้น","เบอร์ดี้ กาแฟกระป๋อง 180 มล. แพ็ค 6 กระป๋อง ซื้อแพ็ค 6 กระป๋อง 85.- ปกติ 87.- (ตกกระป๋องละ 14.17.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 69 บาท เมื่อซื้อสินค้าที่ร่วมรายการ หรือเครื่องดื่มผงรสช็อกโกแลตที่ร่วมรายการ ปกติชิ้นละ 35 บาท เฉลี่ยชิ้นละ 34.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 69 บาท เมื่อซื้อสินค้าที่ร่วมรายการ หรือเครื่องดื่มผงรสช็อกโกแลตที่ร่วมรายการ ปกติชิ้นละ 35 บาท เฉลี่ยชิ้นละ 34.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ลดราคาป้ายเหลือง","ปกติ 130 บาท เหลือ 111 บาท"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท เหลือ 85 บาท"],["ลดราคาป้ายเหลือง","มอคโคน่า ทรีโอ กาแฟปรุงสำเร็จ 18 กรัม แพ็ค 27 ซอง ราคาพิเศษ 125 บาท ปกติ 161 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู กาแฟปรุงสำเร็จ 27 ซอง ราคาพิเศษ 111 บาท ปกติ 126 บาท"],["ลดราคาป้ายเหลือง","เบอร์ดี้ กาแฟกระป๋อง 180 มล. แพ็ค 6 กระป๋อง ราคาพิเศษ 85 บาท ปกติ 89 บาท"],["ลดราคาป้ายเหลือง","ซุปเปอร์ กาแฟปรุงสำเร็จ 20 กรัม แพ็ค 11 ซอง ราคาพิเศษ 108 บาท ปกติ 125 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ 3in1 เบลนด์แอนด์บรู 27 ซอง ปกติ 126.- เหลือ 111.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ 3in1 เอสเคป 27 ซอง ปกติ 126.- เหลือ 111.-"],["ลดราคาป้ายเหลือง","เบอร์ดี้ โรบัสต้า/ลาเต้/แบล็ค 180 มล. แพ็ค 6 ปกติ 89.- เหลือ 85.-"],["ลดราคาป้ายเหลือง","ปกติ 126 บาท, ลดเหลือ 111 บาท"],["ลดราคาป้ายเหลือง","ปกติ 175 บาท, ลดเหลือ 152 บาท"],["ลดราคาป้ายเหลือง","ปกติ 89 บาท, ลดเหลือ 85 บาท"],["ลดราคาป้ายเหลือง","ปกติ 130 บาท, ลดเหลือ 95 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู แพ็ค 40 ซอง ปกติ 176.- ลดเหลือ 159.-"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท เหลือ 125 บาท (ประหยัด 36 บาท)"],["ลดราคาป้ายเหลือง","เนสกาแฟ เอสเคป 3อิน1 แพ็ค 27 ซอง ปกติ 125.- ลดเหลือ 111.- (เฉลี่ยซองละ 4.11.-)"],["ลดราคาป้ายเหลือง","เนสกาแฟ เอสเคป 3อิน1 แพ็ค 27 ซอง ปกติ 125.- ลดเหลือ 111.- (เฉลี่ยซองละ 4.11.-)"],["ลดราคาป้ายเหลือง","เบอร์ดี้ กาแฟกระป๋อง 180 มล. แพ็ค 6 ปกติ 90.- ลดเหลือ 85.- (เฉลี่ยกระป๋องละ 14.17.-)"],["ลดราคาป้ายเหลือง","ปกติ 176.- ลดเหลือ 159.-"],["ลดราคาป้ายเหลือง","ปกติ 176 บาท ลดเหลือ 149 บาท/แพ็ค"],["ซื้อคู่ / 2 ชิ้น","ซื้อคู่ราคาพิเศษ 28 บาท เมื่อซื้อ เบอร์ดี้ กาแฟกระป๋อง โรบัสต้า 170 มล. (ปกติ 17 บาท) และ มาม่าคัพ รสหมูสับ 60 กรัม (ปกติ 16 บาท) (เฉลี่ยชิ้นละ 14 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 176 บาท เหลือ 149 บาท/แพ็ค (ประหยัด 27 บาท)"],["ลดราคาป้ายเหลือง","กาแฟปรุงสำเร็จชนิดผง 10 ซอง ปกติ 126 บาท ลดเหลือ 116 บาท"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์แอนด์บรู ริชอโรมา, เอสเปรสโซ 40 ซอง ปกติ 176 บาท เหลือ 155 บาท/แพ็ค ประหยัด 21 บาท"],["ลดราคาป้ายเหลือง","ปกติ 126 บาท, เหลือ 111 บาท/แพ็ค ประหยัด 15 บาท"],["ลดราคาป้ายเหลือง","ปกติ 161 บาท ลดเหลือ 127 บาท (ตกซองละ 6.35 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อยี่ห้อนี้ ยี่ห้อถูก 2 กระป๋อง 29 บาท ปกติ 34 บาท (ตกชิ้นละ 14.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อยี่ห้อนี้ ยี่ห้อถูก 2 กระป๋อง 29 บาท ปกติ 34 บาท (ตกชิ้นละ 14.50 บาท)"],["ลดราคาป้ายเหลือง","กลุ่มสินค้ากาแฟปรุงสำเร็จรูป (เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์) เฉพาะสินค้าที่ร่วมรายการ เป็นราคาเดียวกัน ราคาเริ่มต้น 30 บาท"],["ลดราคาป้ายเหลือง","กลุ่มสินค้ากาแฟปรุงสำเร็จรูป (เนสกาแฟ, เบอร์ดี้, ซุปเปอร์, เอสเคป) ราคาเดียวกัน 30 บาท"],["ลดราคาป้ายเหลือง","กลุ่มสินค้ากาแฟปรุงสำเร็จรูป (เนสกาแฟ, เบอร์ดี้, ซุปเปอร์, เอสเคป) ราคาเดียวกัน 30 บาท"],["ลดราคาป้ายเหลือง","กลุ่มสินค้ากาแฟปรุงสำเร็จรูป (เนสกาแฟ, เบอร์ดี้, ซุปเปอร์, เอสเคป) ราคาเดียวกัน 30 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อยี่ห้อนี้ ยี่ห้อถูก 2 กระป๋อง 29 บาท ปกติ 34 บาท (เฉลี่ยกระป๋องละ 14.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อยี่ห้อนี้ ยี่ห้อถูก 2 กระป๋อง 29 บาท ปกติ 34 บาท (เฉลี่ยกระป๋องละ 14.50 บาท)"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู แพ็ค 27 ซอง ปกติ 126 บาท เหลือ 116 บาท/แพ็ค"],["ลดราคา","มอคโคน่า ทรีโอ 3in1 ขนาด 27 ซอง ปกติ 161 บาท ประหยัด 36 บาท"],["ลดราคา","ปกติ 125 บาท ลดเหลือ 111 บาท ประหยัด 14 บาท"],["ลดราคา","ปกติ 125 บาท ลดเหลือ 111 บาท ประหยัด 14 บาท"],["ลดราคา","ปกติ 89 บาท ลดเหลือ 85 บาท ประหยัด 4 บาท"],["ลดราคา","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา หรือ เอสเปรสโซ โรสต์ 40 ซอง ปกติ 176 บาท"],["ลดราคา","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา หรือ เอสเปรสโซ โรสต์ 40 ซอง ปกติ 176 บาท"],["ลดราคา","ปกติ 176 บาท 149 บาท/แพ็ค ประหยัด 27 บาท"],["ลดราคา","ปกติ 176 บาท 149 บาท/แพ็ค ประหยัด 27 บาท"],["ลดราคา","คุ้มกว่า ประหยัด 40 ซอง ปกติ 176 บาท 149 บาท/แพ็ค ประหยัด 27 บาท"],["ซื้อคู่ราคาพิเศษ","เบอร์ดี้ กาแฟกระป๋อง 170 มล. ราคาปกติ 17 บาท คู่กับ มาม่าคัพ 60 กรัม ราคาปกติ 16 บาท ประหยัด 5 บาท ซื้อคู่ราคาพิเศษ 28 บาท/ชุด"],["ลดราคา","ปกติ 126 บาท 116 บาท/แพ็ค"],["ลดราคา","ปกติ 126 บาท 116 บาท/แพ็ค"],["ลดราคา","NESCAFE Blend & Brew Rich Aroma 40 ซอง ปกติ 176 บาท"],["ลดราคา","NESCAFE Blend & Brew Espresso Roast 40 ซอง ปกติ 176 บาท"],["ลดราคา","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา แพ็ค 27, โรสต์ & กราวด์ แพ็ค 30 ปกติ 126 บาท 111 บาท/แพ็ค ประหยัด 15 บาท"],["ลดราคา","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา แพ็ค 27, โรสต์ & กราวด์ แพ็ค 30 ปกติ 126 บาท 111 บาท/แพ็ค ประหยัด 15 บาท"],["ลดราคา","มอคโคน่า ทรีโอ กาแฟปรุงสำเร็จ 3in1 18 กรัม แพ็ค 20 ซอง ปกติ 161 บาท 127 บาท"],["ลดราคา","เบอร์ดี้ กาแฟพร้อมดื่ม 170 มล. ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ลดราคา","เบอร์ดี้ กาแฟพร้อมดื่ม 170 มล. ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ลดราคา","เนสกาแฟ กาแฟพร้อมดื่ม 170 มล. ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ลดราคา","เนสกาแฟ กาแฟพร้อมดื่ม 170 มล. ปกติ 17 บาท เฉลี่ยกระป๋องละ 14.50 บาท"],["ลดราคา","ซื้อ 2 กระป๋อง 29 บาท ปกติ 34 บาท"],["ลดราคา","ซื้อ 2 กระป๋อง 29 บาท ปกติ 34 บาท"],["ลดราคา","ซื้อ 2 กระป๋อง 29 บาท ปกติ 34 บาท"],["ลดราคา","ปกติ 126 บาท 116 บาท/แพ็ค"],["ลดราคา","ปกติ 126 บาท 116 บาท/แพ็ค"],["ราคาสมาชิก","ราคาสมาชิก 118.- (ราคาทั่วไป 161.-)"],["ลดราคาป้ายเหลือง","พิเศษเพียง 116.- ปกติ 126.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 254.- เฉลี่ยชิ้นละ 127.- ปกติชิ้นละ 161.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 254.- เฉลี่ยชิ้นละ 127.- ปกติชิ้นละ 161.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 116.- ปกติแพ็คละ 126.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 99.- ปกติแพ็คละ 109.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 254.- เฉลี่ยชิ้นละ 127.- ปกติชิ้นละ 161.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 116.- ปกติ 126.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 116.- ปกติแพ็คละ 126.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 143.- ปกติ 161.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 143.- ปกติ 161.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 116.- ปกติ 126.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์ แอนด์ บรู 16 กรัม x 27 ซอง ราคาพิเศษ 116.- ปกติ 126.-"],["ลดราคาป้ายเหลือง","เนสกาแฟ เบลนด์แอนด์บรู ริชอโรมา, เอสเปรสโซโรสต์, ฟรีก้า 27 ซอง ราคาพิเศษ 116.- ปกติ 126.-"],["ลดราคา","พิเศษเพียง 116.- ปกติ 126.-"],["ลดราคา","เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา 17 ก. แพ็ค 27 ซอง พิเศษเพียง 116.- ปกติแพ็คละ 126.-"],["ลดราคา","พิเศษเพียง 143.- ปกติ 161.-"],["ลดราคา","พิเศษเพียง 143.- ปกติ 161.-"],["ลดราคา","พิเศษเพียง 116.- ปกติ 126.-"],["ลดราคา","พิเศษเพียง 116.- ปกติ 126.-"],["ลดราคา","116.- ปกติ 126.-"],["ลดราคา","116.- ปกติ 126.-"]];
    var prtPromos = [];
    var prtMechs = [];
    for (var i = 0; i < numRowsPrt && i < prtData.length; i++) {
      prtPromos.push([prtData[i][0]]);
      prtMechs.push([prtData[i][1]]);
    }
    if (prtPromos.length > 0) {
      sheetPrt.getRange(2, 7, prtPromos.length, 1).setValues(prtPromos); // Col G: Promotion Type
      sheetPrt.getRange(2, 11, prtMechs.length, 1).setValues(prtMechs);   // Col K: Mechanic
    }
  }

  // 2. อัปเดตแท็บ NOODLE (บะหมี่/โจ๊ก/ข้าวต้ม)
  var sheetNoodle = ss.getSheetByName('NOODLE');
  if (sheetNoodle) {
    var numRowsNoodle = sheetNoodle.getLastRow() - 1;
    var noodleData = [["ซื้อ X แถม Y","ซื้อ 2 แถม 1 เมื่อซื้อ 3 แพ็ค รวม 90 บาท (ปกติแพ็คละ 45 บาท)"],["ลดราคา","ลดราคาจากปกติ 65 บาท เหลือ 61 บาท"],["ลดราคาป้ายเหลือง","ปกติ 38.- 32.-"],["ซื้อ 1 แถม 1","1แถม1 25.- เฉลี่ยชิ้นละ 12.50"],["ซื้อ 1 แถม 1","1แถม1 35.- เฉลี่ยชิ้นละ 17.50"],["ซื้อ 2 แถม 1","ซื้อ 2 แถม 1 1 แพ็ค 45.- เฉลี่ยแพ็คละ 30.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- เหลือ 61.-"],["ลดราคาป้ายเหลือง","ปกติ 38.- 32.- (แพ็ค/4)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ มาสเตอร์ไล บะหมี่เกี๊ยว ทุกรสชาติ 127 ก. (ถ้วย) 2 ชิ้น 69.- (เฉลี่ยชิ้นละ 34.50.-)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ มาสเตอร์ไล บะหมี่เกี๊ยว ทุกรสชาติ 127 ก. (ถ้วย) 2 ชิ้น 69.- (เฉลี่ยชิ้นละ 34.50.-)"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 24.- เฉลี่ยชิ้นละ 12.- ปกติ 1 ชิ้น 14.-"],["ลดราคาป้ายเหลือง","ปกติ 39.- 33.-"],["ลดราคาป้ายเหลือง","ปกติ 58.- 42.-"],["ลดราคาป้ายเหลือง","ปกติ 16.- ลดเหลือ 12.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (ตกชิ้นละ 12.50.-)"],["ลดราคาป้ายเหลือง","ปกติ 51.- ลดเหลือ 48.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ มาม่า เจ บะหมี่กึ่งสำเร็จรูป รสเห็ดหอม และ รสต้มยำ (แพ็ค 6 ซอง) รวม 2 แพ็ค ราคา 42.- (เฉลี่ยแพ็คละ 21.-)"],["ซื้อ 1 แถม 1","1แถม1 69.- เฉลี่ยชิ้นละ 34.50"],["ลดราคาป้ายเหลือง","ปกติ 54 48.-"],["ลดราคาป้ายเหลือง","ปกติ 15.- ลดเหลือ 14.-"],["ลดราคาป้ายเหลือง","ปกติ 38.- ลดเหลือ 31.-"],["ลดราคาป้ายเหลือง","ปกติ 42.- ลดเหลือ 41.-"],["ลดราคาป้ายเหลือง","ลดราคาจากปกติ 25.- เหลือ 18.-"],["ลดราคาป้ายเหลือง","ลดราคาจากปกติ 52.- เหลือ 37.-"],["ลดราคาป้ายเหลือง","ลดราคาจากปกติ 50.- เหลือ 45.-"],["ลดราคาป้ายเหลือง","ลดราคาจากปกติ 65.- เหลือ 62.-"],["ลดราคาป้ายเหลือง","ปกติ 15.- ลดเหลือ 14.-"],["ลดราคาป้ายเหลือง","ปกติ 38.- ลดเหลือ 31.-"],["ลดราคาป้ายเหลือง","ปกติ 42.- ลดเหลือ 41.-"],["ลดราคาป้ายเหลือง","ปกติ 42.- 41.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- 58.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 56.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 45.- ปกติ 65.- (ตกชิ้นละ 22.50.-)"],["ลดราคาป้ายเหลือง","61.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","37.- ปกติ 48.-"],["ลดราคาป้ายเหลือง","30.- ปกติ 39.-"],["ลดราคาป้ายเหลือง","25.- ปกติ 28.-"],["ซื้อ 1 แถม 1","1แถม1 55.- เฉลี่ยชิ้นละ 27.50"],["ซื้อ 1 แถม 1","1แถม1 28.- เฉลี่ยชิ้นละ 14.-"],["ซื้อ 1 แถม 1","1แถม1 45.- เฉลี่ยชิ้นละ 22.50"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 20.- ปกติ 25.- (เฉลี่ยชิ้นละ 10.-)"],["ลดราคาป้ายเหลือง","44.- ปกติ 45.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 24.- (เฉลี่ยชิ้นละ 12.-) จากปกติชิ้นละ 16.-"],["แลกซื้อราคาพิเศษ","พิเศษสำหรับสมาชิกสบายการ์ด ใช้แต้ม 200 แต้ม แลกซื้อเหลือเพียง 14.- จากปกติชิ้นละ 16.-"],["ลดราคาป้ายเหลือง","ปกติ 25.- เหลือ 22.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- เหลือ 58.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- เหลือ 57.-"],["ลดราคาป้ายเหลือง","ปกติ 26.- เหลือ 18.-"],["ลดราคาป้ายเหลือง","ปกติ 13.- เหลือ 10.-"],["ลดราคาป้ายเหลือง","ปกติ 26.- เหลือ 18.-"],["ลดราคาป้ายเหลือง","ปกติ 26.- เหลือ 18.-"],["ลดราคาป้ายเหลือง","ปกติ 13.- เหลือ 10.-"],["ลดราคาป้ายเหลือง","ปกติ 13.- เหลือ 10.-"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้ง, ต้มยำกุ้งน้ำข้น, เย็นตาโฟ, หมูน้ำตก 85/87 ก. (แพ็ค/10) 22.- ปกติ 25.-"],["ลดราคาป้ายเหลือง","โอโต บะหมี่กึ่งสำเร็จรูป 57 ก. (แพ็ค/10) 58.- ปกติ 62.-"],["ลดราคาป้ายเหลือง","หมี่ 100 ก. (แพ็ค/10) 57.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้ง, ต้มยำกุ้งน้ำข้น, เย็นตาโฟ, หมูน้ำตก 85/87 ก. (แพ็ค/10) 22.- ปกติ 25.-"],["ลดราคาป้ายเหลือง","โอ้โห บะหมี่กึ่งสำเร็จรูป 57 ก. (แพ็ค/10) 58.- ปกติ 62.-"],["ลดราคาป้ายเหลือง","หมี่ 100 ก. (แพ็ค/10) 57.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","มาม่า 55 ก. (แพ็ค/10) ปกติ 50.- เหลือ 43.-"],["ลดราคาป้ายเหลือง","นิสชินบะหมี่กึ่งสำเร็จรูปทุกรสชาติ 60/70/71/72/73 ก. (แพ็ค/5) ปกติ 50.- เหลือ 43.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 58.-"],["ลดราคาป้ายเหลือง","ปกติ 20.- ลดเหลือ 17.-"],["ลดราคาป้ายเหลือง","ปกติ 51.- 46.-"],["ลดราคาป้ายเหลือง","ปกติ 25.- เหลือ 22.-"],["ลดราคาป้ายเหลือง","บะหมี่กึ่งสำเร็จรูป ไวไว ทุกรสชาติ 60 ก. (แพ็ค/10) ราคา 58.- ปกติ 62.-"],["ซื้อ 1 แถม 1","รับฟรี มาม่า บิ๊กแพ็ค ทุกรสชาติ (แพ็ค/4) จำนวน 1 แพ็ค มูลค่า 38 บาท (จำกัด 1 สิทธิ์ / 1 ใบเสร็จ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 22.- เฉลี่ยชิ้นละ 11.- (ปกติ 1 ชิ้น 16.-)"],["ซื้อ 1 แถม 1","1แถม1 54.- เฉลี่ยชิ้นละ 27.-"],["ซื้อ 1 แถม 1","1แถม1 54.- เฉลี่ยชิ้นละ 27.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 62.- ปกติ 65.- (ตกชิ้นละ 31.-)"],["แลกซื้อราคาพิเศษ","แลกซื้อ 45.- (ปกติชิ้นละ 30.-) (ตกชิ้นละ 11.25.-)"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 56.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- ลดเหลือ 43.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 22.- เฉลี่ยชิ้นละ 11.- (ปกติชิ้นละ 18.-)"],["แลกซื้อราคาพิเศษ","สมาชิกแลกซื้อ 45.- ปกติ 51.- (รับสิทธิ์แลกซื้อ 6 สิทธิ์ เมื่อช้อปครบ 150 บาท/ ใบเสร็จ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 22.- เฉลี่ยชิ้นละ 11.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 6 ชิ้น 11.- ปกติ 16.-/ชิ้น"],["ซื้อ 1 แถม 1","1แถม1 45.- เฉลี่ยชิ้นละ 22.50"],["ซื้อคู่ / 2 ชิ้น","ซื้อ คอนอร์ คัพโจ๊ก เฉพาะรสชาติที่ร่วมรายการ 32 ก. (ถ้วย) คู่กับ หมึกกรุบ เส้นบุกปรุงรส ทุกรสชาติ 50 ก. (ห่อ) พิเศษ 39.- ปกติ 45.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ คอนอร์ คัพโจ๊ก เฉพาะรสชาติที่ร่วมรายการ 32 ก. (ถ้วย) คู่กับ หมึกกรุบ เส้นบุกปรุงรส ทุกรสชาติ 50 ก. (ห่อ) พิเศษ 39.- ปกติ 45.-"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 ราคา 45.- (เฉลี่ยชิ้นละ 22.50.-)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 ราคา 45.- (เฉลี่ยชิ้นละ 22.50.-)"],["ลดราคาป้ายเหลือง","13.- ปกติ 18.-"],["ลดราคาป้ายเหลือง","13.- ปกติ 18.-"],["ลดราคาป้ายเหลือง","58.- ปกติ 62.-"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง, เย็นตาโฟต้มยำหม้อไฟ, เส้นหมี่น้ำใส 55/60 ก. (แพ็ค/10) ราคา 61.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- ลดเหลือ 61.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- เหลือ 61.-"],["ลดราคาป้ายเหลือง","1 ชิ้น 29.- ปกติ 33.-"],["ลดราคาป้ายเหลือง","ยำยำ จัมโบ้ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60/63 ก. (แพ็ค/10) ปกติ 60/63.- ราคาโปรโมชั่น 57.-"],["ราคาสมาชิก","ใช้แต้มสบายการ์ด 500 แต้ม แลกซื้อ ยำยำ จัมโบ้ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60/63 ก. (แพ็ค/10) เหลือเพียง 7.-"],["ลดราคาป้ายเหลือง","พิเศษ 18.- ปกติ 20.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น พิเศษ 42.- ปกติ ชิ้นละ 27.-"],["ลดราคาป้ายเหลือง","พิเศษ 25.- ปกติ 28.-"],["ลดราคาป้ายเหลือง","พิเศษ 39.- ปกติ 45.-"],["ลดราคาป้ายเหลือง","พิเศษ 29.- ปกติ 35.-"],["ลดราคาป้ายเหลือง","ปกติ 25.- ลดเหลือ 23.-"],["ลดราคาป้ายเหลือง","ปกติ 32.- ลดเหลือ 29.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 27.- (คละได้) 1 ชิ้น 16.- เฉลี่ยชิ้นละ 13.50"],["ลดราคาป้ายเหลือง","ปกติ 28.- ลดเหลือ 25.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 59.-"],["ลดราคาป้ายเหลือง","ปกติ 30.- ลดเหลือ 24.-"],["ลดราคาป้ายเหลือง","ปกติ 46.- ลดเหลือ 43.-"],["ลดราคาป้ายเหลือง","ปกติ 59.- ลดเหลือ 49.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 58.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 19.- (ปกติชิ้นละ 10.-)"],["ลดราคาป้ายเหลือง","ราคา 39.-"],["ลดราคาป้ายเหลือง","ปกติ 51.- เหลือ 48.-"],["ลดราคาป้ายเหลือง","ปกติ 20.- เหลือ 17.-"],["ลดราคาป้ายเหลือง","ปกติ 18.- เหลือ 17.-"],["ลดราคาป้ายเหลือง","ปกติ 28.- เหลือ 23.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 37.- ปกติ 75.- (เฉลี่ยชิ้นละ 18.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 37.- ปกติ 75.- (เฉลี่ยชิ้นละ 18.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 37.- ปกติ 75.- (เฉลี่ยชิ้นละ 18.50.-)"],["ราคาสมาชิก","พิเศษสำหรับสมาชิกสบายการ์ด ปกติ 62.- เหลือ 58.-"],["แลกซื้อราคาพิเศษ","พิเศษสำหรับสมาชิกสบายการ์ด ตุนอาหารแห้งยกแพ็ค จ่ายแค่ 8 บาท! เพียงแลก 500 แต้ม เท่ากับ 50 บาท (จากราคา 58 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 58.-"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 ราคา 50.- (เฉลี่ยชิ้นละ 25.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 26.- ปกติ 1 ชิ้น 14.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (ตกชิ้นละ 12.50.-)"],["ซื้อ 2 แถม 1","ซื้อ 2 แถม 1 45.- ปกติ 30.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- ลดเหลือ 62.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- 56.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 22.- ปกติ 1 ชิ้น 16.- (เฉลี่ยชิ้นละ 11.-)"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 56.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 22.- เฉลี่ยชิ้นละ 11.- (ปกติ 1 ชิ้น 16.-)"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ 55/60 ก. (แพ็ค/10) 22.- ปกติ 25.-"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น, เส้นหมี่น้ำใส 55/60 ก. (แพ็ค/10) 62.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","คนอร์ โจ๊กคัพ รสหมู, กุ้ง, ไก่, หมูสับ 35 ก. (ถ้วย) 20.- ปกติ 25.-"],["ซื้อคู่ / 2 ชิ้น","ต้มจั๊บอุบล เส้นเล็ก, เส้นใหญ่ 91 ก. (ซอง) ซื้อ 2 ชิ้น 30.- ปกติ 1 ชิ้น 20.-"],["ลดราคาป้ายเหลือง","คาราบาว บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้ง, เป็ดพะโล้ 40 ก. (ซอง) 19.- ปกติ 25.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 26.- ปกติ 10.- (เฉลี่ยชิ้นละ 13.-)"],["ลดราคาป้ายเหลือง","ลดราคาป้ายเหลือง 29.- ปกติ 32.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (1 ชิ้น)"],["ลดราคาป้ายเหลือง","58.- ปกติ 62.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 39.- (เฉลี่ยชิ้นละ 19.50) ปกติ 1 ชิ้น 25.-"],["ซื้อ 1 แถม 1","1แถม1 16.- เฉลี่ยชิ้นละ 8.-"],["ซื้อ 1 แถม 1","1แถม1 35.- เฉลี่ยชิ้นละ 17.50"],["ซื้อ 1 แถม 1","1แถม1 39.- เฉลี่ยชิ้นละ 19.50"],["ราคาสมาชิก","พิเศษสำหรับสมาชิกสบายการ์ด ราคา 57.- ปกติ 60.-"],["ลดราคาป้ายเหลือง","ปกติ 60.- เหลือ 57.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- เหลือ 61.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 24.- เฉลี่ยชิ้นละ 12.- (ปกติ 1 ชิ้น 14.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 24.- (ตกชิ้นละ 12.-) ปกติ 14.-/ชิ้น"],["ลดราคาป้ายเหลือง","นิสชิน บะหมี่กึ่งสำเร็จรูป 70/71/72/73 ก. (แพ็ค/5) 43.- ปกติ 50.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 34.- (ตกชิ้นละ 17.-) ปกติ 20.-/ชิ้น"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 20.- (ตกชิ้นละ 10.-) ปกติ 12.-/ชิ้น"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 20.- (ตกชิ้นละ 10.-) ปกติ 13.-/ชิ้น"],["ลดราคาป้ายเหลือง","ปกติ 20.- เหลือ 17.-"],["ลดราคาป้ายเหลือง","ปกติ 39.- เหลือ 19.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- เหลือ 58.-"],["ลดราคาป้ายเหลือง","ปกติ 15.- เหลือ 12.-"],["ลดราคาป้ายเหลือง","ลดราคาเหลือ 61.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- ลดเหลือ 61.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 30.- (ตกชิ้นละ 12.50.-)"],["ซื้อ 2 แถม 1","ซื้อ 2 แถม 1 8.- เฉลี่ยชิ้นละ 5.33"],["ลดราคาป้ายเหลือง","ปกติ 49.- 39.-"],["ลดราคาป้ายเหลือง","ปกติ 38.- 36.-"],["ลดราคาป้ายเหลือง","ปกติ 27.- 25.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 44.- (คละได้) เฉลี่ยชิ้นละ 22.-"],["ลดราคาป้ายเหลือง","ปกติ 20.- 18.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- 60.-"],["ลดราคาป้ายเหลือง","ปกติ 28.- 25.-"],["ลดราคาป้ายเหลือง","ปกติ 35.- 29.-"],["ลดราคาป้ายเหลือง","ปกติ 45.- 39.-"],["ลดราคาป้ายเหลือง","คนอร์ โจ๊กกึ่งสำเร็จรูป ทุกรสชาติ 32 ก. (แพ็ค/4) 1 แพ็ค 45.- (เฉลี่ยซองละ 11.25.-) ปกติซองละ 30.-"],["ซื้อคู่ / 2 ชิ้น","คนอร์ โจ๊กกึ่งสำเร็จรูป ทุกรสชาติ 32 ก. (แพ็ค/4) ซื้อ 2 ซอง 45.- (เฉลี่ยซองละ 22.50.-) ปกติซองละ 30.-"],["ลดราคาป้ายเหลือง","ต้มจั๊บ คัพ ทุกรสชาติ 70 ก. (แพ็ค/6) 85.- (เฉลี่ยถ้วยละ 14.17.-) ปกติ 89.- (เฉลี่ยถ้วยละ 14.83.-)"],["ลดราคาป้ายเหลือง","ปกติ 38.- เหลือ 35.- (สำหรับแพ็ค 4 ซอง)"],["ลดราคาป้ายเหลือง","ปกติ 50.- 43.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- 58.-"],["ลดราคาป้ายเหลือง","ปกติ 38.- 35.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 19.- ปกติ 25.- (ตกชิ้นละ 9.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 15.- ปกติ 20.- (ตกชิ้นละ 7.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 30.- (ตกชิ้นละ 12.50.-)"],["ลดราคาป้ายเหลือง","16.- ปกติ 20.-"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ 55 ก. (แพ็ค/10) 61.- ปกติ 65.-"],["ซื้อคู่ / 2 ชิ้น","คนอร์ โจ๊กกึ่งสำเร็จรูป ทุกรสชาติ 32 ก. (แพ็ค/4) ซื้อ 2 แพ็ค 45.- ปกติ 30.- (ต่อแพ็ค)"],["ราคาสมาชิก","ราคาสมาชิก CJ MORE สบายการ์ด 23.- ปกติ 28.-"],["ราคาสมาชิก","ราคาสมาชิก CJ MORE สบายการ์ด 23.- ปกติ 28.-"],["ราคาสมาชิก","ราคาสมาชิก CJ MORE สบายการ์ด 23.- ปกติ 28.-"],["ราคาสมาชิก","ราคาสมาชิก CJ MORE สบายการ์ด 23.- ปกติ 28.-"],["ลดราคาป้ายเหลือง","ปกติ 42.- เหลือ 36.-"],["ลดราคาป้ายเหลือง","ปกติ 195.- เหลือ 185.-"],["ลดราคาป้ายเหลือง","ปกติ 52.- เหลือ 38.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- เหลือ 43.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 20.- เฉลี่ยชิ้นละ 10.- (และ 1 ชิ้น 12.-)"],["ลดราคาป้ายเหลือง","ปกติ 18.- 16.-"],["ลดราคาป้ายเหลือง","ปกติ 20.- 18.-"],["ลดราคาป้ายเหลือง","ปกติ 20.- 18.-"],["ลดราคาป้ายเหลือง","ปกติ 60.- 58.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- 59.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- 62.-"],["ลดราคาป้ายเหลือง","ปกติ 60.- ลดเหลือ 56.-"],["แลกซื้อราคาพิเศษ","แลกซื้อ 34.- ปกติ 38.- เมื่อช้อปครบ 150 บาท/ใบเสร็จ"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 58.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- 39.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- ลดเหลือ 43.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 24.- (ตกชิ้นละ 12.-) ปกติ 1 ชิ้น 14.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 16.- (ตกชิ้นละ 8.-) ปกติ 1 ชิ้น 10.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 56.-"],["ลดราคาป้ายเหลือง","ปกติ 25.- ลดเหลือ 17.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 59.- ปกติ 65.- (ตกชิ้นละ 29.50.-)"],["ซื้อ 1 แถม 1","1แถม1 39.- ปกติ 29.- (ต่อซอง)"],["ซื้อ 1 แถม 1","1แถม1 59.- ปกติ 29.- (ต่อแพ็ค)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 30.- (ตกชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 30.- (ตกชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 30.- (ตกชิ้นละ 12.50.-)"],["ลดราคาป้ายเหลือง","599.- ปกติ 757.-"],["ลดราคาป้ายเหลือง","ปกติ 47.- ลดเหลือ 29.-"],["ลดราคาป้ายเหลือง","ปกติ 59.- ลดเหลือ 39.-"],["ซื้อ 1 แถม 1","1 แถม 1 59.- (เฉลี่ยชิ้นละ 29.50.-) ปกติ 29.- (ต่อชิ้น)"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 58.-"],["ซื้อ 2 แถม 1","ซื้อ 2 แถม 1 25.- (เฉลี่ยชิ้นละ 8.33.-) ปกติ 13.- (ต่อชิ้น)"],["ซื้อ 1 แถม 1","ฟรี!! มาม่า บิ๊กแพ็ค ทุกรสชาติ (แพ็ค/4) จำนวน 1 แพ็ค มูลค่า 38 บาท (จำกัด 1 สิทธิ์ / 1 ใบเสร็จ)"],["ลดราคาป้ายเหลือง","ปกติ 65.- 62.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- เหลือ 62.-"],["ลดราคาป้ายเหลือง","ปกติ 28.- เหลือ 23.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 19.- (ปกติชิ้นละ 10.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 30.- (ปกติชิ้นละ 15.-)"],["ลดราคาป้ายเหลือง","23.- ปกติ 28.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27.- ปกติชิ้นละ 30.- (เฉลี่ยชิ้นละ 13.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27.- ปกติชิ้นละ 30.- (เฉลี่ยชิ้นละ 13.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติชิ้นละ 30.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติชิ้นละ 30.- (เฉลี่ยชิ้นละ 12.50.-)"],["ลดราคาป้ายเหลือง","28.- ปกติ 30.-"],["ลดราคาป้ายเหลือง","ปกติ 39.- ลด 33.-"],["ลดราคาป้ายเหลือง","ปกติ 57.- ลด 52.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลด 58.-"],["ลดราคาป้ายเหลือง","ปกติ 28.- ลดเหลือ 23.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- (ปกติชิ้นละ 15.-)"],["ลดราคาป้ายเหลือง","ปกติ 30.- ลดเหลือ 28.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (1 ชิ้น)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 12.50 (1 ชิ้น)"],["ลดราคาป้ายเหลือง","48.- ปกติ 51.-"],["ลดราคาป้ายเหลือง","29.- ปกติ 40.-"],["ลดราคาป้ายเหลือง","ปกติ 11.- ลดเหลือ 9.-"],["ลดราคาป้ายเหลือง","ปกติ 39.- ลดเหลือ 29.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้นถูกกว่า 26.- เฉลี่ยชิ้นละ 13.- (ปกติ 1 ชิ้น 15.-)"],["ลดราคาป้ายเหลือง","ปกติ 38.- ลดเหลือ 36.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- ลดเหลือ 44.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- ลดเหลือ 44.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- ลดเหลือ 60.-"],["ลดราคาป้ายเหลือง","ปกติ 61.- ลดเหลือ 59.-"],["ลดราคาป้ายเหลือง","ปกติ 45.- ลดเหลือ 39.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 16.- (1 ชิ้น) (เฉลี่ยชิ้นละ 12.50)"],["ลดราคาป้ายเหลือง","35.- ปกติ 45.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 22.- ปกติ 27.- (1 ชิ้น 12.-)"],["ลดราคาป้ายเหลือง","15.- ปกติ 20.-"],["ลดราคาป้ายเหลือง","25.- ปกติ 30.-"],["ลดราคาป้ายเหลือง","20.- ปกติ 25.-"],["ซื้อ 1 แถม 1","1 แถม 1 14.- เฉลี่ยชิ้นละ 7.- ปกติ 10.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 15.- ปกติ 20.- (1 ชิ้น 8.-)"],["ลดราคาป้ายเหลือง","ปกติ 25.- 23.-"],["ซื้อคู่ / 2 ชิ้น","2 ชิ้น 26.- เฉลี่ยชิ้นละ 13.- 1 ชิ้น 14.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- 45.-"],["ลดราคาป้ายเหลือง","ปกติ 50.- 45.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 29.- ปกติ 37.- (ตกชิ้นละ 14.50.-)"],["ลดราคาป้ายเหลือง","17.- ปกติ 25.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 32.- ปกติ 40.- (ตกชิ้นละ 16.-)"],["ลดราคาป้ายเหลือง","29.- ปกติ 37.-"],["ลดราคาป้ายเหลือง","57.- ปกติ 60.-"],["ลดราคาป้ายเหลือง","61.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","85.- ปกติ 199.-"],["ลดราคาป้ายเหลือง","129.- ปกติ 159.-"],["ลดราคาป้ายเหลือง","162.- ปกติ 185.-"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป ซื้อ 2 ชิ้น 25.-"],["ราคาสมาชิก","ราคาสมาชิก 58.- ปกติ 62.-"],["ราคาสมาชิก","ราคาสมาชิก 58.- ปกติ 62.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ มาม่าคัพ รสหมูสับ/ต้มยำกุ้ง แพ็ค 3 จำนวน 2 แพ็ค ราคา 58.- (ปกติแพ็คละ 60.- หรือถ้วยละ 20.-)"],["ซื้อ 2 ชิ้น XX บาท","ซื้อ 2 ชิ้น 22 บาท ปกติ 12 บาท (1 ชิ้น)"],["ซื้อ 2 ชิ้น XX บาท","ซื้อ 2 ชิ้น 15 บาท ปกติ 20 บาท (1 ชิ้น)"],["ซื้อ 2 ชิ้น XX บาท","ซื้อ 2 ชิ้น 14 บาท ปกติ 10 บาท (1 ชิ้น)"],["ซื้อ 2 ชิ้น XX บาท","ซื้อ 2 ชิ้น 15 บาท ปกติ 10 บาท (1 ชิ้น)"],["ซื้อ 2 ชิ้น XX บาท","ซื้อ 2 ชิ้น 15 บาท ปกติ 10 บาท (1 ชิ้น)"],["ลดราคา","ปกติ 17.- 15.-"],["ลดราคา","ปกติ 25.- 23.-"],["ลดราคา","ปกติ 16.- 14.-"],["ซื้อ 2 ชิ้นถูกกว่า","2 ชิ้น 26.- เฉลี่ยชิ้นละ 13.- 1 ชิ้น 14.-"],["ลดราคา","ปกติ 50.- 45.-"],["ลดราคา","ปกติ 50.- 45.-"],["ลดราคา","คนอร์ โจ๊ก รสหมู 40 กรัม (แพ็ค 4) 29 บาท (ปกติ 37 บาท)"],["ลดราคา","คนอร์ โจ๊ก รสไก่ 40 กรัม (แพ็ค 4) 29 บาท (ปกติ 37 บาท)"],["ซื้อ 2 ชิ้น XX บาท","คนอร์ โจ๊กกึ่งสำเร็จรูป รสหมู ซื้อ 2 ถ้วย 29 บาท (ปกติ 18 บาท)"],["ลดราคา","ยำยำ ช้างน้อย รสข้าวโพด 60/63 กรัม (แพ็ค 10) 57 บาท (ปกติ 60 บาท)"],["ลดราคา","มาม่า รสต้มยำกุ้งน้ำข้น 55/60 กรัม (แพ็ค 10) 61 บาท (ปกติ 65 บาท)"],["ลดราคา","ปกติ 62 บาท เหลือ 58 บาท"],["ลดราคา","มาม่าคัพ แพ็ค 3 ถ้วย ราคา 58 บาท"],["ลดราคาป้ายเหลือง","ควิก ปรุงสำเร็จ, ไวไว บะหมี่กึ่งสำเร็จรูป 55-60 กรัม แพ็ค 10 ปกติ 62 บาท เหลือ 59 บาท/แพ็ค ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","มาม่า ถ้วยเดียว ประหยัด 2 บาท ปกติ 30 บาท 28 บาท/ถ้วย"],["ลดราคาป้ายเหลือง","ซัมยัง สวีท บูลดัก ราเมง 130 กรัม ประหยัด 13 บาท ปกติ 58 บาท 45 บาท/ซอง"],["ลดราคาป้ายเหลือง","ยำยำ คัพ เส้นหนุบไก่เผ็ด, หม่าล่า 90 กรัม ประหยัด 5 บาท ปกติ 20 บาท 15 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","นิสชิน SD คัพสไปซี่ซอสโรย 75 กรัม ประหยัด 3 บาท ปกติ 25 บาท 22 บาท/ถ้วย"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท เหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ปกติ 62.- เหลือ 56.-"],["ลดราคาป้ายเหลือง","คนอร์ คัพโจ๊ก 170-180 กรัม แพ็ค 12 ปกติ 129.- เหลือ 108.-"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ซอง ราคาพิเศษ 59.-/แพ็ค จากปกติ 62.-/แพ็ค"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27 บาท ปกติ 14 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27 บาท ปกติ 14 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27 บาท ปกติ 14 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27 บาท ปกติ 14 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 27 บาท ปกติ 14 บาท"],["ลดราคาป้ายเหลือง","ลดราคาเหลือ 56 บาท/แพ็ค จากปกติ 60 บาท"],["ลดราคาป้ายเหลือง","ลดราคาเหลือ 56 บาท/แพ็ค จากปกติ 60 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อบะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม (มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, ต้มจั๊บ, คนอร์, ลิตเติ้ลกุ๊ก) ขนาด 55-70 กรัม 2 ซอง ราคา 12 บาท (ปกติชิ้นละ 7 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อบะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม ชนิดถ้วย (มาม่า, ไวไว, ยำยำ, นิสชิน, คนอร์) ขนาด 60 กรัม 2 ถ้วย ราคา 27 บาท (ปกติชิ้นละ 14 บาท)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 10 บาท (เฉลี่ยของละ 5 บาท)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อยิ่งถูก 2 ถ้วย 26 บาท ปกติ 14 บาท เฉลี่ยถ้วยละ 13 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 55-60 กรัม แพ็ค 10 ปกติ 65 บาท ลดเหลือ 62 บาท"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 129 บาท 108 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","มาม่า โจ๊กคัพ/ข้าวต้มคัพ 57 กรัม 10 ถ้วย ปกติ 62 บาท ลด 6 บาท"],["ลดราคาป้ายเหลือง","มาม่าคัพ 170-180 กรัม แพ็ค 12 ปกติ 129 บาท ลด 21 บาท"],["ลดราคาป้ายเหลือง","คนอร์โจ๊กกึ่งสำเร็จรูป รสหมู, ไก่, กุ้ง 45 กรัม ปกติ 28 บาท เหลือ 25 บาท/ถ้วย"],["ลดราคาป้ายเหลือง","มาม่าโจ๊กไข่เค็ม, มาม่าหมูสับ, มาม่าต้มยำกุ้ง 45 กรัม ปกติ 18 บาท เหลือ 16 บาท/ถ้วย"],["ลดราคาป้ายเหลือง","บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ปกติ 62 บาท 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ข้าวต้มกึ่งสำเร็จรูป ตราไทย 5 ซอง ปกติ 145 บาท 119 บาท/ถุง"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท 56 บาท/แพ็ค ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ชิ้น ปกติ 62 บาท ลดเหลือ 56 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ปกติ 62 บาท 56 บาท/แพ็ค"],["ซื้อ 1 แถม 1","รับฟรี! มาม่าบิ๊กแพ็ค 1 ชิ้น (มูลค่า 10 บาท) เมื่อซื้อกลุ่มสินค้าภายใต้แบรนด์ ฟินโอ ทิวลี่ หรือทิวเบอร์รี่ ครบ 99 บาท"],["ซื้อ 1 แถม 1","รับฟรี! มาม่าบิ๊กแพ็ค 1 ชิ้น (มูลค่า 10 บาท) เมื่อซื้อกลุ่มสินค้าภายใต้แบรนด์ ฟินโอ ทิวลี่ หรือทิวเบอร์รี่ ครบ 99 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 12 บาท/ถ้วย เมื่อซื้อสินค้าที่บิ๊กซีมินิ ครบ 79 บาทขึ้นไป (ปกติ 18 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, ซือดะ, โคคา, นิสชิน บะหมี่กึ่งสำเร็จรูป 55-70 กรัม ซื้อ 2 ซอง 12 บาท ปกติซองละ 7 บาท (ประหยัด 2 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ, ยำยำคัพ 60 กรัม, นิสชินคัพ 60 กรัม, โคคาคัพ 60 กรัม บะหมี่ถ้วย ซื้อ 2 ถ้วย 27 บาท ปกติถ้วยละ 14 บาท (ประหยัด 1 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ซอง 18.- ปกติ 10.- (เฉลี่ยซองละ 9.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 27.- ปกติ 14.- (เฉลี่ยถ้วยละ 13.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ซอง 28.- ปกติ 15.- (เฉลี่ยซองละ 14.-)"],["ลดราคาป้ายเหลือง","ปกติ 65 บาท 61 บาท/แพ็ค ประหยัด 4 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 10 บาท/ซอง ปกติ 15 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ซอง 12 บาท ราคาปกติ 7 บาท (ต่อซอง)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 27 บาท ราคาปกติ 14 บาท (ต่อถ้วย)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","คนอร์ โจ๊กถ้วย รสหมู, ไก่, กุ้ง 45 กรัม ปกติ 28 บาท 25 บาท/ถ้วย"],["ลดราคาป้ายเหลือง","ปกติ 40 บาท ลดเหลือ 35 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 40 บาท ลดเหลือ 35 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["แลกซื้อราคาพิเศษ","แลกซื้อ 11 บาท/ถ้วย ปกติ 14 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 11 บาท/ถ้วย ปกติ 14 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 20 บาท/ถ้วย ปกติ 28 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 20 บาท/ถ้วย ปกติ 28 บาท"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ซอง ปกติ 62 บาท ลดเหลือ 56 บาท (ประหยัด 6 บาท)"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 57 กรัม แพ็ค 10 ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ราคาเดียว 39.-/ห่อ"],["ลดราคาป้ายเหลือง","ปกติ 28 บาท 25.-/ถ้วย"],["ลดราคาป้ายเหลือง","ปกติ 40 บาท ลดเหลือ 35 บาท/ห่อ"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 62 บาท เหลือ 56 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 56.- บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ปกติ 18.- ลดเหลือ 13.- บาท/ซอง"],["ลดราคาป้ายเหลือง","ปกติ 14.50 บาท เหลือ 13 บาท"],["ลดราคาป้ายเหลือง","58 บาท/แพ็ค ปกติ 60 บาท"],["ลดราคาป้ายเหลือง","56 บาท/แพ็ค ปกติ 60 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 20 บาท/ถ้วย ราคาปกติ 28 บาท ประหยัด 8 บาท เมื่อซื้อสินค้าที่บิ๊กซีมินิ ครบ 79 บาทขึ้นไป"],["แลกซื้อราคาพิเศษ","แลกซื้อ 33 บาท/ห่อ ราคาปกติ 52 บาท ประหยัด 19 บาท เมื่อซื้อสินค้าที่บิ๊กซีมินิ ครบ 79 บาทขึ้นไป"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 27 บาท ปกติถ้วยละ 16 บาท (ประหยัด 5 บาท เมื่อซื้อ 2 ถ้วย)"],["ลดราคาป้ายเหลือง","ลดราคาเหลือ 58 บาท/แพ็ค จากปกติ 60 บาท"],["ลดราคาป้ายเหลือง","56 บาท/แพ็ค ปกติ 60 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 27.- ปกติ 16.- (ต่อถ้วย) ประหยัด 5.-"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ซอง 18 บาท"],["ซื้อ 1 แถม 1","ฟรี ไวไว ปรุงสำเร็จ 57 กรัม แพ็ค 5 มูลค่า 32 บาท เมื่อซื้อสินค้าที่ร่วมรายการครบ 299 บาท (เฉพาะสินค้าหน้าสื่อ Steet Food เครื่องปรุงเท่านั้น)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 59 บาท/แพ็ค ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","ปกติ 60.- ลดเหลือ 56.- บาท/แพ็ค"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 60 กรัม แพ็ค 10 ปกติ 60 บาท เหลือ 56 บาท/แพ็ค"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ห่อ 26 บาท ปกติห่อละ 15 บาท (เฉลี่ยห่อละ 13 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 27 บาท ปกติถ้วยละ 16 บาท (เฉลี่ยถ้วยละ 13.50 บาท)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 39.- เฉลี่ยชิ้นละ 19.50 บาท (หยิบของแถมที่จุดขาย)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อยิ่งถูก 2 ห่อ 38.- ปกติ 25.- (ตกห่อละ 19.-)"],["ลดราคาป้ายเหลือง","ปกติ 65 บาท ลดเหลือ 61 บาท/แพ็ค (ประหยัด 4 บาท)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 25.- เฉลี่ยซองละ 12.50 บาท (หยิบของแถมที่จุดขาย)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 25.- เฉลี่ยซองละ 12.50 บาท (หยิบของแถมที่จุดขาย)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 25.- เฉลี่ยซองละ 12.50 บาท (หยิบของแถมที่จุดขาย)"],["ซื้อ 1 แถม 1","ซื้อ 1 แถม 1 25.- เฉลี่ยซองละ 12.50 บาท (หยิบของแถมที่จุดขาย)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 59 บาท/แพ็ค ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","ปกติ 49 บาท 33 บาท/ห่อ ประหยัด 16 บาท"],["ลดราคาป้ายเหลือง","ปกติ 55 บาท 33 บาท/ห่อ ประหยัด 22 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 3 ซอง 33 บาท ปกติซองละ 17 บาท (เฉลี่ยซองละ 11 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 36 บาท 33 บาท/ซอง ประหยัด 3 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 33 บาท ปกติถ้วยละ 16.50 บาท (เฉลี่ยถ้วยละ 16.50 บาท)"],["แลกซื้อราคาพิเศษ","แลกซื้อ 12 บาท/ถ้วย ประหยัด 4 บาท (ราคาปกติ 16 บาท)"],["แลกซื้อราคาพิเศษ","แลกซื้อ 18 บาท/ซอง ประหยัด 9 บาท (ราคาปกติ 27 บาท)"],["แลกซื้อราคาพิเศษ","แลกซื้อ 24 บาท/ถ้วย ประหยัด 11 บาท (ราคาปกติ 35 บาท)"],["ลดราคาป้ายเหลือง","มาม่าโจ๊กคัพ รสหมู ปกติ 37 บาท ลดเหลือ 34 บาท ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","มาม่าข้าวต้มคัพ รสปลา ปกติ 39 บาท ลดเหลือ 35 บาท ประหยัด 4 บาท"],["ลดราคาป้ายเหลือง","คนอร์คัพโจ๊ก 18 กรัม (ทุกรส) ปกติ 28 บาท ลดเหลือ 25 บาท ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","มาม่าโจ๊กคัพ รสไข่เค็ม ปกติ 18 บาท ลดเหลือ 16 บาท ประหยัด 2 บาท"],["ลดราคาป้ายเหลือง","ปกติ 55 บาท 33 บาท/ห่อ ประหยัด 22 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 3 ชิ้น 33 บาท (เฉลี่ยชิ้นละ 11 บาท) จากปกติชิ้นละ 55 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 3 ชิ้น 33 บาท (เฉลี่ยชิ้นละ 11 บาท) จากปกติชิ้นละ 49 บาท"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท 59 บาท/แพ็ค ประหยัด 3 บาท"],["แลกซื้อราคาพิเศษ","แลกซื้อ 35 บาท/แพ็ค ราคาปกติ 45 บาท ประหยัด 10 บาท"],["ลดราคาป้ายเหลือง","ปกติ 65 บาท ลดเหลือ 61 บาท/แพ็ค (ประหยัด 4 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค (ประหยัด 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 25 บาท ปกติ 14 บาท เฉลี่ยถ้วยละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 18 บาท ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ลดราคาป้ายเหลือง","ปกติ 25 บาท ลดเหลือ 20 บาท/ถ้วย"],["ลดราคาป้ายเหลือง","มาม่า ต้มยำกุ้ง, เย็นตาโฟหม้อไฟ, เส้นหมี่น้ำใส 55-60 กรัม แพ็ค 10 ปกติ 65 บาท เหลือ 61 บาท/แพ็ค ประหยัด 4 บาท"],["ลดราคาป้ายเหลือง","ไวไว ปรุงสำเร็จ และไวไวบะหมี่กึ่งสำเร็จรูป 52-60 กรัม แพ็ค 10 (ทุกรส) ปกติ 62 บาท เหลือ 56 บาท/แพ็ค ประหยัด 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 25 บาท ปกติ 14 บาท เฉลี่ยถ้วยละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท 59 บาท/แพ็ค ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","ซัมยังไก่เผ็ด, เอ็กซ์ตรีมฮอทชิคเก้น, ออริจินอล เผ็ดX3, ชีส, คาโบนารา 130-140 กรัม ปกติ 52 บาท 33 บาท/ซอง ประหยัด 19 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป มาม่า 10 ซอง (รสหมูสับ, ต้มยำกุ้ง, ต้มยำกุ้งน้ำข้น, เย็นตาโฟ) ซื้อ 2 ชิ้น 33 บาท ปกติ 38 บาท (เฉลี่ยชิ้นละ 16.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป ไวไว 95 กรัม แพ็ค 4 (ทรงเครื่อง, ต้มยำ) ซื้อ 2 ชิ้น 33 บาท ปกติ 38 บาท (ประหยัด 5 บาท)"],["ลดราคาป้ายเหลือง","โจ๊ก/ข้าวต้ม มาม่า 12 กรัม (หมูสับ, กุ้ง, ไก่) ปกติ 39 บาท 33 บาท/ชิ้น ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","โจ๊ก/ข้าวต้ม คนอร์ 230 กรัม แพ็ค 3 (หมู, ไก่) ปกติ 37 บาท 33 บาท/แพ็ค ประหยัด 4 บาท"],["ลดราคาป้ายเหลือง","มาม่า คัพ บะหมี่กึ่งสำเร็จรูป 57-60 กรัม แพ็ค 10 ปกติ 62.- เหลือ 56.- ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","มาม่า ต้มยำกุ้ง, เย็นตาโฟหม้อไฟ, เส้นหมี่น้ำใส 55-60 กรัม แพ็ค 10 ปกติ 65 บาท เหลือ 61 บาท ประหยัด 4 บาท"],["ลดราคาป้ายเหลือง","ปกติ 60 บาท ลดเหลือ 57 บาท/แพ็ค ประหยัด 3 บาท"],["ลดราคาป้ายเหลือง","ปกติ 60 บาท ลดเหลือ 56 บาท/แพ็ค (ตกชิ้นละ 5.60 บาท)"],["ลดราคาป้ายเหลือง","บะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม คละรส 55-60 กรัม แพ็ค 10 ปกติ 62 บาท เหลือ 59 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ฟ้าไทย ผงทำข้าวต้ม 105 กรัม แพ็ค 2 ซอง ปกติ 45 บาท เหลือ 39 บาท"],["ซื้อคู่ / 2 ชิ้น","คนอร์ โจ๊กคัพ รสหมู/กุ้ง/ไก่ 32-35 กรัม ซื้อ 2 ถ้วย 24 บาท ปกติ 30 บาท"],["ลดราคาป้ายเหลือง","ทุกชิ้น 33 บาท"],["ลดราคาป้ายเหลือง","ทุกชิ้น 33 บาท"],["ลดราคาป้ายเหลือง","ราคาเดียว 25.- ปกติ 30.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- 56.-/แพ็ค"],["ลดราคาป้ายเหลือง","ราคาเดียว 25.-/ถุง"],["ลดราคาป้ายเหลือง","ปกติ 135.- 129.-/แพ็ค"],["ลดราคาป้ายเหลือง","ยำยำ ชนิด 60 กรัม แพ็ค 10 (ทุกรส) ราคา 56 บาท/แพ็ค ปกติ 60 บาท ประหยัด 4 บาท"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 56 บาท/แพ็ค ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 60 กรัม (ทุกรส) ซื้อ 10 ห่อ 56.- ปกติ 60.- (ประหยัด 4 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท เหลือ 59 บาท"],["ลดราคาป้ายเหลือง","ปกติ 39 บาท เหลือ 35 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 กระป๋อง 24 บาท ปกติกระป๋องละ 13 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 100.- ปกติ 150.- (เฉลี่ยชิ้นละ 33.33.-)"],["ลดราคาป้ายเหลือง","ลด 32.- เหลือ 28.- (ประหยัด 4.-)"],["ลดราคาป้ายเหลือง","ลด 62.- เหลือ 59.- (ประหยัด 3.-)"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 12 บาท ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ชิ้น 25 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25.- ปกติ 15.- (เฉลี่ยชิ้นละ 12.50.-)"],["ลดราคาป้ายเหลือง","ปกติ 23.- ลดเหลือ 21.-"],["ลดราคาป้ายเหลือง","ซัมยัง บะหมี่กึ่งสำเร็จรูป 140 กรัม ทุกรสชาติ ราคาเดียว 39.-"],["ลดราคาป้ายเหลือง","ไวไว บะหมี่สำเร็จรูป 57 กรัม แพ็ค 10 ปกติ 62 บาท เหลือ 56 บาท/แพ็ค"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18.- ปกติ 10.- (เฉลี่ยชิ้นละ 9.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18.- ปกติ 10.- (เฉลี่ยชิ้นละ 9.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18.- ปกติ 10.- (เฉลี่ยชิ้นละ 9.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18.- ปกติ 10.- (เฉลี่ยชิ้นละ 9.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 25.- ปกติ 14.- (เฉลี่ยถ้วยละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 25.- ปกติ 14.- (เฉลี่ยถ้วยละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 25.- ปกติ 14.- (เฉลี่ยถ้วยละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-) จากปกติชิ้นละ 7.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-) จากปกติชิ้นละ 7.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-) จากปกติชิ้นละ 7.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-) จากปกติชิ้นละ 7.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-) จากปกติชิ้นละ 7.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 3 ชิ้น 20.- (เฉลี่ยชิ้นละ 6.67.-) จากปกติชิ้นละ 10.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท ปกติ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท ปกติ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท ปกติ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท ปกติ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท ปกติ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท ปกติ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท ปกติ 15 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้งน้ำข้น 60 กรัม แพ็ค 10 ซอง 59.- ปกติ 62.- (ประหยัด 3.-)"],["ลดราคาป้ายเหลือง","ฟ้าไทย ผงทำน้ำซุป / ผงทำข้าวต้ม 70 กรัม ปกติ 23.- เหลือ 21.-"],["ลดราคาป้ายเหลือง","ซัมยัง บะหมี่กึ่งสำเร็จรูป 140 กรัม ปกติ 52.- เหลือ 39.-"],["ซื้อคู่ / 2 ชิ้น","มาม่า บะหมี่กึ่งสำเร็จรูป 60 กรัม (ทุกรสชาติ) ซื้อ 2 ชิ้น 59.- ปกติ 62.- (ตกชิ้นละ 29.50.-)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 25 บาท"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 18 บาท (ตกชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 18 บาท (ตกชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 18 บาท (ตกชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 18 บาท (ตกชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 18 บาท (ตกชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","จับคู่ 2 ชิ้น 18 บาท (ตกชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท (ปกติ 7 บาท/ชิ้น, เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท (ปกติ 7 บาท/ชิ้น, เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท (ปกติ 7 บาท/ชิ้น, เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท (ปกติ 7 บาท/ชิ้น, เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท (ปกติ 7 บาท/ชิ้น, เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12 บาท (ปกติ 7 บาท/ชิ้น, เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18 บาท (ปกติ 10 บาท/ชิ้น, เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18 บาท (ปกติ 10 บาท/ชิ้น, เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18 บาท (ปกติ 10 บาท/ชิ้น, เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18 บาท (ปกติ 10 บาท/ชิ้น, เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18 บาท (ปกติ 10 บาท/ชิ้น, เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18 บาท (ปกติ 10 บาท/ชิ้น, เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท (ปกติ 14 บาท/ชิ้น, เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท (ปกติ 14 บาท/ชิ้น, เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท (ปกติ 14 บาท/ชิ้น, เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท (ปกติ 14 บาท/ชิ้น, เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท (ปกติ 14 บาท/ชิ้น, เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 25 บาท (ปกติ 14 บาท/ชิ้น, เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ต้มจั๊บ, โคคา, ซือดะ, ควิก, มาม่าคัพ, ไวไวคัพ, นิสชินคัพ, โคคาคัพ, ซือดะคัพ, ควิกคัพ 55, 60, 70 กรัม ปกติ 7 บาท เฉลี่ยชิ้นละ 6 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป, มาม่าซอง, ไวไวซอง, ยำยำซอง, นิสชินซอง, ซัมยังซอง, โคคาซอง, ต้มจั๊บซอง, OK ซอง, มาม่าคัพ, ไวไวคัพ, ยำยำคัพ, นิสชินคัพ, ซัมยังคัพ, โคคาคัพ, ต้มจั๊บคัพ, OK คัพ 60, 75, 80, 95 กรัม ปกติ 10 บาท เฉลี่ยชิ้นละ 9 บาท"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, โคคา, ต้มจั๊บ, OK, คนอร์, ลิตเติ้ลกุ๊ก, โจ๊ก, ข้าวต้ม 65 กรัม และ 15 บาท ปกติ 15 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าเฉพาะที่ร่วมรายการ)"],["ลดราคาป้ายเหลือง","ปกติ 69 บาท 59 บาท/แพ็ค ประหยัด 10 บาท"],["ลดราคาป้ายเหลือง","ปกติ 49 บาท 44 บาท/แพ็ค ประหยัด 5 บาท"],["ลดราคาป้ายเหลือง","ควิก บะหมี่กึ่งสำเร็จรูป 60-70 กรัม แพ็ค 5 ปกติ 62 บาท เหลือ 58 บาท"],["ลดราคาป้ายเหลือง","คนอร์ ซุปก้อน 2 ก้อน ปกติ 39 บาท ลดเหลือ 34 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 10 ซอง ปกติ 48 บาท ลดเหลือ 45 บาท"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ถ้วย 25 บาท ปกติ 16 บาท (เฉลี่ยถ้วยละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-) (สินค้าคละกันได้, เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 18.- ปกติ 10.- (เฉลี่ยชิ้นละ 9.-) (สินค้าคละกันได้, เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 29.- ปกติ 14.- (เฉลี่ยชิ้นละ 14.50.-) (สินค้าคละกันได้, เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน 55, 60, 70 กรัม ซื้อ 2 ชิ้น 12 บาท ปกติชิ้นละ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน 55, 60, 70 กรัม ซื้อ 2 ชิ้น 12 บาท ปกติชิ้นละ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน 55, 60, 70 กรัม ซื้อ 2 ชิ้น 12 บาท ปกติชิ้นละ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, นิสชิน 55, 60, 70 กรัม ซื้อ 2 ชิ้น 12 บาท ปกติชิ้นละ 7 บาท (เฉลี่ยชิ้นละ 6 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ, นิสชินคัพ, ไวไวคัพ, ยำยำคัพ, ซัมยังคัพ 60, 75, 80, 95 กรัม ซื้อ 2 ชิ้น 18 บาท ปกติชิ้นละ 10 บาท (เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ, นิสชินคัพ, ไวไวคัพ, ยำยำคัพ, ซัมยังคัพ 60, 75, 80, 95 กรัม ซื้อ 2 ชิ้น 18 บาท ปกติชิ้นละ 10 บาท (เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ, นิสชินคัพ, ไวไวคัพ, ยำยำคัพ, ซัมยังคัพ 60, 75, 80, 95 กรัม ซื้อ 2 ชิ้น 18 บาท ปกติชิ้นละ 10 บาท (เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ, นิสชินคัพ, ไวไวคัพ, ยำยำคัพ, ซัมยังคัพ 60, 75, 80, 95 กรัม ซื้อ 2 ชิ้น 18 บาท ปกติชิ้นละ 10 บาท (เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ, นิสชินคัพ, ไวไวคัพ, ยำยำคัพ, ซัมยังคัพ 60, 75, 80, 95 กรัม ซื้อ 2 ชิ้น 18 บาท ปกติชิ้นละ 10 บาท (เฉลี่ยชิ้นละ 9 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าโอเค, โจ๊กคัพคนอร์, ข้าวต้มคัพลิตเติ้ลกุ๊ก 60 กรัม ซื้อ 2 ชิ้น 25 บาท ปกติชิ้นละ 14 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าโอเค, โจ๊กคัพคนอร์, ข้าวต้มคัพลิตเติ้ลกุ๊ก 60 กรัม ซื้อ 2 ชิ้น 25 บาท ปกติชิ้นละ 14 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ซื้อคู่ / 2 ชิ้น","มาม่าโอเค, โจ๊กคัพคนอร์, ข้าวต้มคัพลิตเติ้ลกุ๊ก 60 กรัม ซื้อ 2 ชิ้น 25 บาท ปกติชิ้นละ 14 บาท (เฉลี่ยชิ้นละ 12.50 บาท)"],["ลดราคาป้ายเหลือง","ปกติ 23 บาท เหลือ 21 บาท"],["ลดราคาป้ายเหลือง","ราคาเดียว 39 บาท"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูป ตรามาม่า, ไวไว, ควิก 57-60 กรัม แพ็ค 10 ซอง ซื้อ 10 ซอง 58.- ปกติ 62.- (ตกซองละ 5.80.-)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 12 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 5, 6, 7, 8, 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 12 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 5, 6, 7, 8, 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 12 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 5, 6, 7, 8, 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 12 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 5, 6, 7, 8, 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 12 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 5, 6, 7, 8, 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 12 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 5, 6, 7, 8, 10 บาท เฉลี่ยชิ้นละ 6 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 18 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 10, 12, 15 บาท เฉลี่ยชิ้นละ 9 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 18 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 10, 12, 15 บาท เฉลี่ยชิ้นละ 9 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 18 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 10, 12, 15 บาท เฉลี่ยชิ้นละ 9 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 18 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 10, 12, 15 บาท เฉลี่ยชิ้นละ 9 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 18 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 10, 12, 15 บาท เฉลี่ยชิ้นละ 9 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 25 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 14 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 25 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 14 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 25 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 14 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 25 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 14 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 25 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 14 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ซื้อคู่ / 2 ชิ้น","ซื้อถูก 2 ชิ้น 25 บาท เมื่อซื้อสินค้าที่ร่วมรายการ ปกติชิ้นละ 14 บาท เฉลี่ยชิ้นละ 12.50 บาท (สินค้าคละกันได้ เฉพาะสินค้าที่ร่วมรายการ)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท เหลือ 58 บาท/แพ็ค"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ห่อ 34 บาท"],["ลดราคาป้ายเหลือง","อร่อย บะหมี่กึ่งสำเร็จรูป/โจ๊ก/ข้าวต้ม 57-60 กรัม แพ็ค 10 ซอง ราคาพิเศษ 58 บาท ปกติ 62 บาท"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท 56 บาท/แพ็ค ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","ฟ้าไทย โจ๊กกึ่งสำเร็จรูป ปกติ 23 บาท ลดเหลือ 21 บาท/ซอง"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ แพ็ค 6 ซอง ปกติ 32 บาท ลดเหลือ 30 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","ซัมยัง บะหมี่กึ่งสำเร็จรูป (คละรส) ปกติ 52 บาท ลดเหลือ 39 บาท/ซอง"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ไวไว, ยำยำ, ซือดะ, นิสชิน, ต้มจั๊บ คัพ 60 กรัม (สินค้าคละกันได้, เฉพาะสินค้าที่ร่วมรายการ) ซื้อ 2 ถ้วย 25.- ปกติ 14.- (เฉลี่ยถ้วยละ 12.50.-)"],["ซื้อคู่ / 2 ชิ้น","มาม่า, ยำยำ, นิสชิน, ไวไว, ซือดะ ซอง ขนาด 55, 60, 70 กรัม (สินค้าคละกันได้, เฉพาะสินค้าที่ร่วมรายการ) ซื้อ 2 ซอง 12.- ปกติ 7.- (เฉลี่ยชิ้นละ 6.-)"],["ซื้อคู่ / 2 ชิ้น","คนอร์คัพโจ๊ก/ข้าวต้มทุกรส ปกติ 25.- ซื้อ 2 ถ้วย 34.- (เฉลี่ยถ้วยละ 17.-)"],["ซื้อคู่ / 2 ชิ้น","คนอร์โจ๊ก/ข้าวต้มซองทุกรส ปกติ 25.- ซื้อ 2 ซอง 34.- (เฉลี่ยซองละ 17.-)"],["แลกซื้อราคาพิเศษ","แลกซื้อ 34 บาท/แพ็ค เมื่อซื้อสินค้าที่บิ๊กซีมินิครบ 79 บาทขึ้นไป ปกติ 40 บาท ประหยัด 6 บาท"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท (แพ็ค 10), ลดเหลือ 58 บาท (แพ็ค)"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 34 บาท (ปกติ 20 บาท/ชิ้น)"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท ลดเหลือ 58 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป 140 กรัม ปกติ 52.- ลดเหลือ 39.-"],["ลดราคาป้ายเหลือง","ปกติ 62 บาท เหลือ 58 บาท (ประหยัด 4 บาท)"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 90.- ลดเหลือ 80.- (เฉลี่ยซองละ 8.00.-)"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 90.- ลดเหลือ 80.- (เฉลี่ยซองละ 8.00.-)"],["ลดราคาป้ายเหลือง","ไวไว บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 90.- ลดเหลือ 80.- (เฉลี่ยซองละ 8.00.-)"],["ลดราคาป้ายเหลือง","ไวไว บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 90.- ลดเหลือ 80.- (เฉลี่ยซองละ 8.00.-)"],["ลดราคาป้ายเหลือง","ยำยำ บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 90.- ลดเหลือ 80.- (เฉลี่ยซองละ 8.00.-)"],["ลดราคาป้ายเหลือง","ยำยำ บะหมี่กึ่งสำเร็จรูป แพ็ค 10 ปกติ 90.- ลดเหลือ 80.- (เฉลี่ยซองละ 8.00.-)"],["ลดราคาป้ายเหลือง","ปกติ 52.- ลดเหลือ 39.-"],["ลดราคาป้ายเหลือง","ปกติ 37.- ลดเหลือ 29.- (ประหยัด 8.-)"],["ลดราคาป้ายเหลือง","ปกติ 69.- ลดเหลือ 62.- (ประหยัด 7.-)"],["ซื้อคู่ / 2 ชิ้น","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ 60 กรัม ซื้อ 10 ซอง 27.- ปกติ 29.- (ตกซองละ 2.70.-)"],["ซื้อคู่ / 2 ชิ้น","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ 82 กรัม ซื้อ 3 ชิ้น 29.- ปกติ 37.- (ตกชิ้นละ 9.67.-)"],["ซื้อคู่ / 2 ชิ้น","คนอร์ โจ๊กคัพ รสหมู/กุ้ง 60 กรัม ซื้อ 3 ชิ้น 62.- ปกติ 69.- (ตกชิ้นละ 20.67.-)"],["ซื้อ 2 แถม 1","ซื้อ 2 แถม 1 36 บาท ปกติ 18 บาท (เฉลี่ยชิ้นละ 12 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อคู่ราคาพิเศษ 28 บาท เมื่อซื้อ เบอร์ดี้ กาแฟกระป๋อง โรบัสต้า 170 มล. (ปกติ 17 บาท) และ มาม่าคัพ รสหมูสับ 60 กรัม (ปกติ 16 บาท) (เฉลี่ยชิ้นละ 14 บาท)"],["แลกซื้อราคาพิเศษ","แลกซื้อราคาพิเศษ 28 บาท/ชุด (เบอร์ดี้ กาแฟกระป๋อง 170 มล. ปกติ 17 บาท, คนอร์ คัพโจ๊ก 60 กรัม ปกติ 16 บาท, ประหยัด 5 บาท)"],["ลดราคาป้ายเหลือง","บะหมี่กึ่งสำเร็จรูป 55-60 กรัม ปกติ 65 บาท ลดเหลือ 62 บาท/แพ็ค"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ 60 กรัม แพ็ค 10 ปกติ 60.- ลดเหลือ 58.- (ประหยัด 2.-)"],["ลดราคาป้ายเหลือง","พิเศษ 33.-"],["ลดราคาป้ายเหลือง","พิเศษ 33.-"],["ซื้อคู่ / 2 ชิ้น","ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 27 บาท ปกติ 15 บาท (ต่อถ้วย) เฉลี่ยถ้วยละ 13.50 บาท"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสต้นยำกุ้ง 55 กรัม แพ็ค 10 ปกติ 65 บาท เหลือ 61 บาท/แพ็ค ประหยัด 4 บาท"],["ลดราคาป้ายเหลือง","ปกติ 25 บาท, เหลือ 17 บาท/ถ้วย ประหยัด 8 บาท"],["ลดราคาป้ายเหลือง","ปกติ 65 บาท ลดเหลือ 61 บาท (ตกซองละ 6.10 บาท)"],["ซื้อคู่ / 2 ชิ้น","ซื้อยี่ห้อนี้ ยี่ห้อถูก 2 ถ้วย 27 บาท ปกติ 30 บาท (ตกชิ้นละ 13.50 บาท)"],["ลดราคาป้ายเหลือง","มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ 55 กรัม แพ็ค 10 ซอง ปกติ 65 บาท เหลือ 62 บาท"],["ลดราคาป้ายเหลือง","แพ็กละ 58.- ปกติ 62.-"],["ลดราคาป้ายเหลือง","คนอร์ โจ๊กกึ่งสำเร็จรูป รสหมู 35 กรัม ปกติ 30.- ลดเหลือ 28.-"],["ลดราคาป้ายเหลือง","มาม่าคัพ 60-75 กรัม แพ็ค 3 ถ้วย ปกติ 51.- ลดเหลือ 48.-"],["ลดราคาป้ายเหลือง","แพ็คละ 199.- ปกติ 239.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 34.- ปกติชิ้นละ 17.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 77.- ปกติชิ้นละ 43.-"],["ลดราคาป้ายเหลือง","แพ็คละ 48.- ปกติ 51.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 15.- ปกติชิ้นละ 20.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 15.- ปกติชิ้นละ 20.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 15.- ปกติชิ้นละ 20.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 27.- ปกติ 16.- (ตกชิ้นละ 13.50.-)"],["ลดราคาป้ายเหลือง","พิเศษเพียง 57.- ปกติแพ็กละ 60.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 15.- ปกติชิ้นละ 20.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 15.- ปกติชิ้นละ 20.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 15.- ปกติชิ้นละ 20.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 59.- ปกติแพ็คละ 68-70.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 62.- ปกติ แพ็คละ 65.-"],["ลดราคาป้ายเหลือง","ปกติ 65.- ลดเหลือ 62.-"],["ลดราคาป้ายเหลือง","แพ็คละ 32.- ปกติ 35.-"],["แลกซื้อราคาพิเศษ","แลกซื้อเพียง 57.- ปกติแพ็คละ 60.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 58.- ปกติแพ็คละ 60.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 57.- ปกติ แพ็คละ 60.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 62.- ปกติ 65.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 48.- ปกติ ถุงละ 51.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 79.- เฉลี่ยชิ้นละ 39.50 ปกติชิ้นละ 43.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 79.- เฉลี่ยชิ้นละ 39.50 ปกติชิ้นละ 43.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 79.- เฉลี่ยชิ้นละ 39.50 ปกติชิ้นละ 43.-"],["ลดราคาป้ายเหลือง","ลดราคาจากปกติ 62.- เหลือ 59.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 62.- ปกติ 65.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 75.- เฉลี่ยชิ้นละ 37.50 ปกติแพ็คละ 45.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 64.- เฉลี่ยแพ็คละ 32.- ปกติแพ็คละ 35.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 75.- ปกติ 55.-/แพ็ค (เฉลี่ยชิ้นละ 37.50.-)"],["ลดราคาป้ายเหลือง","พิเศษเพียง 62.- ปกติ 65.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 64.- เฉลี่ยชิ้นละ 32.- ปกติแพ็คละ 35.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 57.- ปกติ แพ็คละ 60.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 62.- ปกติแพ็คละ 65.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 43.- ปกติ 50.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 189.- ปกติ 239.-"],["ซื้อคู่ / 2 ชิ้น","พิเศษ 2 ชิ้น 26.- เฉลี่ยชิ้นละ 13.- ปกติชิ้นละ 15.-"],["ลดราคาป้ายเหลือง","พิเศษเพียง 62.- ปกติ 65.-"],["แลกซื้อราคาพิเศษ","แลกซื้อ 15.- ปกติ 20.-"],["ลดราคาป้ายเหลือง","ปกติ 62.- ลดเหลือ 59.-"],["ซื้อคู่ / 2 ชิ้น","บะหมี่กึ่งสำเร็จรูปเกาหลี 130-145 กรัม (ทุกรสชาติ) ซื้อ 2 ชิ้น 75.- ปกติ 35-49.- (ตกชิ้นละ 37.50.-)"],["ซื้อคู่ / 2 ชิ้น","มาม่าคัพ รสหมูสับ, ต้มยำกุ้ง, ต้มยำกุ้งน้ำข้น, เป็ดพะโล้ ซื้อ 2 ชิ้น 46.- ปกติ 52.-"],["ซื้อคู่ / 2 ชิ้น","ซื้อ 2 ชิ้น 75.- ปกติชิ้นละ 55.-"],["ลดราคา","พิเศษเพียง 57.- ปกติ แพ็คละ 60.-"],["ลดราคา","มาม่า บะหมี่สำเร็จรูป รสต้มยำกุ้งน้ำข้น 55 กรัม แพ็ค 10 ซอง พิเศษเพียง 62.- ปกติแพ็คละ 65.-"],["ลดราคา","พิเศษเพียง 43.- ปกติ 50.-"],["ลดราคา","พิเศษเพียง 189.- ปกติ 239.-"],["ซื้อ 2 ชิ้น 26 บาท","ซื้อ 2 ชิ้น 26.- เฉลี่ยซองละ 13.- ปกติซองละ 15.-"],["ลดราคา","พิเศษเพียง 62.- ปกติ 65.-"],["แลกซื้อ","แลกซื้อ 15 บาท ปกติ 20 บาท"],["แลกซื้อ","แลกซื้อ 15 บาท ปกติ 20 บาท"],["ลดราคา","ปกติ 62.- 59.-"],["ซื้อ 2 ชิ้นลดราคา","2 ชิ้น 75.- ปกติ 35.-39.-"],["ลดราคา","46.- ปกติ 52.-"],["ลดราคา","2 ชิ้น ถูกกว่า 75.- ปกติชิ้นละ 55.-"]];
    var noodlePromos = [];
    var noodleMechs = [];
    for (var j = 0; j < numRowsNoodle && j < noodleData.length; j++) {
      noodlePromos.push([noodleData[j][0]]);
      noodleMechs.push([noodleData[j][1]]);
    }
    if (noodlePromos.length > 0) {
      sheetNoodle.getRange(2, 7, noodlePromos.length, 1).setValues(noodlePromos); // Col G: Promotion Type
      sheetNoodle.getRange(2, 11, noodleMechs.length, 1).setValues(noodleMechs);   // Col K: Mechanic
    }
  }

  return {
    ok: true,
    message: 'อัปเดตกลไกโปรโมชั่น (Promotion Mechanic) ตรงกับรูปภาพ 100% เรียบร้อยแล้ว'
  };
}
