import { GoogleGenAI, Type } from '@google/genai';
import { GeminiExtractedItem, GeminiResponseSchema, PromoCategory, AiModelMode } from '@/types';

const geminiResponseSchemaConfig = {
  type: Type.ARRAY,
  description: 'รายการโปรโมชั่นที่ตรวจพบในรูปภาพ',
  items: {
    type: Type.OBJECT,
    properties: {
      store_guess: {
        type: Type.STRING,
        description: 'ชื่อร้านค้าที่สังเกตได้จากโลโก้หรือข้อความ เช่น 7-11, CJ More, Mini BigC, Lotus, Top',
      },
      brand: {
        type: Type.STRING,
        description: 'ชื่อแบรนด์ เช่น มาม่า, ไวไว, ยำยำ, นิสชิน, คนอร์ หรือ เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์',
      },
      item_name: {
        type: Type.STRING,
        description: 'ชื่อสินค้าและรสชาติเต็มตามที่เห็นในรูป เช่น มาม่า รสต้มยำกุ้งน้ำข้น, เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา',
      },
      color: {
        type: Type.STRING,
        description: 'กาแฟ: แดง หรือ เขียว หรือ แดง,เขียว | บะหมี่/โจ๊ก/ข้าวต้ม: ซอง หรือ ถ้วย/คัพ',
      },
      pack_size: {
        type: Type.INTEGER,
        description: 'จำนวนซอง/ถ้วย/ชิ้น ต่อแพ็ค เช่น 1 (ถ้าขายเดี่ยว) หรือ 4, 5, 6, 10, 40 (ถ้าเป็นแพ็ค)',
      },
      bonus_sachets: {
        type: Type.INTEGER,
        description: 'จำนวนของแถม เช่น 1 จาก 5+1 ซอง หรือ 2 จาก 40+2 ซอง หรือ null',
      },
      promotion_type: {
        type: Type.STRING,
        description: 'ประเภทโปรโมชั่น: ลดราคา, ซื้อ X แถม Y, ของแถม, ซองแถม, ราคาพิเศษเมื่อซื้อครบ, สะสมแต้ม, อื่นๆ',
      },
      period_start: {
        type: Type.STRING,
        description: 'วันเริ่มต้นโปรโมชั่น รูปแบบ dd/mm/yyyy ปี ค.ศ.',
      },
      period_end: {
        type: Type.STRING,
        description: 'วันสิ้นสุดโปรโมชั่น รูปแบบ dd/mm/yyyy ปี ค.ศ.',
      },
      mechanic: {
        type: Type.STRING,
        description: 'รายละเอียดกลไกโปรโมชั่นแบบเต็มภาษาไทย',
      },
      retail_price: {
        type: Type.NUMBER,
        description: 'ราคาปกติ ทศนิยม 2 ตำแหน่ง หรือ null',
      },
      pro_price: {
        type: Type.NUMBER,
        description: 'ราคาโปรโมชั่น ทศนิยม 2 ตำแหน่ง หรือ null',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'คะแนนความมั่นใจ 0.0 ถึง 1.0',
      },
      notes: {
        type: Type.STRING,
        description: 'หมายเหตุเพิ่มเติม เช่น ราคาต่อชิ้นที่เฉลี่ยมาจากซื้อหลายชิ้น หรือระบุว่าเป็นราคาที่คำนวณจากประหยัด X บาท',
      },
    },
    required: ['store_guess', 'brand', 'item_name', 'color', 'mechanic', 'confidence'],
  },
};

const COFFEE_SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญระดับสูงในการอ่านและถอดรหัสป้ายราคาและโบรชัวร์โปรโมชั่นของร้านสะดวกซื้อและห้างสรรพสินค้าในไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายของคุณคือ สกัดข้อมูลโปรโมชั่นของ "กาแฟซองปรุงสำเร็จ (Instant Coffee Sachets)" โดยเน้น 4 แบรนด์ที่ติดตามเป็นหลัก:
1. เนสกาแฟ (Nescafé) - สูตรสีแดง: ริช อโรมา / สูตรสีเขียว: เอสเปรสโซ โรสต์
2. มอคโคน่า (Moccona) - สูตรสีแดง: ริช แอนด์ สมูท / สูตรสีเขียว: เอสเปรสโซ
3. เบอร์ดี้ (Birdy) - สูตรสีแดง: โรบัสต้า / สูตรสีเขียว: เอสเปรสโซ
4. ซุปเปอร์ (Super) - สูตรสีแดง: ออริจินัล / สูตรสีเขียว: เอสเปรสโซ

