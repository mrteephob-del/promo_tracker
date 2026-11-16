import { extractPromotionFromImage } from '@/lib/gemini';
import { checkDuplicatesWithSheet, saveRowsAndImagesToSheet, fetchRecentSheetRows } from '@/lib/sheets';
import { PromotionItem, PromoCategory, AiModelMode, SheetRowData } from '@/types';
import { isTrackedBrand, getBangkokTodayDMY, classifyNoodleSubCategory, detectPromoCategory } from '@/lib/calc';
import cachedData from '@/data/cached_sheet_data.json';

export interface ExtractClientParams {
  imageBase64: string;
  mimeType?: string;
  defaultStore?: string;
  defaultChannel?: string;
  recordDate?: string;
  category?: PromoCategory;
  modelMode?: AiModelMode;
}

export async function extractPromotionClient(params: ExtractClientParams): Promise<{
  ok: boolean;
  category: PromoCategory;
  modelMode: AiModelMode;
  items: PromotionItem[];
  count: number;
  error?: string;
}> {
  const {
    imageBase64,
    mimeType = 'image/jpeg',
    defaultStore,
    defaultChannel,
    recordDate,
    category,
    modelMode = 'pro',
  } = params;

  if (!imageBase64) {
    throw new Error('กรุณาส่งรูปภาพ base64 เพื่อทำการวิเคราะห์');
  }

  const currentModelMode: AiModelMode = modelMode === 'flash' ? 'flash' : 'pro';

  // เรียก Gemini Vision พร้อมวิเคราะห์แบบรวมทุกหมวด (สกัดทั้งกาแฟและบะหมี่พร้อมกันในภาพเดียว)
  const extractedList = await extractPromotionFromImage(
    imageBase64,
    mimeType,
    category || 'auto',
    currentModelMode,
    defaultStore
  );

  const formattedDate = recordDate || getBangkokTodayDMY();

  const items: PromotionItem[] = extractedList.map((item, index) => {
    const store = defaultStore && defaultStore !== 'auto' ? defaultStore : item.store_guess || '';
    const channel = defaultChannel || 'หน้าร้าน';

    let period = '';
    const s = (item.period_start || '').trim();
    const e = (item.period_end || '').trim();
    const validS = s && s !== 'null' && s !== 'undefined' ? s : '';
    const validE = e && e !== 'null' && e !== 'undefined' ? e : '';

    if (validS && validE) {
      period = `${validS} - ${validE}`;
    } else if (validE) {
      period = `ถึง ${validE}`;
    } else if (validS) {
      period = `ตั้งแต่ ${validS}`;
    }

    // ระบุหมวดหมู่ของสินค้าแต่ละชิ้น (แยกกาแฟ vs บะหมี่/โจ๊ก/ข้าวต้ม)
    const itemCat: PromoCategory =
      item.category === 'coffee' || item.category === 'noodle'
        ? item.category
        : detectPromoCategory(item.brand, item.item_name, item.mechanic);

    const isCoffee = itemCat === 'coffee';
    const isUntracked = isCoffee ? !isTrackedBrand(item.brand) : false;
    const subCat = !isCoffee
      ? classifyNoodleSubCategory(item.brand, item.item_name, item.mechanic)
      : 'กาแฟซอง';

    return {
      id: `extracted-${Date.now()}-${index}`,
      category: itemCat,
      subCategory: subCat,
      selected: !isUntracked,
      date: formattedDate,
      store: store,
      brand: item.brand,
      itemName: item.item_name,
      color: item.color || (isCoffee ? 'แดง' : 'ซอง'),
      packSize: item.pack_size ?? (isCoffee ? 40 : 1),
      bonusSachets: item.bonus_sachets,
      promotion: item.promotion_type || 'ลดราคา',
      channel: channel,
      freqWeek: 1,
      freqMonth: 1,
      period: period,
      machanic: item.mechanic,
      retailPrice: item.retail_price,
      proPrice: item.pro_price,
      confidence: item.confidence,
      notes: item.notes,
      isUntrackedBrand: isUntracked,
    };
  });

  // กำหนด category รวมของผลลัพธ์
  const primaryCategory: PromoCategory =
    items.length > 0 ? items[0].category : category || 'noodle';

  return {
    ok: true,
    category: primaryCategory,
    modelMode: currentModelMode,
    items,
    count: items.length,
  };
}

