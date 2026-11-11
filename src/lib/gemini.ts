import { GoogleGenAI, Type } from '@google/genai';
import { GeminiExtractedItem, GeminiResponseSchema } from '@/types';

const geminiResponseSchemaConfig = {
  type: Type.ARRAY,
  description: 'รายการโปรโมชั่นกาแฟซองที่ตรวจพบในรูปภาพ',
  items: {
    type: Type.OBJECT,
    properties: {
      store_guess: {
        type: Type.STRING,
        description: 'ชื่อร้านค้าที่สังเกตได้จากโลโก้หรือข้อความ เช่น 7-11, CJ More, Mini BigC, Lotus, Top',
      },
      brand: {
        type: Type.STRING,
        description: 'ชื่อแบรนด์กาแฟซอง ภาษาไทย: เนสกาแฟ, มอคโคน่า, เบอร์ดี้, หรือ ซุปเปอร์ หากเป็นแบรนด์อื่นให้ใส่ชื่อแบรนด์ตามจริง',
      },
      item_name: {
        type: Type.STRING,
        description: 'ชื่อสินค้าเต็มตามที่เห็นในรูป',
      },
      color: {
        type: Type.STRING,
        description: 'สีซอง: แดง หรือ เขียว หรือ แดง,เขียว',
      },
      pack_size: {
        type: Type.INTEGER,
        description: 'จำนวนซองต่อแพ็ค (ตัวเลขอย่างเดียว เช่น 40 ไม่นับซองแถม)',
      },
      bonus_sachets: {
        type: Type.INTEGER,
        description: 'จำนวนซองแถม เช่น 2 จากข้อความ 40+2 ซอง',
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
        description: 'หมายเหตุเพิ่มเติม เช่น ระบุว่าเป็นราคาที่คำนวณจากประหยัด X บาท',
      },
    },
    required: ['store_guess', 'brand', 'item_name', 'color', 'mechanic', 'confidence'],
  },
};

const SYSTEM_PROMPT = `
คุณเป็นผู้เชี่ยวชาญการอ่านและวิเคราะห์รูปภาพโปรโมชั่นของร้านสะดวกซื้อและซูเปอร์มาร์เก็ตในประเทศไทย (เช่น 7-11, CJ More, Mini BigC, Lotus, Top)
เป้าหมายหลักของคุณคือ สกัดข้อมูลโปรโมชั่นของ "กาแฟซองปรุงสำเร็จ (Instant Coffee Sachets)" โดยเน้น 4 แบรนด์ที่ติดตามเป็นหลัก:
1. เนสกาแฟ (Nescafé)
2. มอคโคน่า (Moccona)
3. เบอร์ดี้ (Birdy)
4. ซุปเปอร์ (Super)

กฎสำคัญในการสกัดข้อมูล:
1. แปลงปี พ.ศ. เป็น ค.ศ.: ถ้าในรูปภาพระบุปีเป็น พ.ศ. (เช่น 2569, 69) ให้แปลงเป็น ค.ศ. (2026) เสมอ
2. วันที่ไม่มีปี: หากวันที่ระบุเฉพาะวันและเดือน เช่น 06/11 หรือ 6 พ.ย. ให้เติมปีปัจจุบัน (2026)
3. รูปแบบวันที่: period_start และ period_end ต้องอยู่ในรูปแบบ dd/mm/yyyy เสมอ เช่น 06/11/2026
4. ห้ามเดาราคา: หากในรูปไม่ปรากฏราคาปกติหรือราคาโปรโมชั่น ให้ใส่เป็น null ห้ามคิดราคาขึ้นมาเอง
5. ขนาดแพ็ค: กรณีมีซองแถม เช่น "40+2 ซอง" ให้ใส่ pack_size = 40 และ bonus_sachets = 2 (pack_size นับเฉพาะซองปกติ)
6. กรณีบอกเฉพาะ "ประหยัด X บาท": หากรูปบอกราคาโปรโมชั่นและระบุว่า "ประหยัด X บาท" ให้คำนวณราคาปกติ = ราคาโปรโมชั่น + X และระบุใน notes ว่า "คำนวณราคาปกติจากราคาโปรโมชั่น + ประหยัด X บาท"
7. สีซอง (color):
   - "แดง": สูตรเข้มข้น / ริช อโรมา / สีแดง
   - "เขียว": สูตรเอสเปรสโซ โรสต์ / น้ำตาลน้อย / สีเขียว
   - "แดง,เขียว": หากโปรโมชั่นนั้นครอบคลุมทั้งสูตรสีแดงและสูตรสีเขียวพร้อมกัน
8. รายละเอียดกลไกโปร (mechanic): เขียนสรุปเป็นภาษาไทยอย่างครบถ้วนตามข้อความและตัวเลขที่เห็นในรูป เช่น:
   "เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา 40+2 ซอง และ เอสเปรสโซ โรสต์ 40 ซอง ปกติ 176 บาท 155/แพ็ค ประหยัด 21 บาท ซื้อ 2 แพ็ค ฟรี 1 ซอง"
9. ร้านค้า (store_guess): สังเกตจากโลโก้ หัวใบปลิว หรือลายน้ำ เช่น 7-11, CJ More, Mini BigC, Lotus, Top หากไม่ชัดเจนให้ระบุ "ไม่ทราบร้าน"
10. แบรนด์อื่น: หากพบสินค้ากาแฟซองในภาพที่เป็นแบรนด์อื่นนอกเหนือจาก 4 แบรนด์ข้างต้น ให้ดึงข้อมูลมาด้วยเช่นกัน โดยใส่ชื่อแบรนด์จริงตามที่เห็น เพื่อให้ระบบแจ้งเตือนผู้ใช้
11. หากในภาพมีสินค้าหลายตัวหรือหลายโปรโมชั่น ให้แยกออกเป็นแต่ละ Object ใน Array ให้ครบถ้วน
`;

export async function extractPromotionFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiExtractedItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    console.warn('ไม่พบ GEMINI_API_KEY ที่ถูกต้อง กำลังคืนค่าข้อมูลจำลองสำหรับการทดสอบ (Mock Demo)');
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
        notes: '(โหมดทดสอบจำลอง: ยังไม่ได้ตั้งค่า GEMINI_API_KEY) คำนวณราคาปกติจากราคาโปรโมชั่น + ประหยัด 21 บาท',
      },
    ];
  }

  // ตัด data URL prefix ออกถ้ามี
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
  });

  // ฟังก์ชันย่อยสำหรับเรียก API และ Validate ด้วย Zod
  const callModel = async (): Promise<GeminiExtractedItem[]> => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: 'โปรดวิเคราะห์รูปโปรโมชั่นนี้ และส่งคืนเฉพาะ JSON Array ตามสกีมาที่กำหนด' },
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

    const responseText = response.text?.trim() || '[]';
    const parsedJson = JSON.parse(responseText);
    const validated = GeminiResponseSchema.parse(parsedJson);
    return validated;
  };

  // ลองเรียกครั้งแรก
  try {
    return await callModel();
  } catch (firstError) {
    console.warn('Gemini extraction attempt 1 failed, retrying once...', firstError);
    try {
      // Retry ครั้งที่ 1
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
