import { z } from 'zod';

export type PromoCategory = 'coffee' | 'noodle';
export type AiModelMode = 'flash' | 'pro';

export interface CategoryConfig {
  id: PromoCategory;
  name: string;
  sheetName: string;
  icon: string;
  description: string;
}

export const CATEGORIES: Record<PromoCategory, CategoryConfig> = {
  coffee: {
    id: 'coffee',
    name: 'กาแฟซอง',
    sheetName: 'PRT',
    icon: '☕',
    description: 'เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์ (ซองแดง/เขียว)',
  },
  noodle: {
    id: 'noodle',
    name: 'บะหมี่ & โจ๊ก & ข้าวต้ม',
    sheetName: 'NOODLE',
    icon: '🍜',
    description: 'บะหมี่กึ่งสำเร็จรูป (ซอง/ถ้วย), โจ๊ก (ซอง/ถ้วย), ข้าวต้ม (ถ้วย)',
  },
};

// กาแฟซอง
export const TRACKED_BRANDS = ['เนสกาแฟ', 'มอคโคน่า', 'เบอร์ดี้', 'ซุปเปอร์'] as const;
export type TrackedBrand = (typeof TRACKED_BRANDS)[number];

// บะหมี่ โจ๊ก ข้าวต้ม (ทุกแบรนด์)
export const COMMON_NOODLE_BRANDS = [
  'มาม่า',
  'ไวไว',
  'ยำยำ',
  'นิสชิน',
  'ซัมยัง',
  'คนอร์',
  'เกษตร',
  'มังกรคู่',
  'อื่นๆ',
] as const;

export const NOODLE_SUB_CATEGORIES = [
  'บะหมี่กึ่งสำเร็จรูป',
  'โจ๊ก',
  'ข้าวต้ม',
  'มันบด',
] as const;
export type NoodleSubCategory = 'all' | (typeof NOODLE_SUB_CATEGORIES)[number];

export const NOODLE_PACKAGE_TYPES = ['ซอง', 'ถ้วย/คัพ', 'ชาม', 'แพ็ค'] as const;

export const TRACKED_STORES = ['7-11', 'CJ More', 'Mini BigC', 'Lotus', 'Top'] as const;
export type TrackedStore = (typeof TRACKED_STORES)[number];

export const TRACKED_CHANNELS = ['Facebook', 'LINE OA', 'TikTok', 'หน้าร้าน', 'อื่นๆ'] as const;
export type TrackedChannel = (typeof TRACKED_CHANNELS)[number];

export const PROMO_COLORS = ['แดง', 'เขียว', 'แดง,เขียว', 'ซอง', 'ถ้วย/คัพ'] as const;
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
  brand: z.string().describe('ชื่อแบรนด์ เช่น มาม่า, ไวไว, ยำยำ, คนอร์ หรือ เนสกาแฟ, มอคโคน่า'),
  item_name: z.string().describe('ชื่อสินค้าและรสชาติเต็มตามที่ปรากฏในรูป'),
  color: z.string().describe('กาแฟ: แดง หรือ เขียว หรือ แดง,เขียว | บะหมี่/โจ๊ก: ซอง หรือ ถ้วย/คัพ'),
  pack_size: z.number().nullable().describe('จำนวนชิ้น/ซอง/ถ้วย ต่อแพ็ค เช่น 1 (ถ้าขายเดี่ยว) หรือ 5, 6, 10, 30 (ถ้าเป็นแพ็ค/ลัง)'),
  bonus_sachets: z.number().nullable().describe('จำนวนของแถม เช่น 1 จาก 5+1 ซอง'),
  promotion_type: z.string().describe('ประเภทโปรโมชั่น: ลดราคา, ซื้อ X แถม Y, ของแถม, ซองแถม, ราคาพิเศษเมื่อซื้อครบ, สะสมแต้ม, อื่นๆ'),
  period_start: z.string().nullable().describe('วันเริ่มต้นโปรโมชั่น รูปแบบ dd/mm/yyyy ปี ค.ศ.'),
  period_end: z.string().nullable().describe('วันสิ้นสุดโปรโมชั่น รูปแบบ dd/mm/yyyy ปี ค.ศ.'),
  mechanic: z.string().describe('รายละเอียดกลไกโปรโมชั่นแบบเต็มภาษาไทย'),
  retail_price: z.number().nullable().describe('ราคาปกติ ทศนิยม 2 ตำแหน่ง หรือ null หากไม่ปรากฏ'),
  pro_price: z.number().nullable().describe('ราคาโปรโมชั่น ทศนิยม 2 ตำแหน่ง หรือ null หากไม่ปรากฏ'),
  confidence: z.number().min(0).max(1).describe('คะแนนความมั่นใจในการอ่านข้อมูล 0.0 ถึง 1.0'),
  notes: z.string().nullable().describe('หมายเหตุเพิ่มเติม เช่น ชนิดบรรจุภัณฑ์ (ซอง/ถ้วย)'),
});