เทคนิคการถอดรหัสป้ายโปรโมชั่นไทย:
1. ป้าย "ปกติ XX พิเศษ YY ประหยัด ZZ":
   - retail_price = XX, pro_price = YY, ระบุใน mechanic ให้ชัดเจน
2. ป้าย "ประหยัด X บาท" (ไม่มีราคาปกติ):
   - ให้คำนวณ retail_price = pro_price + X และระบุใน notes ว่า "คำนวณราคาปกติจากราคาโปรโมชั่น + ประหยัด X บาท"
3. ป้าย "ซื้อ 2 แพ็ค ฟรี 1 ซอง" หรือ "40+2 ซอง":
   - pack_size = 40 (นับเฉพาะซองหลัก), bonus_sachets = 2
4. แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (เช่น 2569 -> 2026, 69 -> 2026) หากวันที่ไม่มีปี ให้ใช้ปี 2026 ในรูปแบบ dd/mm/yyyy
5. ห้ามเดาราคา หากไม่เห็นตัวเลขราคาบนป้ายให้ใส่เป็น null
6. หากในภาพมีสินค้าหลายตัว ให้แยกออกเป็นแต่ละ Object ใน Array ให้ครบถ้วน
`;

const NOODLE_SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญระดับสูงในการอ่านและถอดรหัสป้ายราคาและโบรชัวร์โปรโมชั่นของร้านสะดวกซื้อและห้างสรรพสินค้าในไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายของคุณคือ สกัดข้อมูลโปรโมชั่นของกลุ่มสินค้าดังต่อไปนี้ ทุกแบรนด์:
1. บะหมี่กึ่งสำเร็จรูป (Instant Noodles) - ทุกแบรนด์ (มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง ฯลฯ) ทั้ง "แบบซอง" และ "แบบถ้วย/คัพ"
2. โจ๊กกึ่งสำเร็จรูป (Instant Congee/Porridge) - ทุกแบรนด์ (คนอร์, มาม่า, เกษตร ฯลฯ) ทั้ง "แบบซอง" และ "แบบถ้วย"
3. ข้าวต้มกึ่งสำเร็จรูป (Instant Rice Soup) - ทุกแบรนด์ "แบบถ้วย"

เทคนิคการถอดรหัสป้ายโปรโมชั่นไทย:
1. ป้าย "ซื้อ 2 ชิ้น XX บาท" (พบบ่อยใน 7-11):
   - ตัวอย่าง: "มาม่าคัพ ปกติถ้วยละ 15.- ซื้อ 2 ถ้วย 25.-"
   - ให้บันทึก: retail_price = 15.00 (ราคาปกติ 1 ชิ้น), pro_price = 12.50 (ราคาโปรเฉลี่ยต่อชิ้น), mechanic = "ซื้อ 2 ถ้วย 25 บาท ปกติถ้วยละ 15 บาท (ประหยัด 5 บาท)"
2. ป้าย "ชิ้นที่สอง 1 บาท":
   - ตัวอย่าง: "ชิ้นแรก 20 บาท ชิ้นที่สอง 1 บาท"
   - ให้บันทึก: retail_price = 20.00, pro_price = 10.50 (เฉลี่ยชิ้นละ 10.50 บาท), mechanic = "ชิ้นที่สอง 1 บาท เมื่อซื้อ 2 ชิ้น รวม 21 บาท (ปกติ 40 บาท)"
3. ป้าย "แพ็ค / ลัง":
   - สังเกตตัวเลขจำนวนซองในแพ็ค เช่น "แพ็ค 5 ซอง", "แพ็ค 6 ถ้วย", "แพ็ค 10 ซอง" ➔ ให้ใส่ pack_size เป็นจำนวนนั้น
   - หากเป็นซองหรือถ้วยเดี่ยว ➔ pack_size = 1
4. บรรจุภัณฑ์ (ฟิลด์ color): ระบุชัดเจนว่า "ซอง" หรือ "ถ้วย/คัพ"
5. ชื่อสินค้าและรสชาติ: สกัดชื่อรสชาติให้ครบถ้วน เช่น "มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น", "คนอร์ คัพโจ๊ก รสหมู", "ไวไว บะหมี่กึ่งสำเร็จรูป รสหมูสับต้มยำ"
6. แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (เช่น 2569 -> 2026) หากวันที่ไม่มีปี ให้ใช้ปี 2026 ในรูปแบบ dd/mm/yyyy
7. สกัดสินค้าทุกรายการในหมวดบะหมี่ โจ๊ก ข้าวต้ม ที่ปรากฏในภาพออกมาให้ครบถ้วน
`;