export async function checkDuplicatesClient(
  rows: (SheetRowData & { category?: PromoCategory })[],
  sheetName?: string
): Promise<{
  ok: boolean;
  results: {
    freqWeek: number;
    freqMonth?: number;
    isDuplicate: boolean;
    duplicateReason?: string;
  }[];
}> {
  if (rows.length === 0) return { ok: true, results: [] };

  // ตรวจสอบว่ามีแถวที่ระบุ category แยกกันหรือไม่
  const hasMixedCategories = rows.some((r) => r.category);

  if (!hasMixedCategories && sheetName) {
    try {
      return await checkDuplicatesWithSheet(rows, sheetName);
    } catch (err) {
      console.warn('Apps Script check duplicates offline, fallback to local default:', err);
      return {
        ok: true,
        results: rows.map(() => ({
          freqWeek: 1,
          freqMonth: 1,
          isDuplicate: false,
        })),
      };
    }
  }

  // กรณีมีทั้งกาแฟและบะหมี่ แยกตรวจตาม Sheet แต่ละแท็บ (PRT และ NOODLE)
  const coffeeIndices: number[] = [];
  const noodleIndices: number[] = [];

  rows.forEach((it, idx) => {
    if (it.category === 'noodle') {
      noodleIndices.push(idx);
    } else {
      coffeeIndices.push(idx);
    }
  });

  const finalResults: {
    freqWeek: number;
    freqMonth?: number;
    isDuplicate: boolean;
    duplicateReason?: string;
  }[] = new Array(rows.length).fill(null);

  try {
    if (coffeeIndices.length > 0) {
      const coffeeRows = coffeeIndices.map((i) => rows[i]);
      const resCoffee = await checkDuplicatesWithSheet(coffeeRows, 'PRT');
      if (resCoffee && Array.isArray(resCoffee.results)) {
        coffeeIndices.forEach((origIdx, subIdx) => {
          finalResults[origIdx] = resCoffee.results[subIdx] || {
            freqWeek: 1,
            freqMonth: 1,
            isDuplicate: false,
          };
        });
      }
    }

    if (noodleIndices.length > 0) {
      const noodleRows = noodleIndices.map((i) => rows[i]);
      const resNoodle = await checkDuplicatesWithSheet(noodleRows, 'NOODLE');
      if (resNoodle && Array.isArray(resNoodle.results)) {
        noodleIndices.forEach((origIdx, subIdx) => {
          finalResults[origIdx] = resNoodle.results[subIdx] || {
            freqWeek: 1,
            freqMonth: 1,
            isDuplicate: false,
          };
        });
      }
    }
  } catch (err) {
    console.warn('Check duplicates multi error:', err);
  }

  for (let i = 0; i < finalResults.length; i++) {
    if (!finalResults[i]) {
      finalResults[i] = { freqWeek: 1, freqMonth: 1, isDuplicate: false };
    }
  }

  return { ok: true, results: finalResults };
}

export async function saveRowsClient(
  rows: (SheetRowData & { category?: PromoCategory })[],
  images: { id: string; base64: string; mimeType: string; filename?: string }[],
  sheetName?: string
): Promise<{
  ok: boolean;
  rowsAdded: number;
  sheetName?: string;
  imageUrls: string[];
  spreadsheetUrl?: string;
  error?: string;
}> {
  // หากทุกแถวระบุว่าลง sheet เดียวกัน
  if (sheetName && !rows.some((r) => r.category)) {
    return await saveRowsAndImagesToSheet(rows, images, sheetName);
  }

  // แยกบันทึกตามหมวดหมู่: กาแฟ -> PRT, บะหมี่/โจ๊ก/ข้าวต้ม -> NOODLE
  const coffeeRows: SheetRowData[] = [];
  const noodleRows: SheetRowData[] = [];

  rows.forEach((it) => {
    if (it.category === 'noodle') {
      noodleRows.push(it);
    } else {
      coffeeRows.push(it);
    }
  });

  let totalAdded = 0;
  const sheetNamesSaved: string[] = [];
  const allImageUrls: string[] = [];
  let spreadUrl: string | undefined;

  // บันทึกกาแฟลงแท็บ PRT
  if (coffeeRows.length > 0) {
    const resCoffee = await saveRowsAndImagesToSheet(coffeeRows, images, 'PRT');
    totalAdded += resCoffee.rowsAdded || coffeeRows.length;
    sheetNamesSaved.push('PRT');
    if (resCoffee.spreadsheetUrl) spreadUrl = resCoffee.spreadsheetUrl;
    if (resCoffee.imageUrls) allImageUrls.push(...resCoffee.imageUrls);
  }

  // บันทึกบะหมี่ลงแท็บ NOODLE
  if (noodleRows.length > 0) {
    const resNoodle = await saveRowsAndImagesToSheet(noodleRows, images, 'NOODLE');
    totalAdded += resNoodle.rowsAdded || noodleRows.length;
    sheetNamesSaved.push('NOODLE');
    if (resNoodle.spreadsheetUrl) spreadUrl = resNoodle.spreadsheetUrl;
    if (resNoodle.imageUrls) allImageUrls.push(...resNoodle.imageUrls);
  }

  return {
    ok: true,
    rowsAdded: totalAdded,
    sheetName: sheetNamesSaved.join(' & '),
    imageUrls: Array.from(new Set(allImageUrls)),
    spreadsheetUrl: spreadUrl,
  };
}

export function getCachedHistoryRows(sheetName: string = 'PRT', limit: number = 2000): SheetRowData[] {
  const isNoodle = sheetName.toUpperCase() === 'NOODLE';
  const rows = isNoodle ? (cachedData.noodle || []) : (cachedData.prt || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (limit ? rows.slice(0, limit) : rows) as any[];
}
