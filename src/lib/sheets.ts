import { GasPayload, SheetRowData } from '@/types';

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwf1D341f6ehamx0RSUycAfbtgvUTsdEOgkR5ld2OLedgMdgX8-cqK-wH2JbWhXCf4-/exec';
const DEFAULT_GAS_SECRET = 'my_super_secret_promo_key_2026';

function getGasConfig() {
  const url =
    (typeof window !== 'undefined' ? localStorage.getItem('apps_script_url') : null) ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL ||
    DEFAULT_GAS_URL;
  const secret =
    (typeof window !== 'undefined' ? localStorage.getItem('apps_script_secret') : null) ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_SECRET ||
    process.env.APPS_SCRIPT_SECRET ||
    DEFAULT_GAS_SECRET;

  return { url, secret };
}

async function callGasWebhook<T>(payload: Omit<GasPayload, 'secret'>): Promise<T> {
  const { url, secret } = getGasConfig();

  const fullPayload: GasPayload = {
    ...payload,
    secret,
  };

  // ใช้ text/plain;charset=utf-8 เพื่อป้องกัน Browser ส่ง CORS Preflight OPTIONS ซึ่ง Google Apps Script ไม่รองรับ
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(fullPayload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script ตอบกลับด้วยสถานะ HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.ok === false) {
    throw new Error(result.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Apps Script');
  }

  return result as T;
}

/**
 * เรียก Apps Script เพื่อตรวจสอบ Freq/Week และความซ้ำซ้อนใน Sheet ตามแท็บ
 */
export async function checkDuplicatesWithSheet(
  rows: SheetRowData[],
  sheetName: string = 'PRT'
): Promise<{
  ok: boolean;
  results: {
    freqWeek: number;
    isDuplicate: boolean;
    duplicateReason?: string;
  }[];
}> {
  return await callGasWebhook({
    action: 'checkDuplicates',
    sheetName,
    rows,
  });
}

/**
 * เรียก Apps Script เพื่อบันทึกรูปลง Drive และบันทึกแถวลง Sheet ตามแท็บ
 */
export async function saveRowsAndImagesToSheet(
  rows: SheetRowData[],
  images: { id: string; base64: string; mimeType: string; filename?: string }[],
  sheetName: string = 'PRT'
): Promise<{
  ok: boolean;
  rowsAdded: number;
  sheetName?: string;
  imageUrls: string[];
  spreadsheetUrl?: string;
}> {
  return await callGasWebhook({
    action: 'save',
    sheetName,
    rows,
    images,
  });
}

/**
 * เรียก Apps Script เพื่อดึงประวัติ 50 แถวล่าสุดตามแท็บ
 */
export async function fetchRecentSheetRows(
  limit: number = 50,
  sheetName: string = 'PRT'
): Promise<{
  ok: boolean;
  sheetName?: string;
  rows: (SheetRowData & { imageUrl?: string })[];
}> {
  return await callGasWebhook({
    action: 'list',
    sheetName,
    limit,
  });
}
