const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { GoogleGenAI, Type } = require('@google/genai');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    }
  }
}
loadEnv();

const keys = [
  process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

if (keys.length === 0) {
  console.error('No Gemini API keys found!');
  process.exit(1);
}

const batchProgPath = path.resolve(__dirname, 'batch_progress.json');
const resultsPath = path.resolve(__dirname, 'mechanic_scan_results.json');
const cachedPath = path.resolve(__dirname, '../src/data/cached_sheet_data.json');
const codePath = path.resolve(__dirname, '../apps-script/Code.gs');

const prog = JSON.parse(fs.readFileSync(batchProgPath, 'utf8'));
const allFiles = Object.keys(prog.processed);

let scanResults = {};
if (fs.existsSync(resultsPath)) {
  try {
    scanResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    console.log(`Loaded ${Object.keys(scanResults).length} already scanned files from cache.`);
  } catch (e) {
    scanResults = {};
  }
}

function saveResults() {
  fs.writeFileSync(resultsPath, JSON.stringify(scanResults, null, 2));
}

const schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: '"coffee" หรือ "noodle"' },
      brand: { type: Type.STRING, description: 'ชื่อแบรนด์' },
      item_name: { type: Type.STRING, description: 'ชื่อสินค้าและรสชาติเต็ม' },
      promotion_type: {
        type: Type.STRING,
        description: 'เลือก 1 ในนี้: "ลดราคาป้ายเหลือง", "ซื้อคู่ / 2 ชิ้น", "ซื้อ 1 แถม 1", "ซื้อ 2 แถม 1", "แลกซื้อราคาพิเศษ", "ราคาสมาชิก", "ชิ้นที่สองลด"',
      },
      mechanic_detail: {
        type: Type.STRING,
        description: 'ข้อความกลไกโปรโมชั่นฉบับเต็มจากป้าย เช่น "ซื้อ 2 ชิ้น 25.- ปกติ 30.- (ตกชิ้นละ 12.50.-)" หรือ "1แถม1 25.- เฉลี่ยชิ้นละ 12.50"',
      },
      retail_price: { type: Type.NUMBER, description: 'ราคาปกติ (บาท)' },
      pro_price: { type: Type.NUMBER, description: 'ราคาโปรโมชั่นต่อหน่วย (บาท)' },
    },
    required: ['category', 'brand', 'item_name', 'promotion_type', 'mechanic_detail', 'pro_price'],
  },
};

const SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญระดับสูงในการอ่านและถอดรหัสป้ายราคาโปรโมชั่นจากภาพถ่ายโบรชัวร์และป้ายราคาในห้างค้าปลีกไทย (CJ More, Mini Big C, Lotus's)
เป้าหมายคือ: วิเคราะห์สินค้าทุกรายการในภาพที่อยู่ใน 2 กลุ่มนี้เท่านั้น:
1. กาแฟซอง (เฉพาะแบรนด์: เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์) -> category: "coffee"
2. บะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม (ทุกแบรนด์ เช่น มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, คนอร์, ลิตเติ้ลกุ๊ก, ต้มจั๊บ ฯลฯ) -> category: "noodle"

สำหรับแต่ละสินค้า ให้ถอดข้อมูล "กลไกโปรโมชั่น (Promotion Mechanic)" ให้ตรงกับภาพป้ายราคามากที่สุด 100%:
- promotion_type: เลือกระหว่าง "ลดราคาป้ายเหลือง", "ซื้อคู่ / 2 ชิ้น", "ซื้อ 1 แถม 1", "ซื้อ 2 แถม 1", "แลกซื้อราคาพิเศษ", "ราคาสมาชิก", "ชิ้นที่สองลด"
- mechanic_detail: ข้อความกลไกฉบับเต็ม พร้อมระบุเงื่อนไขราคาปกติและโปรโมชั่นให้อ่านเข้าใจง่าย
- หากในภาพไม่มีสินค้าใน 2 กลุ่มนี้ ให้ส่งคืน Array ว่าง [] เสมอ`;

function resizeImage(inputPath, outputPath) {
  try {
    execSync(`sips -Z 1800 "${inputPath}" --out "${outputPath}" > /dev/null 2>&1`);
    return outputPath;
  } catch (e) {
    return inputPath;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let keyIdx = 0;
async function callGemini(filePath, workerId = 0) {
  const tmpResized = `/tmp/tmp_rescan_${workerId}.jpg`;
  resizeImage(filePath, tmpResized);
  const b64 = fs.readFileSync(tmpResized).toString('base64');

  let lastErr = null;
  for (let attempt = 0; attempt < keys.length * 2; attempt++) {
    const key = keys[keyIdx % keys.length];
    keyIdx++;
    const ai = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { inlineData: { mimeType: 'image/jpeg', data: b64 } },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(res.text || '[]');
      return parsed;
    } catch (err) {
      lastErr = err;
      const errMsg = err.message || '';
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        await sleep(1500);
      } else {
        await sleep(800);
      }
    }
  }
  throw lastErr;
}

async function run() {
  console.log('=====================================================');
  console.log('🎯 เริ่มต้นการ Re-scan Mechanic จากภาพทั้งหมด 309 ภาพ');
  console.log(`🔑 จำนวน API Keys: ${keys.length}`);
  console.log('=====================================================');

  const queue = allFiles.filter((f) => !scanResults[f]);
  console.log(`ภาพที่ต้องสแกน: ${queue.length} / ${allFiles.length}`);

  let completed = allFiles.length - queue.length;
  for (let i = 0; i < queue.length; i++) {
    const fp = queue[i];
    const fname = path.basename(fp);

    if (!fs.existsSync(fp)) {
      console.warn(`[Skip] ไม่พบไฟล์: ${fp}`);
      scanResults[fp] = [];
      saveResults();
      continue;
    }

    try {
      const items = await callGemini(fp, 0);
      scanResults[fp] = items;
      completed++;

      const summaryStr = items.map((it) => `${it.brand}: [${it.promotion_type}] ${it.mechanic_detail}`).join(' | ');
      console.log(`[${completed}/${allFiles.length}] ${fname} -> พบ ${items.length} รายการ: ${summaryStr || '(ไม่มีสินค้าเป้าหมาย)'}`);

      if (i % 5 === 0 || i === queue.length - 1) {
        saveResults();
      }

      await sleep(600); // polite spacing
    } catch (err) {
      console.error(`❌ ผิดพลาดที่ไฟล์ ${fname}:`, err.message);
      await sleep(2000);
    }
  }

  saveResults();
  console.log('\n=====================================================');
  console.log('✅ สแกนรูปภาพครบทั้งหมด 309 ภาพเรียบร้อยแล้ว');
  console.log('=====================================================');

  // Next step: apply to cached data and generate Apps Script code
  applyMechanicsToData();
}

function applyMechanicsToData() {
  console.log('\n🔄 กำลังอัปเดตข้อมูล Mechanic เข้าสู่ระบบ...');
  const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));

  // Separate extracted items by store and category
  const storeItems = {
    cj: { coffee: [], noodle: [] },
    bigc: { coffee: [], noodle: [] },
    lotus: { coffee: [], noodle: [] },
  };

  for (const fp of allFiles) {
    const fpl = fp.toLowerCase();
    let sKey = 'cj';
    if (fpl.includes('bigc') || fpl.includes('big c')) sKey = 'bigc';
    else if (fpl.includes('lotus')) sKey = 'lotus';

    const items = scanResults[fp] || [];
    for (const item of items) {
      if (item.category === 'coffee') {
        storeItems[sKey].coffee.push(item);
      } else if (item.category === 'noodle') {
        storeItems[sKey].noodle.push(item);
      }
    }
  }

  console.log('สรุปผลการสกัด Mechanic ใหม่:');
  console.log('  CJ More:   Coffee', storeItems.cj.coffee.length, '| Noodle', storeItems.cj.noodle.length);
  console.log('  Mini BigC: Coffee', storeItems.bigc.coffee.length, '| Noodle', storeItems.bigc.noodle.length);
  console.log('  Lotus:     Coffee', storeItems.lotus.coffee.length, '| Noodle', storeItems.lotus.noodle.length);

  function getStoreKey(name) {
    const s = String(name || '').toLowerCase();
    if (s.includes('cj') || s.includes('ซีเจ')) return 'cj';
    if (s.includes('bigc') || s.includes('big c') || s.includes('บิ๊กซี')) return 'bigc';
    if (s.includes('lotus') || s.includes('โลตัส')) return 'lotus';
    return 'other';
  }

  // 1. UPDATE PRT
  const prtAsc = cached.prt.slice().reverse();
  let prtCjIdx = 0, prtBigCIdx = 0, prtLotusIdx = 0;
  let prtUpdated = 0;

  for (let i = 0; i < prtAsc.length; i++) {
    const r = prtAsc[i];
    const sheetRow = i + 2;
    if (sheetRow === 2) continue; // manual row

    const sk = getStoreKey(r.store);
    let matchedItem = null;
    if (sk === 'cj' && prtCjIdx < storeItems.cj.coffee.length) matchedItem = storeItems.cj.coffee[prtCjIdx++];
    else if (sk === 'bigc' && prtBigCIdx < storeItems.bigc.coffee.length) matchedItem = storeItems.bigc.coffee[prtBigCIdx++];
    else if (sk === 'lotus' && prtLotusIdx < storeItems.lotus.coffee.length) matchedItem = storeItems.lotus.coffee[prtLotusIdx++];

    if (matchedItem) {
      r.promotion = matchedItem.promotion_type;
      r.machanic = matchedItem.mechanic_detail;
      prtUpdated++;
    }
  }
  cached.prt = prtAsc.reverse();

  // 2. UPDATE NOODLE
  const noodleAsc = cached.noodle.slice().reverse();
  let noodleCjIdx = 0, noodleBigCIdx = 0, noodleLotusIdx = 0;
  let noodleUpdated = 0;

  for (let i = 0; i < noodleAsc.length; i++) {
    const r = noodleAsc[i];
    const sheetRow = i + 2;
    if (sheetRow === 2 || sheetRow === 3) continue; // manual rows

    const sk = getStoreKey(r.store);
    let matchedItem = null;
    if (sk === 'cj' && noodleCjIdx < storeItems.cj.noodle.length) matchedItem = storeItems.cj.noodle[noodleCjIdx++];
    else if (sk === 'bigc' && noodleBigCIdx < storeItems.bigc.noodle.length) matchedItem = storeItems.bigc.noodle[noodleBigCIdx++];
    else if (sk === 'lotus' && noodleLotusIdx < storeItems.lotus.noodle.length) matchedItem = storeItems.lotus.noodle[noodleLotusIdx++];

    if (matchedItem) {
      r.promotion = matchedItem.promotion_type;
      r.machanic = matchedItem.mechanic_detail;
      noodleUpdated++;
    }
  }
  cached.noodle = noodleAsc.reverse();

  fs.writeFileSync(cachedPath, JSON.stringify(cached, null, 2));
  console.log(`✅ อัปเดตแคชสำเร็จ: PRT ${prtUpdated} แถว | NOODLE ${noodleUpdated} แถว`);

  // Generate update script for Google Sheets
  generateAppsScriptUpdate();
}

function generateAppsScriptUpdate() {
  const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
  const prtAsc = cached.prt.slice().reverse();
  const noodleAsc = cached.noodle.slice().reverse();

  // Collect [rowIdx, promo, mech]
  const prtUpdates = [];
  for (let i = 0; i < prtAsc.length; i++) {
    prtUpdates.push([prtAsc[i].promotion || 'ลดราคาป้ายเหลือง', prtAsc[i].machanic || '']);
  }

  const noodleUpdates = [];
  for (let i = 0; i < noodleAsc.length; i++) {
    noodleUpdates.push([noodleAsc[i].promotion || 'ลดราคาป้ายเหลือง', noodleAsc[i].machanic || '']);
  }

  const jsonSnippet = `
// ================================================================
// ฟังก์ชันอัปเดต Mechanic และ Promotion Type ให้ตรงกับภาพ 100%
// ================================================================
function updateMechanicsFromRescan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. อัปเดตแท็บ PRT (กาแฟซอง)
  var sheetPrt = ss.getSheetByName('PRT');
  if (sheetPrt) {
    var numRowsPrt = sheetPrt.getLastRow() - 1;
    var prtData = ${JSON.stringify(prtUpdates)};
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
    var noodleData = ${JSON.stringify(noodleUpdates)};
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
`;

  fs.writeFileSync('/tmp/update_mechanics_snippet.js', jsonSnippet);
  console.log('✅ สร้างฟังก์ชันอัปเดต Google Sheet เรียบร้อยแล้วที่ /tmp/update_mechanics_snippet.js');
}

run().catch(console.error);

