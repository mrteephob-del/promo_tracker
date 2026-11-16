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

const STORE_DECODING_RULES = `
=== คู่มือถอดรหัสป้ายราคาและเลย์เอาต์เฉพาะของแต่ละห้าง (Store-Specific Layout Rules) ===

1. [CJ More (ซีเจ มอร์ / CJ Express)]:
   - กลไก "ซื้อ 2 ชิ้น... บาท" / "ซื้อคู่ถูกกว่า":
     * รูปแบบป้าย: ป้ายสีส้ม/เขียว/เหลือง มักมีตัวเลขขนาดใหญ่เด่นชัด
     * ข้อควรระวังสูงสุด: ตัวเลขตัวใหญ่สุดบนป้าย CJ มักเป็น "ราคารวมเมื่อซื้อ 2 ชิ้น" ไม่ใช่ราคาต่อชิ้นเดี่ยว!
     * ตัวอย่าง 1: "ซื้อ 2 ชิ้น 23 บาท ปกติ 1 ชิ้น 28 บาท" (หรือ ปกติ 2 ชิ้น 28 บาท)
       -> pro_price = 11.50 บาท (คำนวณราคาเฉลี่ยต่อชิ้น 23 / 2 = 11.50)
       -> retail_price = 14.00 หรือ 28.00 บาท (ตามที่ระบุบนป้าย)
       -> mechanic = "ซื้อ 2 ชิ้น 23 บาท ปกติ 28 บาท (เฉลี่ยชิ้นละ 11.50 บาท)"
     * ตัวอย่าง 2: "เบอร์ดี้ กาแฟกระป๋อง ซื้อ 2 ชิ้น 17 บาท ปกติ 26 บาท"
       -> pro_price = 8.50 บาท (17 / 2)
       -> retail_price = 26.00 บาท (หรือ 13.00 บาทต่อกระป๋อง)
       -> mechanic = "ซื้อ 2 ชิ้น 17 บาท ปกติ 26 บาท (เฉลี่ยชิ้นละ 8.50 บาท)"
   - กลไก "1 แถม 1":
     * ตัวอย่าง: "1 แถม 1 108.- ปกติ 154.-"
       -> pro_price = 54.00 บาท (108 / 2 เฉลี่ยชิ้นละ 54.00 บาท)
       -> retail_price = 154.00 บาท
       -> mechanic = "1 แถม 1 108.- ปกติ 154.- (เฉลี่ยชิ้นละ 54.00 บาท)"

2. [Mini BigC (มินิ บิ๊กซี)]:
   - ป้าย "ยิ่งซื้อ ยิ่งถูก":
     * เลย์เอาต์: ตัวเลข 3 บรรทัด (จำนวนชิ้นขั้นต่ำ, ราคารวม, ราคาปกติ) และมีบรรทัดเล็กเขียนว่า "เฉลี่ยชิ้นละ/ถ้วยละ XX บาท"
     * ตัวอย่าง: "ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 25 บาท ปกติ 14 บาท เฉลี่ยถ้วยละ 12.50 บาท"
       -> pro_price = 12.50 บาท (ให้ใช้ราคาเฉลี่ยต่อชิ้นที่ป้ายคำนวณไว้ให้โดยตรง)
       -> retail_price = 14.00 บาท (ราคาปกติ 1 ชิ้น)
       -> mechanic = "ยิ่งซื้อ ยิ่งถูก 2 ถ้วย 25 บาท ปกติ 14 บาท เฉลี่ยถ้วยละ 12.50 บาท"
   - ป้ายเหลือง "ราคาพิเศษ / ถูกจริง":
     * บรรทัดบนขีดฆ่าราคาปกติ บรรทัดล่างตัวเลขใหญ่คือ pro_price

3. [Lotus's / Lotus's go fresh (โลตัส / โลตัส โกเฟรช)]:
   - ป้ายเหลือง "ลดแรง" / สมาชิก My Lotus's:
     * หากบนป้ายมี 2 ระดับราคา (ราคาโปรโมชั่นทั่วไป vs ราคาสมาชิก My Lotus's / Club Card):
       -> ให้เลือกราคาโปรที่ถูกที่สุด (มักเป็นราคาสมาชิก) เป็น pro_price
       -> ระบุใน notes ว่า "ราคาเฉพาะสมาชิก My Lotus's"
       -> mechanic = "ปกติ 126.- พิเศษ 116.- สมาชิก My Lotus's 108.-"
   - ป้าย "ซื้อ 2 ฟรี 1":
     * ซื้อ 3 ชิ้น จ่ายเพียง 2 ชิ้น -> pro_price = (retail_price * 2) / 3

4. [7-Eleven (เซเว่น อีเลฟเว่น)]:
   - ป้าย "ซื้อ 2 ชิ้นสุดคุ้ม / จับคู่ประหยัด":
     * เช่น "ปกติ 15.- ซื้อ 2 ชิ้น 25.-" -> pro_price = 12.50 บาท, retail_price = 15.00 บาท
   - ป้าย "ชิ้นที่สอง 1 บาท":
     * เช่น "ชิ้นแรก 20 บาท ชิ้นที่สอง 1 บาท" -> รวม 2 ชิ้นจ่าย 21 บาท
     -> pro_price = 10.50 บาท (21 / 2)
     -> retail_price = 20.00 บาท
     -> mechanic = "ชิ้นที่สอง 1 บาท เมื่อซื้อ 2 ชิ้น รวม 21 บาท (ปกติ 40 บาท)"
   - ป้าย "All Member ลดเพิ่ม":
     -> ให้ใช้ราคาโปรโมชั่น All Member เป็น pro_price

=== กฎการรับมือกับรูปภาพไม่ชัด แสงสะท้อน ป้ายเอียง หรือตัวเลขเลือนราง (OCR Reasoning & Sanity Check) ===
1. เทคนิค Cross-Check ด้วยข้อความ "ประหยัด X บาท":
   - หากราคาปกติเบลอหรือไม่มี แต่เห็นตัวเลขราคาโปร 155.- และมีข้อความ "ประหยัด 21 บาท"
     -> คำนวณราคาปกติ: retail_price = 155 + 21 = 176.00 บาท
   - หากเห็นราคาปกติ 20.- และมีข้อความ "ประหยัด 5 บาท"
     -> คำนวณราคาโปร: pro_price = 20 - 5 = 15.00 บาท
2. ตรวจสอบความสมเหตุสมผลตามหมวดสินค้า (Price Sanity Range):
   - กาแฟกระป๋องพร้อมดื่ม: ปกติ 15 - 26 บ., โปร 8.50 - 20 บ.
   - กาแฟซอง 15-27 ซอง: ปกติ 70 - 140 บ., โปร 50 - 116 บ.
   - กาแฟซอง 40-60 ซอง: ปกติ 150 - 240 บ., โปร 120 - 190 บ.
   - บะหมี่ซองเดี่ยว: ปกติ 6 - 15 บ., โปร 5 - 12 บ.
   - บะหมี่แพ็ค 5-10 ซอง: ปกติ 30 - 65 บ., โปร 22 - 50 บ.
   - บะหมี่คัพ / โจ๊กคัพ: ปกติ 13 - 22 บ., โปร 7.50 - 16 บ.
   * หากตัวเลขที่อ่านได้อยู่นอกช่วงสมเหตุสมผล (เช่น กาแฟแพ็ค 40 ซอง อ่านได้ 17.60 บาท หรือ 1.55 บาท) ให้ตรวจสอบจุดทศนิยมใหม่ เพราะความจริงน่าจะเป็น 176.00 หรือ 155.00 บาท
3. การประเมินคะแนนความมั่นใจ (Confidence Scoring):
   - อ่านตัวเลขและป้ายได้ชัดเจน 100% -> confidence = 0.90 - 1.00
   - ภาพเบลอเล็กน้อย มีแสงสะท้อน หรือต้องคำนวณย้อนกลับจากคำว่า "ประหยัด" -> confidence = 0.65 - 0.85 (พร้อมระบุจุดที่เลือนรางใน notes)
   - ป้ายเบลอมากจนไม่เห็นตัวเลขราคาเลย -> retail_price = null, pro_price = null, confidence < 0.5 (ห้ามเดาตัวเลขขึ้นมาเอง)
`;