export const GeminiResponseSchema = z.array(GeminiExtractedItemSchema);

export type GeminiExtractedItem = z.infer<typeof GeminiExtractedItemSchema>;

/**
 * โครงสร้างแถวโปรโมชั่นสำหรับหน้าแก้ไข (Editable Promotion Row)
 */
export interface PromotionItem {
  id: string; // uuid สำหรับ client state
  category: PromoCategory;
  imageId?: string; // id อ้างอิงรูปภาพ
  imagePreviewUrl?: string; // Data URL หรือ blob URL สำหรับพรีวิวใน UI
  selected: boolean; // เลือกบันทึกลง Sheet หรือไม่

  date: string; // dd/mm/yyyy
  store: string;
  brand: string;
  itemName: string;
  color: string; // กาแฟ: แดง/เขียว | บะหมี่: ซอง/ถ้วย
  packSize: number | null;
  bonusSachets?: number | null;
  promotion: string;
  channel: string;
  freqWeek: number;
  freqMonth?: number;
  period: string; // "dd/mm/yyyy - dd/mm/yyyy"
  machanic: string;
  retailPrice: number | null;
  proPrice: number | null;

  confidence: number;
  notes?: string | null;

  // สถานะและค่าคำนวณประกอบการตรวจ
  subCategory?: string; // บะหมี่กึ่งสำเร็จรูป | โจ๊ก | ข้าวต้ม | มันบด
  isPredictedPeriod?: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
  isUntrackedBrand?: boolean;
}

/**
 * แถวข้อมูลใน Google Sheet (คอลัมน์ A–N)
 */
export interface SheetRowData {
  date: string; // A: dd/mm/yyyy
  store: string; // B: Store
  brand: string; // C: Brand
  itemName: string; // D: Item Name
  color: string; // E: Color / Package Type
  packSize: number | null; // F: Pack Size
  promotion: string; // G: Promotion
  channel: string; // H: Channel
  freqWeek: number; // I: Freq/Week (legacy)
  freqMonth?: number; // I: Freq/Month (ความถี่ต่อเดือน)
  period: string; // J: Period
  machanic: string; // K: Machanic
  retailPrice: number | null; // L: Retail Price
  proPrice: number | null; // M: Pro Price
  imageUrl?: string; // N: Hyperlink target
  subCategory?: string; // O: Sub-Category (บะหมี่กึ่งสำเร็จรูป, โจ๊ก, ข้าวต้ม, มันบด)
  isPredictedPeriod?: boolean; // มาร์คว่าเป็นช่วงเวลาที่คาดการณ์หรือไม่
  imageId?: string;
}

/**
 * Payload สำหรับส่งไปยัง Google Apps Script Web App
 */
export interface GasPayload {
  secret: string;
  action: 'checkDuplicates' | 'save' | 'list';
  sheetName?: string; // PRT หรือ NOODLE
  category?: PromoCategory;
  rows?: SheetRowData[];
  images?: {
    id: string;
    base64: string;
    mimeType: string;
    filename?: string;
  }[];
  limit?: number;
}
