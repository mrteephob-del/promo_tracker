import { GasPayload, SheetRowData } from '@/types';

function getGasConfig() {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;

  if (!url) {
    throw new Error('ไม่พบ APPS_SCRIPT_URL ในการตั้งค่า Environment Variables');
  }
  if (!secret) {
    throw new Error('ไม่พบ APPS_SCRIPT_SECRET ในการตั้งค่า Environment Variables');
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
    // ป้องกัน caching
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
 * เรียก Apps Script เพื่อตรวจสอบ Freq/Week และความซ้ำซ้อนใน Sheet
 */
export async function checkDuplicatesWithSheet(rows: SheetRowData[]): Promise<{
  ok: boolean;
  results: {
    freqWeek: number;
    isDuplicate: boolean;
    duplicateReason?: string;
  }[];
}> {
  return await callGasWebhook({
    action: 'checkDuplicates',
    rows,
  });
}

/**
 * เรียก Apps Script เพื่อบันทึกรูปลง Drive และบันทึกแถวลง Sheet
 */
export async function saveRowsAndImagesToSheet(
  rows: SheetRowData[],
  images: { id: string; base64: string; mimeType: string; filename?: string }[]
): Promise<{
  ok: boolean;
  rowsAdded: number;
  imageUrls: string[];
  spreadsheetUrl?: string;
}> {
  return await callGasWebhook({
    action: 'save',
    rows,
    images,
  });
}

/**
 * เรียก Apps Script เพื่อดึงประวัติ 50 แถวล่าสุด
 */
export async function fetchRecentSheetRows(limit: number = 50): Promise<{
  ok: boolean;
  rows: (SheetRowData & { imageUrl?: string })[];
}> {
  return await callGasWebhook({
    action: 'list',
    limit,
  });
}

