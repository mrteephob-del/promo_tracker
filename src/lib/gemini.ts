import { GoogleGenAI, Type } from '@google/genai';
import { GeminiExtractedItem, GeminiResponseSchema, PromoCategory } from '@/types';

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
        description: 'ชื่อแบรนด์ เช่น มาม่า, ไวไว, ยำยำ, นิสชิน, คนอร์ หรือ เนสกาแฟ, มอคโคน่า',
      },
      item_name: {
        type: Type.STRING,
        description: 'ชื่อสินค้าและรสชาติเต็มตามที่เห็นในรูป เช่น มาม่า รสต้มยำกุ้ง, คนอร์ คัพโจ๊ก รสหมู',
      },
      color: {
        type: Type.STRING,
        description: 'กาแฟ: แดง หรือ เขียว หรือ แดง,เขียว | บะหมี่/โจ๊ก/ข้าวต้ม: ซอง หรือ ถ้วย/คัพ',
      },
      pack_size: {
        type: Type.INTEGER,
        description: 'จำนวนซอง/ถ้วย/ชิ้น ต่อแพ็ค เช่น 1 (ถ้าขายเดี่ยว) หรือ 4, 5, 6, 10 (ถ้าเป็นแพ็ค)',
      },
      bonus_sachets: {
        type: Type.INTEGER,
        description: 'จำนวนของแถม เช่น 1 จากข้อความ 5+1 ซอง หรือ null',
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
        description: 'หมายเหตุเพิ่มเติม เช่น ชนิดบรรจุภัณฑ์ (ซอง หรือ ถ้วย) หรือราคาที่คำนวณจากประหยัด X บาท',
      },
    },
    required: ['store_guess', 'brand', 'item_name', 'color', 'mechanic', 'confidence'],
  },
};

const COFFEE_SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญการอ่านและวิเคราะห์รูปภาพโปรโมชั่นของร้านสะดวกซื้อและซูเปอร์มาร์เก็ตในประเทศไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายของคุณคือ สกัดข้อมูลโปรโมชั่นของ "กาแฟซองปรุงสำเร็จ (Instant Coffee Sachets)" โดยเน้น 4 แบรนด์ที่ติดตามเป็นหลัก:
1. เนสกาแฟ (Nescafé)
2. มอคโคน่า (Moccona)
3. เบอร์ดี้ (Birdy)
4. ซุปเปอร์ (Super)

กฎสำคัญ:
1. แปลงปี พ.ศ. เป็น ค.ศ. (เช่น 2569 เป็น 2026) ถ้าไม่มีปีให้ใช้ปีปัจจุบัน (2026) รูปแบบ dd/mm/yyyy
2. ห้ามเดาราคา หากไม่เห็นให้เป็น null
3. ขนาดแพ็ค: กรณีมีซองแถม เช่น "40+2 ซอง" ให้ใส่ pack_size = 40 และ bonus_sachets = 2
4. กรณีบอกเฉพาะ "ประหยัด X บาท": คำนวณราคาปกติ = ราคาโปร + X และระบุใน notes
5. สีซอง (color): "แดง", "เขียว", "แดง,เขียว"
6. รายละเอียดกลไกโปร (mechanic): เขียนภาษาไทยครบถ้วนตามรูป
7. หากพบกาแฟซองแบรนด์อื่น หรือสินค้าโปรโมชั่นอื่นที่เด่นชัด ให้สกัดออกมาด้วยโดยใส่ชื่อแบรนด์จริงตามที่เห็น
`;

const NOODLE_SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญการอ่านและวิเคราะห์รูปภาพโปรโมชั่นของร้านสะดวกซื้อและซูเปอร์มาร์เก็ตในประเทศไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายของคุณคือ สกัดข้อมูลโปรโมชั่นของกลุ่มสินค้าดังต่อไปนี้ ทุกแบรนด์:
1. บะหมี่กึ่งสำเร็จรูป (Instant Noodles) - ทุกแบรนด์ (มาม่า, ไวไว, ยำยำ, นิสชิน, ซัมยัง ฯลฯ) ทั้ง "แบบซอง" และ "แบบถ้วย/คัพ"
2. โจ๊กกึ่งสำเร็จรูป (Instant Congee/Porridge) - ทุกแบรนด์ (คนอร์, มาม่า, เกษตร ฯลฯ) ทั้ง "แบบซอง" และ "แบบถ้วย"
3. ข้าวต้มกึ่งสำเร็จรูป (Instant Rice Soup) - ทุกแบรนด์ "แบบถ้วย"

กฎสำคัญ:
1. แปลงปี พ.ศ. เป็น ค.ศ. (เช่น 2569 เป็น 2026) ถ้าไม่มีปีให้ใช้ปีปัจจุบัน (2026) รูปแบบ dd/mm/yyyy
2. ห้ามเดาราคา หากไม่เห็นให้เป็น null
3. บรรจุภัณฑ์ (ฟิลด์ color): ให้ระบุชัดเจนว่า "ซอง" หรือ "ถ้วย/คัพ"
4. ขนาดแพ็ค (pack_size): หากขายแยกเดี่ยว (เช่น 1 ซอง/1 ถ้วย) ให้ใส่ pack_size = 1 หากเป็นแพ็ค (เช่น แพ็ค 5 ซอง, แพ็ค 6 ถ้วย) ให้ใส่จำนวนชิ้นในแพ็ค
5. รายละเอียดกลไกโปร (mechanic): เขียนภาษาไทยครบถ้วน เช่น "มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น 60 กรัม แพ็ค 10 ซอง ปกติ 67 บาท พิเศษ 59 บาท ประหยัด 8 บาท" หรือ "คนอร์ คัพโจ๊ก รสหมู 35 กรัม 1 ถ้วย ปกติ 18 บาท พิเศษ 2 ถ้วย 32 บาท"
6. กรณีบอกเฉพาะ "ประหยัด X บาท": คำนวณราคาปกติ = ราคาโปร + X
7. สกัดสินค้าทุกรายการในหมวดบะหมี่ โจ๊ก ข้าวต้ม ที่ปรากฏในรูปภาพให้ครบถ้วนทุกรายการ
`;

export async function extractPromotionFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  category: PromoCategory = 'coffee'
): Promise<GeminiExtractedItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
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
          retail_price: 14.0,
          pro_price: 13.0,
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

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
  });

  const promptText = category === 'noodle' ? NOODLE_SYSTEM_PROMPT : COFFEE_SYSTEM_PROMPT;

  const callModel = async (): Promise<GeminiExtractedItem[]> => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            { text: `โปรดวิเคราะห์รูปโปรโมชั่นนี้ในหมวด "${category === 'noodle' ? 'บะหมี่ โจ๊ก ข้าวต้ม' : 'กาแฟซอง'}" และส่งคืนเฉพาะ JSON Array ตามสกีมาที่กำหนด` },
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
        temperature: 0.1,
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
  };

  try {
    return await callModel();
  } catch (firstError) {
    console.warn('Gemini extraction attempt 1 failed, retrying once...', firstError);
    try {
      return await callModel();
    } catch (retryError) {
      console.error('Gemini extraction retry failed:', retryError);
      throw new Error(
        `ไม่สามารถอ่านข้อมูลโปรโมชั่นจากรูปภาพได้: ${
          retryError instanceof Error ? retryError.message : 'รูปแบบข้อมูลไม่ถูกต้อง'
        }`
      );
    }
  }
}
