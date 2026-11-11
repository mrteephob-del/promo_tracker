import { TRACKED_BRANDS } from '@/types';

/**
 * ดึงวันที่ปัจจุบันตามเขตเวลา Asia/Bangkok
 */
export function getBangkokDate(): Date {
  const now = new Date();
  const bangkokTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  return new Date(bangkokTimeStr);
}

/**
 * คืนค่า วัน/เดือน/ปี (dd/mm/yyyy ค.ศ.) สำหรับวันปัจจุบัน
 */
export function getBangkokTodayDMY(): string {
  const d = getBangkokDate();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * คืนค่า yyyy-mm-dd สำหรับ input type="date"
 */
export function getBangkokTodayYMD(): string {
  const d = getBangkokDate();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * แปลงสตริง yyyy-mm-dd เป็น dd/mm/yyyy
 */
export function convertYMDtoDMY(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    if (year > 2400) year -= 543;
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  return ymd;
}

/**
 * แปลงสตริง dd/mm/yyyy เป็น yyyy-mm-dd
 */
export function convertDMYtoYMD(dmy: string): string {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3) {
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543;
    const month = parts[1].padStart(2, '0');
    const day = parts[0].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dmy;
}

/**
 * แปลงสตริง dd/mm/yyyy (หรือแปลง พ.ศ. เป็น ค.ศ.) เป็น Date Object
 */
export function parseDMYDate(dmy: string): Date | null {
  if (!dmy) return null;
  const parts = dmy.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543;
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * คำนวณช่วงสัปดาห์ (จันทร์ - อาทิตย์) สำหรับการจัดกลุ่ม Freq/Week
 * คืนค่าสัปดาห์ในรูปแบบ 'YYYY-Wxx'
 */
export function getWeekIdentifier(dateInput: Date | string): string {
  let d: Date | null;
  if (typeof dateInput === 'string') {
    d = parseDMYDate(dateInput);
  } else {
    d = dateInput;
  }
  if (!d || isNaN(d.getTime())) return 'unknown';

  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // วันอาทิตย์ (0) -> 7, จันทร์ (1) -> 1
  const day = utc.getUTCDay() || 7;
  // หาวันพฤหัสบดีของสัปดาห์
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * คำนวณส่วนลด (บาท) และ % ส่วนลด
 */
export function calculateDiscount(
  retailPrice: number | null | undefined,
  proPrice: number | null | undefined
): { amount: number | null; percent: number | null } {
  if (
    retailPrice === null ||
    retailPrice === undefined ||
    proPrice === null ||
    proPrice === undefined
  ) {
    return { amount: null, percent: null };
  }

  const retail = Number(retailPrice);
  const pro = Number(proPrice);

  if (isNaN(retail) || isNaN(pro) || retail <= 0) {
    return { amount: null, percent: null };
  }

  const amount = Math.max(0, retail - pro);
  const percent = (amount / retail) * 100;

  return {
    amount: Number(amount.toFixed(2)),
    percent: Number(percent.toFixed(1)),
  };
}

/**
 * คำนวณราคาต่อซอง (บาท/ซอง)
 */
export function calculatePricePerSachet(
  price: number | null | undefined,
  packSize: number | null | undefined
): number | null {
  if (
    price === null ||
    price === undefined ||
    packSize === null ||
    packSize === undefined
  ) {
    return null;
  }

  const p = Number(price);
  const size = Number(packSize);

  if (isNaN(p) || isNaN(size) || size <= 0) {
    return null;
  }

  return Number((p / size).toFixed(2));
}

/**
 * จัดรูปแบบตัวเลขราคาเป็นทศนิยม 2 ตำแหน่ง
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(Number(price))) {
    return '';
  }
  return Number(price).toFixed(2);
}

/**
 * ตรวจสอบความซ้ำซ้อนระหว่าง 2 รายการ
 * ตามเกณฑ์: Store + Brand + Color + Period + Pro Price ตรงกัน
 */
export function isDuplicatePromotion(
  a: { store: string; brand: string; color: string; period: string; proPrice: number | null },
  b: { store: string; brand: string; color: string; period: string; proPrice: number | null }
): boolean {
  const norm = (s: string) => String(s || '').trim().toLowerCase();
  const priceA = a.proPrice !== null && a.proPrice !== undefined ? Number(a.proPrice).toFixed(2) : '';
  const priceB = b.proPrice !== null && b.proPrice !== undefined ? Number(b.proPrice).toFixed(2) : '';

  return (
    norm(a.store) === norm(b.store) &&
    norm(a.brand) === norm(b.brand) &&
    norm(a.color) === norm(b.color) &&
    norm(a.period) === norm(b.period) &&
    priceA !== '' &&
    priceA === priceB
  );
}

/**
 * ตรวจสอบว่าเป็น 1 ใน 4 แบรนด์ที่ติดตามหรือไม่
 */
export function isTrackedBrand(brand: string): boolean {
  if (!brand) return false;
  const trimmed = brand.trim();
  return (TRACKED_BRANDS as readonly string[]).includes(trimmed);
}

