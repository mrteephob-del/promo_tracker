import { GasPayload, SheetRowData } from '@/types';

function getGasConfig() {
  const url =
    (typeof window !== 'undefined' ? localStorage.getItem('apps_script_url') : null) ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL;
  const secret =
    (typeof window !== 'undefined' ? localStorage.getItem('apps_script_secret') : null) ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_SECRET ||
    process.env.APPS_SCRIPT_SECRET;

  if (!url) {
    throw new Error('ไม่พบ APPS_SCRIPT_URL ในการตั้งค่า Environment Variables หรือ Local Storage');
  }
  if (!secret) {
    throw new Error('ไม่พบ APPS_SCRIPT_SECRET ในการตั้งค่า Environment Variables หรือ Local Storage');
  }

  return { url, secret };
}

async function callGasWebhook<T>(payload: Omit<GasPayload, 'secret'>): Promise<T> {
  const { url, secret } = getGasConfig();

  const fullPayload: GasPayload = {
    ...payload,
    secret,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
