const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { GoogleGenAI, Type } = require('@google/genai');

// โหลด Environment Variables จาก .env.local
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

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

// รวบรวม API Keys ทั้งหมดที่พบ
function getApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean));
  }
  if (process.env.GEMINI_API_KEY) {
    const split = process.env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
    for (const k of split) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

const FOLDERS = [
  { path: '/Users/teephobwirachowatin/Pictures/Promo Facebook/CJ More', store: 'CJ' },
  { path: '/Users/teephobwirachowatin/Pictures/Promo Facebook/Mini BigC', store: 'Mini BigC' },
  { path: '/Users/teephobwirachowatin/Pictures/Promo Facebook/Lotus Go Fresh', store: "Lotus's" },
];

const PROGRESS_FILE = path.resolve(__dirname, 'batch_progress.json');

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (e) {
      return { processed: {}, savedRows: 0 };
    }
  }
  return { processed: {}, savedRows: 0 };
}

function saveProgress(prog) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2));
}

// สกีมาส่งให้ Gemini สกัดทั้งกาแฟซองและบะหมี่/โจ๊ก/ข้าวต้มพร้อมกัน
const schema = {
  type: Type.ARRAY,
  description: 'รายการสินค้าโปรโมชั่นที่พบในภาพ',
  items: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: 'หมวดสินค้า: coffee (กาแฟซอง) หรือ noodle (บะหมี่/โจ๊ก/ข้าวต้ม)',
      },
      brand: {
        type: Type.STRING,
        description: 'ชื่อแบรนด์ เช่น เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์ หรือ มาม่า, ไวไว, ยำยำ, นิสชิน, คนอร์',
      },
      item_name: {
        type: Type.STRING,
        description: 'ชื่อสินค้าและรสชาติเต็ม เช่น เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา หรือ มาม่า รสต้มยำกุ้งน้ำข้น',
      },
      color: {
        type: Type.STRING,
        description: 'กาแฟ: สีซอง (แดง, เขียว) | บะหมี่/โจ๊ก: บรรจุภัณฑ์ (ซอง, ถ้วย/คัพ)',
      },
      pack_size: {
        type: Type.INTEGER,
        description: 'จำนวนซอง/ถ้วยต่อแพ็ค เช่น 1 (ถ้าชิ้นเดี่ยว) หรือ 4, 5, 6, 10, 40 (ถ้าเป็นแพ็ค)',
      },
      bonus_sachets: {
        type: Type.INTEGER,
        description: 'จำนวนของแถม เช่น 1 จาก 5+1 ซอง หรือ null',
      },
      promotion_type: {
        type: Type.STRING,
        description: 'ประเภทโปร เช่น ลดราคา, ซื้อ 1 แถม 1, ซื้อ 2 แถม 1, ซื้อชิ้นที่ 2 ลด 50%',
      },
      period_start: {
        type: Type.STRING,
        description: 'วันเริ่มต้นโปรโมชั่น รูปแบบ dd/mm/yyyy (ปี ค.ศ.)',
      },
      period_end: {
        type: Type.STRING,
        description: 'วันสิ้นสุดโปรโมชั่น รูปแบบ dd/mm/yyyy (ปี ค.ศ.)',
      },
      mechanic: {
        type: Type.STRING,
        description: 'ข้อความกลไกโปรโมชั่นฉบับเต็มจากป้าย เช่น ซื้อ 2 ถ้วย 25 บาท ปกติ 30 บาท',
      },
      retail_price: {
        type: Type.NUMBER,
        description: 'ราคาปกติ 1 ชิ้น/แพ็ค (บาท)',
      },
      pro_price: {
        type: Type.NUMBER,
        description: 'ราคาโปรโมชั่น 1 ชิ้น/แพ็ค (บาท)',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'ความมั่นใจ 0.0 - 1.0',
      },
    },
    required: ['category', 'brand', 'item_name', 'pack_size', 'promotion_type', 'mechanic', 'pro_price'],
  },
};

const SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญระดับสูงในการถอดรหัสป้ายราคาและโปรโมชั่นสินค้าในไทย
เป้าหมายคือสกัดข้อมูลโปรโมชั่นของ 2 กลุ่มสินค้าเท่านั้น:
1. กาแฟซอง (เฉพาะ 4 แบรนด์: เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์) -> category: "coffee"
   - บันทึกสีซองลงช่อง color: "แดง" หรือ "เขียว"
2. บะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม (ทุกแบรนด์ เช่น มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง, คนอร์, เกษตร ฯลฯ) -> category: "noodle"
   - บันทึกบรรจุภัณฑ์ลงช่อง color: "ซอง" หรือ "ถ้วย/คัพ"

กลไกราคา:
- ป้าย "ซื้อ 2 ชิ้น XX บาท": retail_price = ราคาปกติ 1 ชิ้น, pro_price = ราคาโปรเฉลี่ยต่อชิ้น
- ป้าย "ชิ้นที่สอง 1 บาท": retail_price = ราคาปกติ 1 ชิ้น, pro_price = เฉลี่ย 2 ชิ้นต่อชิ้น
- ป้าย "ลดราคา / ประหยัด X บาท": retail_price = ราคาปกติ, pro_price = ราคาลด
- แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (เช่น 2569 -> 2026) รูปแบบ dd/mm/yyyy
- หากในภาพไม่มีสินค้าใน 2 กลุ่มนี้ ให้ส่งคืน Array ว่าง [] เสมอ
`;

// ฟังก์ชันแปลงภาพให้ขนาดเล็กลงเหลือ 1800px เพื่อประหยัด Token และส่งเร็ว
function resizeImage(inputPath, outputPath) {
  try {
    execSync(`sips -Z 1800 "${inputPath}" --out "${outputPath}" > /dev/null 2>&1`);
    return outputPath;
  } catch (e) {
    return inputPath;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(b64, keys) {
  let lastErr = null;
  const models = ['gemini-2.5-flash', 'gemini-3-flash-preview'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const ai = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });
    for (const m of models) {
      try {
        const res = await ai.models.generateContent({
          model: m,
          contents: [
            {
              role: 'user',
              parts: [
                { text: SYSTEM_PROMPT },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: b64,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.0,
          },
        });

        let text = res.text?.trim() || '[]';
        if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(text);
      } catch (err) {
        lastErr = err;
        console.warn(`[Key ${i + 1}] Model ${m} Error:`, err.status || err.message?.slice(0, 80));
        if (err.status === 429) {
          console.warn(`[Key ${i + 1}] Rate limit hit! Switching to next key...`);
          break; // ข้ามไป Key ถัดไป
        }
      }
    }
  }
  throw lastErr;
}

// ยิงบันทึกลง Google Sheet ผ่าน Google Apps Script
async function saveToGas(sheetName, items, imageBase64, filename) {
  if (!items || items.length === 0) return true;

  const payload = {
    action: 'save',
    sheetName: sheetName, // 'PRT' หรือ 'NOODLE'
    secret: APPS_SCRIPT_SECRET,
    rows: items.map(item => ({
      date: item.date,
      store: item.store,
      brand: item.brand,
      itemName: item.item_name,
      color: item.color || '',
      packSize: item.pack_size || 1,
      promotion: item.promotion_type || 'ลดราคา',
      channel: 'หน้าร้าน',
      freqWeek: 1,
      period: item.period_start && item.period_end ? `${item.period_start} - ${item.period_end}` : (item.period_start || ''),
      machanic: item.mechanic || '',
      retailPrice: item.retail_price,
      proPrice: item.pro_price,
      imageId: 'img-0',
    })),
    images: [
      {
        id: 'img-0',
        base64: imageBase64,
        filename: filename,
        mimeType: 'image/jpeg',
      },
    ],
  };

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || 'Google Apps Script save failed');
  }
  return true;
}

async function main() {
  console.log('=====================================================');
  console.log('🚀 เริ่มต้นการสแกนและบันทึกโปรโมชั่นอัตโนมัติ (Batch Ingestion)');
  console.log('=====================================================');

  const keys = getApiKeys();
  console.log(`🔑 พบ Gemini API Keys จำนวน: ${keys.length} คีย์`);
  if (keys.length === 0) {
    console.error('❌ ไม่พบ GEMINI_API_KEY ในระบบ กรุณาตรวจสอบ .env.local');
    process.exit(1);
  }

  // รวมรายการไฟล์ทั้งหมด
  const allFiles = [];
  for (const f of FOLDERS) {
    if (!fs.existsSync(f.path)) continue;
    const files = fs.readdirSync(f.path)
      .filter(name => !name.startsWith('.') && /\.(jpg|jpeg|png)$/i.test(name))
      .map(name => ({
        fullPath: path.join(f.path, name),
        filename: name,
        store: f.store,
      }));
    allFiles.push(...files);
  }

  console.log(`📁 รวมรูปภาพทั้งหมดที่ต้องประมวลผล: ${allFiles.length} รูป`);

  const progress = loadProgress();
  const remainingFiles = allFiles.filter(f => !progress.processed[f.fullPath]);
  console.log(`⏳ ประมวลผลไปแล้ว: ${Object.keys(progress.processed).length} รูป, เหลืออีก: ${remainingFiles.length} รูป`);

  if (remainingFiles.length === 0) {
    console.log('🎉 ข้อมูลทั้งหมดได้รับการประมวลผลครบถ้วนแล้ว!');
    return;
  }

  const tmpResized = '/tmp/batch_curr_resize.jpg';

  for (let idx = 0; idx < remainingFiles.length; idx++) {
    const file = remainingFiles[idx];
    const currentNumber = Object.keys(progress.processed).length + 1;
    console.log(`\n-----------------------------------------------------`);
    console.log(`[${currentNumber}/${allFiles.length}] กำลังวิเคราะห์: ${file.filename} (${file.store})`);

    try {
      // 1. ปรับขนาดภาพ
      resizeImage(file.fullPath, tmpResized);
      const b64 = fs.readFileSync(tmpResized).toString('base64');

      // 2. เรียก Gemini สกัดข้อมูล
      const extracted = await callGemini(b64, keys);

      const coffeeItems = [];
      const noodleItems = [];

      for (const item of extracted) {
        // เติมข้อมูลเริ่มต้น
        item.store = file.store;
        item.date = '07/07/2026'; // วันที่รอบสำรวจราคา

        if (item.category === 'coffee') {
          coffeeItems.push(item);
        } else if (item.category === 'noodle') {
          noodleItems.push(item);
        }
      }

      console.log(`   ✨ ผลลัพธ์: พบกาแฟซอง ${coffeeItems.length} รายการ | บะหมี่/โจ๊ก ${noodleItems.length} รายการ`);

      // 3. บันทึกลง Google Sheet
      if (coffeeItems.length > 0) {
        console.log(`   📥 กำลังบันทึก ${coffeeItems.length} รายการลง Sheet [PRT]...`);
        await saveToGas('PRT', coffeeItems, b64, file.filename);
      }
      if (noodleItems.length > 0) {
        console.log(`   📥 กำลังบันทึก ${noodleItems.length} รายการลง Sheet [NOODLE]...`);
        await saveToGas('NOODLE', noodleItems, b64, file.filename);
      }

      // บันทึกความคืบหน้า
      progress.processed[file.fullPath] = {
        timestamp: new Date().toISOString(),
        coffeeCount: coffeeItems.length,
        noodleCount: noodleItems.length,
      };
      progress.savedRows = (progress.savedRows || 0) + coffeeItems.length + noodleItems.length;
      saveProgress(progress);

      console.log(`   ✅ สำเร็จ! (รวมบันทึกแล้วทั้งหมด ${progress.savedRows} แถว)`);

      // 4. หน่วงเวลา 1.2 วินาที (Paid Tier วิ่งได้เร็วและปลอดภัยต่อ Google Sheets)
      if (idx < remainingFiles.length - 1) {
        process.stdout.write('   ⏱️ รอ 1.2s...');
        await sleep(1200);
        console.log(' ต่อ');
      }

    } catch (err) {
      console.error(`   ❌ ผิดพลาดที่ไฟล์ ${file.filename}:`, err.message);
      if (err.status === 429) {
        console.error('   🚨 ทุก API Key โควตาเต็มแล้ว ระบบจะหยุดพักชั่วคราว');
        break;
      }
    }
  }

  console.log('\n=====================================================');
  console.log(`🏁 สรุปผลการประมวลผล: บันทึกข้อมูลไปแล้วทั้งหมด ${progress.savedRows} รายการ`);
  console.log('=====================================================');
}

main().catch(console.error);