const COFFEE_SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญระดับสูงในการอ่านและถอดรหัสป้ายราคาและโบรชัวร์โปรโมชั่นของร้านสะดวกซื้อและห้างสรรพสินค้าในไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายของคุณคือ สกัดข้อมูลโปรโมชั่นของ "กาแฟซองปรุงสำเร็จ (Instant Coffee Sachets)" และ "กาแฟพร้อมดื่ม (RTD Canned Coffee)" โดยเน้น 4 แบรนด์หลัก:
1. เนสกาแฟ (Nescafé) - สูตรสีแดง: ริช อโรมา / สูตรสีเขียว: เอสเปรสโซ โรสต์
2. มอคโคน่า (Moccona) - สูตรสีแดง: ริช แอนด์ สมูท / สูตรสีเขียว: เอสเปรสโซ
3. เบอร์ดี้ (Birdy) - สูตรสีแดง: โรบัสต้า / สูตรสีเขียว: เอสเปรสโซ / กาแฟกระป๋องพร้อมดื่ม
4. ซุปเปอร์ (Super) - สูตรสีแดง: ออริจินัล / สูตรสีเขียว: เอสเปรสโซ

${STORE_DECODING_RULES}

กฎทั่วไปเพิ่มเติม:
1. ป้าย "ซื้อ 2 แพ็ค ฟรี 1 ซอง" หรือ "40+2 ซอง": pack_size = 40 (นับเฉพาะซองหลัก), bonus_sachets = 2
2. แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (เช่น 2569 -> 2026, 69 -> 2026) หากวันที่ไม่มีปี ให้ใช้ปี 2026 ในรูปแบบ dd/mm/yyyy
3. หากในภาพมีสินค้ากาแฟหลายตัว ให้แยกออกเป็นแต่ละ Object ใน Array ให้ครบถ้วน
`;

const NOODLE_SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญระดับสูงในการอ่านและถอดรหัสป้ายราคาและโบรชัวร์โปรโมชั่นของร้านสะดวกซื้อและห้างสรรพสินค้าในไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายของคุณคือ สกัดข้อมูลโปรโมชั่นของกลุ่มสินค้าดังต่อไปนี้ ทุกแบรนด์:
1. บะหมี่กึ่งสำเร็จรูป (Instant Noodles) - ทุกแบรนด์ (มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง ฯลฯ) ทั้ง "แบบซอง" และ "แบบถ้วย/คัพ"
2. โจ๊กกึ่งสำเร็จรูป (Instant Congee/Porridge) - ทุกแบรนด์ (คนอร์, มาม่า, เกษตร ฯลฯ) ทั้ง "แบบซอง" และ "แบบถ้วย"
3. ข้าวต้มกึ่งสำเร็จรูป (Instant Rice Soup) - ทุกแบรนด์ "แบบถ้วย"

${STORE_DECODING_RULES}

กฎทั่วไปเพิ่มเติม:
1. สังเกตตัวเลขจำนวนซองในแพ็ค เช่น "แพ็ค 5 ซอง", "แพ็ค 6 ถ้วย", "แพ็ค 10 ซอง" -> ให้ใส่ pack_size เป็นจำนวนนั้น หากเป็นซองหรือถ้วยเดี่ยว -> pack_size = 1
2. บรรจุภัณฑ์ (ฟิลด์ color): ระบุชัดเจนว่า "ซอง" หรือ "ถ้วย/คัพ"
3. ชื่อสินค้าและรสชาติ: สกัดชื่อรสชาติให้ครบถ้วน เช่น "มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น", "คนอร์ คัพโจ๊ก รสหมู", "ไวไว บะหมี่กึ่งสำเร็จรูป รสหมูสับต้มยำ"
4. แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (เช่น 2569 -> 2026) หากวันที่ไม่มีปี ให้ใช้ปี 2026 ในรูปแบบ dd/mm/yyyy
5. สกัดสินค้าทุกรายการในหมวดบะหมี่ โจ๊ก ข้าวต้ม ที่ปรากฏในภาพออกมาให้ครบถ้วน
`;

