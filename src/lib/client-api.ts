import { extractPromotionFromImage } from '@/lib/gemini';
import { checkDuplicatesWithSheet, saveRowsAndImagesToSheet, fetchRecentSheetRows } from '@/lib/sheets';
import { PromotionItem, PromoCategory, AiModelMode, SheetRowData } from '@/types';
import { isTrackedBrand, getBangkokTodayDMY, classifyNoodleSubCategory } from '@/lib/calc';
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
    category = 'coffee',
    modelMode = 'pro',
  } = params;

  if (!imageBase64) {
    throw new Error('กรุณาส่งรูปภาพ base64 เพื่อทำการวิเคราะห์');
  }

  const currentCategory: PromoCategory = category === 'noodle' ? 'noodle' : 'coffee';
  const currentModelMode: AiModelMode = modelMode === 'flash' ? 'flash' : 'pro';

  // เรียก Gemini Vision
  const extractedList = await extractPromotionFromImage(
    imageBase64,
    mimeType,
    currentCategory,
    currentModelMode
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

    const isUntracked = currentCategory === 'coffee' ? !isTrackedBrand(item.brand) : false;
    const subCat =
      currentCategory === 'noodle'
        ? classifyNoodleSubCategory(item.brand, item.item_name, item.mechanic)
        : 'กาแฟซอง';

    return {
      id: `extracted-${Date.now()}-${index}`,
      category: currentCategory,
      subCategory: subCat,
      selected: !isUntracked,
      date: formattedDate,
      store: store,
      brand: item.brand,
      itemName: item.item_name,
      color: item.color || (currentCategory === 'noodle' ? 'ซอง' : 'แดง'),
      packSize: item.pack_size ?? (currentCategory === 'noodle' ? 1 : 40),
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

  return {
    ok: true,
    category: currentCategory,
    modelMode: currentModelMode,
    items,
    count: items.length,
  };
}

export async function checkDuplicatesClient(
  rows: SheetRowData[],
  sheetName: string = 'PRT'
): Promise<{
  ok: boolean;
  results: {
    freqWeek: number;
    freqMonth?: number;
    isDuplicate: boolean;
    duplicateReason?: string;
  }[];
}> {
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

export async function saveRowsClient(
  rows: SheetRowData[],
  images: { id: string; base64: string; mimeType: string; filename?: string }[],
  sheetName: string = 'PRT'
): Promise<{
  ok: boolean;
  rowsAdded: number;
  sheetName?: string;
  imageUrls: string[];
  spreadsheetUrl?: string;
  error?: string;
}> {
  return await saveRowsAndImagesToSheet(rows, images, sheetName);
}

export function getCachedHistoryRows(sheetName: string = 'PRT', limit: number = 2000): SheetRowData[] {
  const isNoodle = sheetName.toUpperCase() === 'NOODLE';
  const rows = isNoodle ? (cachedData.noodle || []) : (cachedData.prt || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (limit ? rows.slice(0, limit) : rows) as any[];
}
