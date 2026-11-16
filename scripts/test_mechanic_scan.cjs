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

const testFiles = [
  '/Users/teephobwirachowatin/Pictures/Promo Facebook/CJ More/IMG_8694.JPG',
  '/Users/teephobwirachowatin/Pictures/Promo Facebook/CJ More/IMG_8695.JPG',
];

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

async function testScan() {
  const ai = new GoogleGenAI({ apiKey: keys[0], apiVersion: 'v1beta' });
  const tmpResized = '/tmp/tmp_mechanic_test.jpg';

  for (const fp of testFiles) {
    console.log(`\nTesting file: ${path.basename(fp)}`);
    if (!fs.existsSync(fp)) {
      console.error(`File does not exist: ${fp}`);
      continue;
    }
    resizeImage(fp, tmpResized);
    const b64 = fs.readFileSync(tmpResized).toString('base64');
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

    console.log('Result:', JSON.stringify(JSON.parse(res.text), null, 2));
  }
}

testScan().catch(console.error);