function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean));
  }
  if (process.env.GEMINI_API_KEY) {
    const split = process.env.GEMINI_API_KEY.split(',').map((k) => k.trim()).filter(Boolean);
    for (const k of split) {
      if (!keys.includes(k) && k !== 'your-gemini-api-key') keys.push(k);
    }
  }
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (k && !keys.includes(k) && k !== 'your-gemini-api-key') keys.push(k);
  }
  return keys;
}

export async function extractPromotionFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  category: PromoCategory = 'coffee',
  modelMode: AiModelMode = 'flash'
): Promise<GeminiExtractedItem[]> {
  const apiKeys = getGeminiApiKeys();
  if (apiKeys.length === 0) {
    console.warn('ไม่พบ GEMINI_API_KEY ที่ถูกต้อง กำลังคืนค่าข้อมูลจำลองสำหรับการทดสอบ (Mock Demo)');
    if (category === 'noodle') {
      return [
        {
          store_guess: '7-11',
          brand: 'มาม่า',
          item_name: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น 60 กรัม',
          color: 'ซอง',
          pack_size: 1,
          bonus_sachets: null,
          promotion_type: 'ลดราคา',
          period_start: '06/11/2026',
          period_end: '08/11/2026',
          mechanic: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น 60 กรัม ปกติ 7 บาท พิเศษ 2 ซอง 13 บาท ประหยัด 1 บาท',
          retail_price: 7.0,
          pro_price: 6.5,
          confidence: 0.95,
          notes: '(โหมดทดสอบจำลอง: บะหมี่กึ่งสำเร็จรูป)',
        },
      ];
    }
    return [
      {
        store_guess: 'Mini BigC',
        brand: 'เนสกาแฟ',
        item_name: 'เนสกาแฟ เบลนด์ แอนด์ บรู กาแฟปรุงสำเร็จ',
        color: 'แดง,เขียว',
        pack_size: 40,
        bonus_sachets: 2,
        promotion_type: 'ลดราคา',
        period_start: '06/11/2026',
        period_end: '08/11/2026',
        mechanic:
          'เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา 40+2 ซอง และ เอสเปรสโซ โรสต์ 40 ซอง ปกติ 176 บาท 155/แพ็ค ประหยัด 21 บาท ซื้อ 2 แพ็ค ฟรี 1 ซอง',
        retail_price: 176.0,
        pro_price: 155.0,
        confidence: 0.95,
        notes: '(โหมดทดสอบจำลอง: กาแฟซอง)',
      },
    ];
  }

  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const promptText = category === 'noodle' ? NOODLE_SYSTEM_PROMPT : COFFEE_SYSTEM_PROMPT;
  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
  ];

  let lastError: unknown = null;

  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const currentKey = apiKeys[keyIdx];
    const ai = new GoogleGenAI({
      apiKey: currentKey,
      apiVersion: 'v1beta',
    });

    for (const modelToUse of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelToUse,
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                {
                  text: `โปรดวิเคราะห์รูปโปรโมชั่นนี้ในหมวด "${
                    category === 'noodle' ? 'บะหมี่ โจ๊ก ข้าวต้ม' : 'กาแฟซอง'
                  }" อย่างละเอียด โดยถอดรหัสป้ายราคา รสชาติ บรรจุภัณฑ์ และกลไกโปรโมชั่นให้ถูกต้องแม่นยำที่สุด แล้วส่งคืนเฉพาะ JSON Array ตามสกีมาที่กำหนด`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: geminiResponseSchemaConfig,
            temperature: 0.0,
          },
        });

        let responseText = response.text?.trim() || '[]';
        if (responseText.startsWith('```json')) {
          responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (responseText.startsWith('```')) {
          responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        const parsedJson = JSON.parse(responseText);
        const validated = GeminiResponseSchema.parse(parsedJson);
        return validated;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Key ${keyIdx + 1}] Model ${modelToUse} failed:`, err?.status || err?.message?.slice(0, 80));
        if (err?.status === 429) {
          // โควตาเต็ม ให้ข้ามไป Key ถัดไปทันที
          break;
        }
      }
    }
  }

  throw new Error(
    `ไม่สามารถอ่านข้อมูลโปรโมชั่นจากรูปภาพได้: ${
      lastError instanceof Error ? lastError.message : 'เกิดข้อผิดพลาดในการเรียก AI'
    }`
  );
}
