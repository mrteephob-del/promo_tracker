import { z } from 'zod';

export const TRACKED_BRANDS = ['เนสกาแฟ', 'มอคโคน่า', 'เบอร์ดี้', 'ซุปเปอร์'] as const;
export type TrackedBrand = (typeof TRACKED_BRANDS)[number];

export const TRACKED_STORES = ['7-11', 'CJ More', 'Mini BigC', 'Lotus', 'Top'] as const;
export type TrackedStore = (typeof TRACKED_STORES)[number];

export const TRACKED_CHANNELS = ['Facebook', 'LINE OA', 'TikTok', 'หน้าร้าน', 'อื่นๆ'] as const;
export type TrackedChannel = (typeof TRACKED_CHANNELS)[number];

export const PROMO_COLORS = ['แดง', 'เขียว', 'แดง,เขียว'] as const;
export type PromoColor = (typeof PROMO_COLORS)[number];

export const PROMOTION_TYPES = [
  'ลดราคา',
  'ซื้อ X แถม Y',
  'ของแถม',
  'ซองแถม',
  'ราคาพิเศษเมื่อซื้อครบ',
  'สะสมแต้ม',
  'อื่นๆ',
] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

/**
 * Zod Schema สำหรับรับผลลัพธ์จาก Gemini 2.5 Flash
 */
export const GeminiExtractedItemSchema = z.object({
  store_guess: z.string().describe('ชื่อร้านค้าที่สังเกตได้จากโลโก้หรือข้อความ เช่น 7-11, CJ More, Mini BigC, Lotus, Top'),
  brand: z.string().describe('ชื่อแบรนด์กาแฟซอง ภาษาไทย: เนสกาแฟ, มอคโคน่า, เบอร์ดี้, หรือ ซุปเปอร์ หากเป็นแบรนด์อื่นให้ระบุตามจริง'),
  item_name: z.string().describe('ชื่อสินค้าเต็มตามที่ปรากฏในรูป'),
  color: z.string().describe('สีซอง: แดง หรือ เขียว หรือ แดง,เขียว'),
  pack_size: z.number().nullable().describe('จำนวนซองต่อแพ็ค ตัวเลขอย่างเดียว เช่น 40 (ไม่รวมซองแถม)'),
  bonus_sachets: z.number().nullable().describe('จำนวนซองแถม เช่น 2 จากข้อความ 40+2 ซอง'),
  promotion_type: z.string().describe('ประเภทโปรโมชั่น: ลดราคา, ซื้อ X แถม Y, ของแถม, ซองแถม, ราคาพิเศษเมื่อซื้อครบ, สะสมแต้ม, อื่นๆ'),
  period_start: z.string().nullable().describe('วันเริ่มต้นโปรโมชั่น รูปแบบ dd/mm/yyyy ปี ค.ศ.'),
  period_end: z.string().nullable().describe('วันสิ้นสุดโปรโมชั่น รูปแบบ dd/mm/yyyy ปี ค.ศ.'),
  mechanic: z.string().describe('รายละเอียดกลไกโปรโมชั่นแบบเต็มภาษาไทย'),
  retail_price: z.number().nullable().describe('ราคาปกติ ทศนิยม 2 ตำแหน่ง หรือ null หากไม่ปรากฏ'),
  pro_price: z.number().nullable().describe('ราคาโปรโมชั่น ทศนิยม 2 ตำแหน่ง หรือ null หากไม่ปรากฏ'),
  confidence: z.number().min(0).max(1).describe('คะแนนความมั่นใจในการอ่านข้อมูล 0.0 ถึง 1.0'),
  notes: z.string().nullable().describe('หมายเหตุเพิ่มเติม เช่น ระบุว่าเป็นราคาที่คำนวณจากประหยัด X บาท'),
});

export const GeminiResponseSchema = z.array(GeminiExtractedItemSchema);

export type GeminiExtractedItem = z.infer<typeof GeminiExtractedItemSchema>;

/**
 * โครงสร้างแถวโปรโมชั่นสำหรับหน้าแก้ไข (Editable Promotion Row)
 */
export interface PromotionItem {
  id: string; // uuid สำหรับ client state
  imageId?: string; // id อ้างอิงรูปภาพ
  imagePreviewUrl?: string; // Data URL หรือ blob URL สำหรับพรีวิวใน UI
  selected: boolean; // เลือกบันทึกลง Sheet หรือไม่

  date: string; // dd/mm/yyyy
  store: string;
  brand: string;
  itemName: string;
  color: string;
  packSize: number | null;
  bonusSachets?: number | null;
  promotion: string;
  channel: string;
  freqWeek: number;
  period: string; // "dd/mm/yyyy - dd/mm/yyyy"
  machanic: string;
  retailPrice: number | null;
  proPrice: number | null;

  confidence: number;
  notes?: string | null;

  // สถานะและค่าคำนวณประกอบการตรวจ
  isDuplicate?: boolean;
  duplicateReason?: string;
  isUntrackedBrand?: boolean;
}

/**
 * แถวข้อมูลใน Google Sheet PRT (คอลัมน์ A–N)
 */
export interface SheetRowData {
  date: string; // A: dd/mm/yyyy
  store: string; // B: Store
  brand: string; // C: Brand
  itemName: string; // D: Item Name
  color: string; // E: Color
  packSize: number | null; // F: Pack Size
  promotion: string; // G: Promotion
  channel: string; // H: Channel
  freqWeek: number; // I: Freq/Week
  period: string; // J: Period
  machanic: string; // K: Machanic
  retailPrice: number | null; // L: Retail Price
  proPrice: number | null; // M: Pro Price
  imageUrl?: string; // N: Hyperlink target
  imageId?: string;
}

/**
 * Payload สำหรับส่งไปยัง Google Apps Script Web App
 */
export interface GasPayload {
  secret: string;
  action: 'checkDuplicates' | 'save' | 'list';
  rows?: SheetRowData[];
  images?: {
    id: string;
    base64: string;
    mimeType: string;
    filename?: string;
  }[];
  limit?: number;
}