export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim()) keys.push(localKey.trim());
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    const split = process.env.NEXT_PUBLIC_GEMINI_API_KEY.split(',').map((k) => k.trim()).filter(Boolean);
    for (const k of split) {
      if (!keys.includes(k) && k !== 'your-gemini-api-key') keys.push(k);
    }
  }
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

/**
 * ตรวจสอบความถูกต้องทางคณิตศาสตร์และปรับค่าราคาโปรโมชั่นให้อัตโนมัติ (Deterministic Price Sanitizer)
 * ป้องกันกรณี AI สับสนระหว่าง "ราคารวมมัด" กับ "ราคาเฉลี่ยต่อหน่วย" หรือสลับช่องราคาปกติกับโปรโมชั่น
 */
export function sanitizePromotionPricing(item: GeminiExtractedItem): GeminiExtractedItem {
  let retail = item.retail_price;
  let pro = item.pro_price;
  let mechanic = item.mechanic || '';
  let notes = item.notes || '';

  // 1. ตรวจสอบกรณีสลับช่อง: ราคาปกติ (retail_price) ต้องมากกว่าราคาโปรโมชั่น (pro_price) เสมอ
  if (retail !== null && pro !== null && retail > 0 && pro > 0 && retail < pro) {
    const temp = retail;
    retail = pro;
    pro = temp;
    notes = (notes ? notes + ' | ' : '') + 'สลับราคาปกติ/โปรให้ถูกต้อง';
  }

  // 2. ตรวจสอบ Bundle Price เช่น "ซื้อ 2 ชิ้น 23 บาท" แต่ AI เผลอใส่ pro_price = 23.00
  const bundleMatch = mechanic.match(/ซื้อ\s*(\d+)\s*(?:ชิ้น|ถ้วย|ซอง|กระป๋อง|แพ็ค)\s*(\d+(?:\.\d+)?)\s*บาท/i);
  if (bundleMatch && pro !== null) {
    const qty = parseInt(bundleMatch[1], 10);
    const bundlePrice = parseFloat(bundleMatch[2]);
    if (qty > 1 && Math.abs(pro - bundlePrice) < 0.05) {
      const unitProPrice = Number((bundlePrice / qty).toFixed(2));
      pro = unitProPrice;
      notes = (notes ? notes + ' | ' : '') + `ปรับราคาโปรเป็นเฉลี่ยต่อหน่วย (${unitProPrice} บ.)`;
    }
  }

  // 3. ตรวจสอบกลไก "1 แถม 1" เช่น "1 แถม 1 108.- ปกติ 154.-" แต่ AI ใส่ pro_price = 108.00
  if (/1\s*แถม\s*1/i.test(mechanic) && pro !== null && retail !== null) {
    const bogoMatch = mechanic.match(/1\s*แถม\s*1\s*(\d+(?:\.\d+)?)/i);
    if (bogoMatch) {
      const bogoPrice = parseFloat(bogoMatch[1]);
      if (Math.abs(pro - bogoPrice) < 0.05 && pro > retail / 2) {
        const unitProPrice = Number((bogoPrice / 2).toFixed(2));
        pro = unitProPrice;
        notes = (notes ? notes + ' | ' : '') + `ปรับราคาโปรเป็นเฉลี่ยต่อชิ้น (${unitProPrice} บ.) จาก 1แถม1`;
      }
    }
  }

  // 4. ตรวจสอบข้อความ "ประหยัด X บาท" หากไม่มีราคาปกติ
  if ((retail === null || retail === 0) && pro !== null && pro > 0) {
    const saveMatch = mechanic.match(/ประหยัด\s*(\d+(?:\.\d+)?)\s*บาท/i);
    if (saveMatch) {
      const saving = parseFloat(saveMatch[1]);
      retail = Number((pro + saving).toFixed(2));
      notes = (notes ? notes + ' | ' : '') + `คำนวณราคาปกติจากราคาโปร + ประหยัด ${saving} บ.`;
    }
  }

  return {
    ...item,
    retail_price: retail !== null ? Number(retail.toFixed(2)) : null,
    pro_price: pro !== null ? Number(pro.toFixed(2)) : null,
    mechanic,
    notes: notes || null,
  };
}

export async function extractPromotionFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  category: PromoCategory = 'coffee',
  modelMode: AiModelMode = 'flash',
  targetStore?: string
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
                  }" อย่างละเอียด โดยถอดรหัสป้ายราคา รสชาติ บรรจุภัณฑ์ และกลไกโปรโมชั่นให้ถูกต้องแม่นยำที่สุดตามกฎเฉพาะของห้าง แล้วส่งคืนเฉพาะ JSON Array ตามสกีมาที่กำหนด${
                    targetStore && targetStore !== 'auto'
                      ? `\n\n[คำแนะนำเน้นพิเศษ: ผู้ใช้งานระบุว่าป้ายราคาหรือโบรชัวร์นี้มาจากห้าง "${targetStore}" โปรดใช้กฎการถอดรหัสและรูปแบบป้ายของ ${targetStore} เป็นหลัก]`
                      : ''
                  }`,
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
        return validated.map(sanitizePromotionPricing);
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
