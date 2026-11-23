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
 * คำนวณช่วงเดือน คืนค่าสตริงเอกลักษณ์ของเดือน เช่น 'YYYY-Mxx'
 */
export function getMonthIdentifier(dateInput: Date | string): string {
  let d: Date | null;
  if (typeof dateInput === 'string') {
    d = parseDMYDate(dateInput);
  } else {
    d = dateInput;
  }
  if (!d || isNaN(d.getTime())) return 'unknown';
  const m = d.getUTCMonth() + 1;
  return `${d.getUTCFullYear()}-M${String(m).padStart(2, '0')}`;
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

/**
 * จัดรูปแบบการแสดงผล Period ให้สวยงาม (ล้างค่า null ออก)
 */
export function formatPeriodDisplay(period: string): string {
  if (!period) return 'โปรโมชั่นต่อเนื่อง';
  let p = String(period).trim();
  if (p === 'null - null' || p === 'null' || p === 'undefined') return 'โปรโมชั่นต่อเนื่อง';
  if (p.startsWith('null -') || p.startsWith('null-')) {
    const end = p.replace(/^null\s*-\s*/, '').trim();
    return end && end !== 'null' ? `ถึง ${end}` : 'โปรโมชั่นต่อเนื่อง';
  }
  return p;
}

/**
 * แยกวันที่สิ้นสุดโปรโมชั่นจากสตริง period
 */
export function parsePeriodEndDate(period: string): Date | null {
  if (!period) return null;
  const parts = period.split('-');
  const endPart = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim();
  const match = endPart.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);
  if (year > 2400) year -= 543;
  return new Date(Date.UTC(year, month, day, 23, 59, 59));
}

/**
 * คำนวณสถานะโปรโมชั่น (กำลังจัดโปร, ใกล้หมดอายุ < 3 วัน, หมดอายุแล้ว)
 */
export function getPromoStatus(
  period: string,
  referenceDate?: Date
): 'active' | 'expiring_soon' | 'expired' {
  const end = parsePeriodEndDate(period);
  if (!end) return 'active'; // ถ้าไม่มีระบุวันสิ้นสุด ให้ถือว่ายังจัดโปรอยู่
  const ref = referenceDate || getBangkokDate();
  const diffTime = end.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'expiring_soon';
  return 'active';
}

export const MONTH_NAMES_SHORT = [
  'ต่อเนื่อง',
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

export const MONTH_NAMES_FULL = [
  'โปรต่อเนื่อง / ไม่ระบุวัน',
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

/**
 * สกัดเดือนที่จัดโปรโมชั่น (1-12 หรือ 0 สำหรับโปรต่อเนื่อง/ไม่ระบุวัน)
 * ให้ความสำคัญกับช่วงเวลาโปรโมชั่นจริง (period) ก่อนวันที่บันทึก (date)
 */
export function extractPromoMonth(row: { date?: string; period?: string }): number {
  if (row.period) {
    const str = String(row.period).trim();
    const matches = Array.from(str.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g));
    if (matches.length > 0) {
      const startDay = parseInt(matches[0][1], 10);
      const startMonth = parseInt(matches[0][2], 10);
      if (matches.length > 1) {
        const endMonth = parseInt(matches[1][2], 10);
        // หากโปรโมชั่นเริ่มปลายเดือน เช่น 29/01 - 25/02 แคมเปญหลักส่วนใหญ่คือ กุมภาพันธ์
        if (startMonth !== endMonth && startDay >= 25 && endMonth >= 1 && endMonth <= 12) {
          return endMonth;
        }
      }
      if (startMonth >= 1 && startMonth <= 12) return startMonth;
    }
  }
  if (row.date) {
    const parts = String(row.date).trim().split('/');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10);
      if (m >= 1 && m <= 12) return m;
    }
  }
  return 0;
}

export interface MonthlyStatsItem {
  month: number; // 0 = โปรต่อเนื่อง, 1-12 = มกราคม - ธันวาคม
  name: string;
  fullName: string;
  count: number;
  percent: number;
  stores: Record<string, number>;
  topStore: string;
  topStoreCount: number;
  topBrand: string;
  topBrandCount: number;
  avgDiscount: number;
  topPeriod: string;
  periods: string[];
  bestDeal: {
    brand: string;
    itemName: string;
    store: string;
    discPercent: number;
  } | null;
}

/**
 * คำนวณสถิติและแนวโน้มโปรโมชั่นรายเดือนแบบละเอียด
 */
export function buildMonthlyStats(items: any[]): MonthlyStatsItem[] {
  const buckets = Array(13)
    .fill(0)
    .map((_, i) => ({
      month: i,
      name: MONTH_NAMES_SHORT[i],
      fullName: MONTH_NAMES_FULL[i],
      count: 0,
      percent: 0,
      stores: {} as Record<string, number>,
      brands: {} as Record<string, number>,
      periods: {} as Record<string, number>,
      sumDisc: 0,
      discCount: 0,
      bestDeal: null as MonthlyStatsItem['bestDeal'],
    }));

  const total = items.length || 1;

  items.forEach((r) => {
    const m = extractPromoMonth(r);
    const b = buckets[m];
    b.count++;
    if (r.store) b.stores[r.store] = (b.stores[r.store] || 0) + 1;
    if (r.brand) b.brands[r.brand] = (b.brands[r.brand] || 0) + 1;
    if (r.period) {
      const p = String(r.period).trim();
      if (p && p !== '-' && p !== 'ไม่ระบุ') {
        b.periods[p] = (b.periods[p] || 0) + 1;
      }
    }

    const retail = parseFloat(r.retailPrice) || 0;
    const pro = parseFloat(r.proPrice) || 0;
    if (retail > pro && pro > 0) {
      const pct = ((retail - pro) / retail) * 100;
      b.sumDisc += pct;
      b.discCount++;
      if (!b.bestDeal || pct > b.bestDeal.discPercent) {
        b.bestDeal = {
          brand: r.brand,
          itemName: r.itemName,
          store: r.store,
          discPercent: Number(pct.toFixed(1)),
        };
      }
    }
  });

  return buckets.map((b) => {
    const sortedStores = Object.entries(b.stores).sort((x, y) => y[1] - x[1]);
    const sortedBrands = Object.entries(b.brands).sort((x, y) => y[1] - x[1]);
    const sortedPeriods = Object.entries(b.periods).sort((x, y) => y[1] - x[1]);
    const topPeriod = sortedPeriods[0] ? sortedPeriods[0][0] : '';
    const periods = sortedPeriods.map((p) => p[0]);

    return {
      month: b.month,
      name: b.name,
      fullName: b.fullName,
      count: b.count,
      percent: Number(((b.count / total) * 100).toFixed(1)),
      stores: b.stores,
      topStore: sortedStores[0] ? sortedStores[0][0] : '-',
      topStoreCount: sortedStores[0] ? sortedStores[0][1] : 0,
      topBrand: sortedBrands[0] ? sortedBrands[0][0] : '-',
      topBrandCount: sortedBrands[0] ? sortedBrands[0][1] : 0,
      avgDiscount: b.discCount > 0 ? Number((b.sumDisc / b.discCount).toFixed(1)) : 0,
      topPeriod,
      periods,
      bestDeal: b.bestDeal,
    };
  });
}

/**
 * สกัดชื่อสินค้าหลักเพื่อใช้เทียบราคาข้ามห้าง (Cross-Store SKU Matching)
 */
export function cleanCoreProductName(brand: string, itemName: string): string {
  let name = (itemName || '').trim();
  const pattern = /^(คนอร์|มาม่า|ไวไว|ยำยำ|นิสชิน|เกษตร|ซัมยัง|เนสกาแฟ|มอคโคน่า|เบอร์ดี้|ซุปเปอร์|\s+)+/i;
  name = name.replace(pattern, '').trim();
  name = name.replace(/\s*\d+(\.\d+)?\s*(กรัม|ก\.|g|ซอง|ชิ้น|มล\.|มล).*/i, '');
  name = name.replace(/\s*(ชนิด|แบบ)?(ซอง|ถ้วย|คัพ|ชาม|แพ็ค|กล่อง|ลัง).*/i, '');
  name = name.replace(/\s*(แพ็ค\s*\d+).*/i, '');
  name = name.trim();
  if (name.length < 2) name = (itemName || '').trim();
  return (brand.trim() + ' ' + name).trim();
}

/**
 * โครงสร้างข้อมูลการเปรียบเทียบราคาข้ามห้าง
 */
export interface CrossStoreComparisonItem {
  brand: string;
  name: string;
  category: string;
  storeCount: number;
  stores: Record<
    string,
    {
      unitPrice: number;
      proPrice: string;
      retailPrice: string;
      packSize: number | string;
      period: string;
      imageUrl?: string;
    }
  >;
  minPrice: number;
  maxPrice: number;
  diff: number;
  diffPercent: number;
  cheapestStores: string[];
}

/**
 * สร้างรายการเปรียบเทียบราคาข้ามห้างสำหรับสินค้ารุ่นเดียวกัน
 */
export function buildCrossStoreComparisons(items: any[]): CrossStoreComparisonItem[] {
  const map: Record<string, any> = {};

  items.forEach((r) => {
    const p = parseFloat(r.proPrice) || 0;
    const s = parseInt(String(r.packSize), 10) || 1;
    if (p <= 0 || s <= 0) return;
    const unit = p / s;
    if (unit < 0.5 || unit > 300) return;

    const core = cleanCoreProductName(r.brand, r.itemName);
    if (!map[core]) {
      map[core] = {
        brand: r.brand,
        name: core,
        category: r.subCategory || r.category || 'อื่นๆ',
        stores: {},
        imageUrl: r.imageUrl,
      };
    }

    if (!map[core].stores[r.store] || unit < map[core].stores[r.store].unitPrice) {
      map[core].stores[r.store] = {
        unitPrice: Number(unit.toFixed(2)),
        proPrice: r.proPrice,
        retailPrice: r.retailPrice,
        packSize: r.packSize,
        period: r.period,
        imageUrl: r.imageUrl || map[core].imageUrl,
      };
      if (r.imageUrl) map[core].imageUrl = r.imageUrl;
    }
  });

  const result: CrossStoreComparisonItem[] = [];
  for (const item of Object.values(map)) {
    const storeKeys = Object.keys(item.stores);
    if (storeKeys.length >= 2) {
      const prices = storeKeys.map((s) => item.stores[s].unitPrice);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const diff = Number((maxPrice - minPrice).toFixed(2));
      const diffPercent = maxPrice > 0 ? Number(((diff / maxPrice) * 100).toFixed(1)) : 0;
      const cheapestStores = storeKeys.filter((s) => item.stores[s].unitPrice === minPrice);

      result.push({
        brand: item.brand,
        name: item.name,
        category: item.category,
        storeCount: storeKeys.length,
        stores: item.stores,
        minPrice,
        maxPrice,
        diff,
        diffPercent,
        cheapestStores,
      });
    }
  }

  return result.sort((a, b) => b.diff - a.diff);
}
export function classifyNoodleSubCategory(
  brand: string,
  itemName: string,
  machanic?: string
): 'บะหมี่กึ่งสำเร็จรูป' | 'โจ๊ก' | 'ข้าวต้ม' | 'มันบด' {
  const b = String(brand || '').toLowerCase();
  const name = String(itemName || '').toLowerCase();
  const mech = String(machanic || '').toLowerCase();
  const fullText = `${b} ${name} ${mech}`;

  // 1. มันบด (Mashed Potato)
  if (
    fullText.includes('มันบด') ||
    fullText.includes('mashed potato') ||
    fullText.includes('โพเทโต้')
  ) {
    return 'มันบด';
  }

  // 2. ข้าวต้ม (Instant Boiled Rice / Rice Soup)
  const hasKhaotom = fullText.includes('ข้าวต้ม');
  const hasJok =
    fullText.includes('โจ๊ก') ||
    fullText.includes('congee') ||
    fullText.includes('porridge');
  const hasNoodle =
    fullText.includes('บะหมี่') ||
    fullText.includes('มาม่า') ||
    fullText.includes('ราเมน') ||
    fullText.includes('ramen');

  if (hasKhaotom && !hasJok && !hasNoodle) return 'ข้าวต้ม';

  if (hasKhaotom && hasJok) {
    const posKhaotom = name.indexOf('ข้าวต้ม');
    const posJok = name.indexOf('โจ๊ก');
    if (posKhaotom !== -1 && (posJok === -1 || posKhaotom < posJok)) return 'ข้าวต้ม';
    return 'โจ๊ก';
  }

  if (hasKhaotom && hasNoodle) {
    if (name.includes('ข้าวต้ม') && !name.includes('บะหมี่')) return 'ข้าวต้ม';
    return 'บะหมี่กึ่งสำเร็จรูป';
  }

  // 3. โจ๊ก (Congee / Porridge)
  if (hasJok) return 'โจ๊ก';

  // 4. บะหมี่กึ่งสำเร็จรูป
  return 'บะหมี่กึ่งสำเร็จรูป';
}

/**
 * คาดการณ์ระยะเวลาโปรโมชั่น (Period) สำหรับรายการที่เว้นว่างไว้หรือไม่ระบุ
 * โดยอ้างอิงจากรอบโปรโมชั่น/ใบปลิวของห้างในชุดเดียวกันที่อยู่ติดกัน
 */
export function predictMissingPromoPeriods<
  T extends { store?: string; period?: string; date?: string; isPredictedPeriod?: boolean }
>(rows: T[]): (T & { isPredictedPeriod: boolean })[] {
  const isInvalid = (p?: string) => {
    if (!p) return true;
    const s = String(p).trim().toLowerCase();
    return s === '' || s === '-' || s === 'null' || s === 'null - null' || s === 'ไม่มี';
  };

  return rows.map((r, idx) => {
    let period = (r.period || '').trim();
    let isPredicted = !!r.isPredictedPeriod;

    if (isInvalid(period)) {
      let candidate = '';
      // ค้นหาแถวรอบข้างในห้างเดียวกันย้อนหลัง (backward scan)
      for (let i = idx - 1; i >= Math.max(0, idx - 40); i--) {
        if (rows[i].store === r.store && !isInvalid(rows[i].period)) {
          candidate = rows[i].period!.trim();
          break;
        }
      }
      // หากไม่พบ ให้ค้นหาแถวถัดไปข้างหน้า (forward scan)
      if (!candidate) {
        for (let i = idx + 1; i < Math.min(rows.length, idx + 40); i++) {
          if (rows[i].store === r.store && !isInvalid(rows[i].period)) {
            candidate = rows[i].period!.trim();
            break;
          }
        }
      }
      // หากไม่พบคู่เทียบ ให้ใช้รอบมาตรฐาน 14 วัน
      if (!candidate) {
        candidate = 'รอบโปรโมชั่น 14 วัน (คาดการณ์)';
      }

      period = candidate;
      isPredicted = true;
    }

    return {
      ...r,
      period,
      isPredictedPeriod: isPredicted,
    };
  });
}

/**
 * คำนวณความถี่ในการจัดโปรโมชั่นต่อเดือน (Freq/Month) สำหรับแต่ละรายการ
 * โดยนับจำนวนโปรโมชั่นของแบรนด์นั้นในห้างนั้น ประจำเดือนนั้น
 */
export function calculateMonthlyFrequencies<
  T extends {
    store?: string;
    brand?: string;
    period?: string;
    date?: string;
    freqWeek?: number | string;
    freqMonth?: number | string;
  }
>(rows: T[]): (T & { freqMonth: number; promoMonth: number })[] {
  const counts: Record<string, number> = {};

  rows.forEach((r) => {
    const m = extractPromoMonth(r);
    const key = `${r.store || 'all'}|${r.brand || 'all'}|${m}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return rows.map((r) => {
    const m = extractPromoMonth(r);
    const key = `${r.store || 'all'}|${r.brand || 'all'}|${m}`;
    return {
      ...r,
      freqMonth: counts[key] || 1,
      promoMonth: m,
    };
  });
}

export interface BrandFrequencyItem {
  brand: string;
  totalDeals: number;
  activeMonthsCount: number;
  avgMonthlyFreq: number; // ครั้ง/เดือน
  peakMonthName: string;
  peakMonthCount: number;
  topStore: string;
  topStoreDeals: number;
  monthlyCadence: number[]; // 12 elements (months 1-12)
}

export interface StoreFrequencyItem {
  store: string;
  totalDeals: number;
  avgMonthlyFreq: number;
  peakMonthName: string;
  peakMonthCount: number;
  topBrand: string;
  topBrandDeals: number;
  monthlyCadence: number[];
}

export interface RepeatedSKUItem {
  name: string;
  brand: string;
  totalDeals: number;
  stores: string[];
  avgMonthlyFreq: number;
  monthlyCadence: number[];
  imageUrl?: string;
  sampleProPrice?: string;
}

export interface FrequencyAnalyticsResult {
  overallAvgMonthlyFreq: number;
  topBrand: BrandFrequencyItem | null;
  topStore: StoreFrequencyItem | null;
  brandFrequencyList: BrandFrequencyItem[];
  storeFrequencyList: StoreFrequencyItem[];
  topRepeatedSKUs: RepeatedSKUItem[];
  predictionStats: {
    total: number;
    actual: number;
    predicted: number;
    predictedPercent: number;
  };
}

/**
 * คำนวณและสรุปข้อมูลการวิเคราะห์ความถี่โปรโมชั่นรายเดือนแบบละเอียด
 */
export function buildFrequencyAnalytics(rows: any[]): FrequencyAnalyticsResult {
  const brandMap: Record<
    string,
    { brand: string; totalDeals: number; months: number[]; stores: Record<string, number> }
  > = {};

  const storeMap: Record<
    string,
    { store: string; totalDeals: number; months: number[]; brands: Record<string, number> }
  > = {};

  const skuMap: Record<
    string,
    {
      name: string;
      brand: string;
      totalDeals: number;
      months: number[];
      stores: Set<string>;
      imageUrl?: string;
      proPrice?: string;
    }
  > = {};

  let predictedCount = 0;

  rows.forEach((r) => {
    if (r.isPredictedPeriod) predictedCount++;
    const m = extractPromoMonth(r);
    const brand = r.brand || 'อื่นๆ';
    const store = r.store || 'ไม่ระบุ';
    const skuName = cleanCoreProductName(brand, r.itemName);

    // Brand
    if (!brandMap[brand]) {
      brandMap[brand] = { brand, totalDeals: 0, months: Array(13).fill(0), stores: {} };
    }
    brandMap[brand].totalDeals++;
    brandMap[brand].months[m]++;
    brandMap[brand].stores[store] = (brandMap[brand].stores[store] || 0) + 1;

    // Store
    if (!storeMap[store]) {
      storeMap[store] = { store, totalDeals: 0, months: Array(13).fill(0), brands: {} };
    }
    storeMap[store].totalDeals++;
    storeMap[store].months[m]++;
    storeMap[store].brands[brand] = (storeMap[store].brands[brand] || 0) + 1;

    // SKU
    if (!skuMap[skuName]) {
      skuMap[skuName] = {
        name: skuName,
        brand,
        totalDeals: 0,
        months: Array(13).fill(0),
        stores: new Set(),
        imageUrl: r.imageUrl,
        proPrice: r.proPrice,
      };
    }
    skuMap[skuName].totalDeals++;
    skuMap[skuName].months[m]++;
    skuMap[skuName].stores.add(store);
    if (!skuMap[skuName].imageUrl && r.imageUrl) {
      skuMap[skuName].imageUrl = r.imageUrl;
    }
  });

  const brandFrequencyList: BrandFrequencyItem[] = Object.values(brandMap)
    .map((b) => {
      const activeMonths = b.months.slice(1).filter((c) => c > 0).length || 1;
      let peakMonth = 1;
      let peakCount = 0;
      for (let i = 1; i <= 12; i++) {
        if (b.months[i] > peakCount) {
          peakCount = b.months[i];
          peakMonth = i;
        }
      }
      const sortedStores = Object.entries(b.stores).sort((x, y) => y[1] - x[1]);
      return {
        brand: b.brand,
        totalDeals: b.totalDeals,
        activeMonthsCount: activeMonths,
        avgMonthlyFreq: Number((b.totalDeals / activeMonths).toFixed(1)),
        peakMonthName: MONTH_NAMES_SHORT[peakMonth] || `เดือน ${peakMonth}`,
        peakMonthCount: peakCount,
        topStore: sortedStores[0] ? sortedStores[0][0] : '-',
        topStoreDeals: sortedStores[0] ? sortedStores[0][1] : 0,
        monthlyCadence: b.months.slice(1),
      };
    })
    .sort((a, b) => b.totalDeals - a.totalDeals);

  const storeFrequencyList: StoreFrequencyItem[] = Object.values(storeMap)
    .map((s) => {
      const activeMonths = s.months.slice(1).filter((c) => c > 0).length || 1;
      let peakMonth = 1;
      let peakCount = 0;
      for (let i = 1; i <= 12; i++) {
        if (s.months[i] > peakCount) {
          peakCount = s.months[i];
          peakMonth = i;
        }
      }
      const sortedBrands = Object.entries(s.brands).sort((x, y) => y[1] - x[1]);
      return {
        store: s.store,
        totalDeals: s.totalDeals,
        avgMonthlyFreq: Number((s.totalDeals / activeMonths).toFixed(1)),
        peakMonthName: MONTH_NAMES_SHORT[peakMonth] || `เดือน ${peakMonth}`,
        peakMonthCount: peakCount,
        topBrand: sortedBrands[0] ? sortedBrands[0][0] : '-',
        topBrandDeals: sortedBrands[0] ? sortedBrands[0][1] : 0,
        monthlyCadence: s.months.slice(1),
      };
    })
    .sort((a, b) => b.totalDeals - a.totalDeals);

  const topRepeatedSKUs: RepeatedSKUItem[] = Object.values(skuMap)
    .map((sku) => {
      const activeMonths = sku.months.slice(1).filter((c) => c > 0).length || 1;
      return {
        name: sku.name,
        brand: sku.brand,
        totalDeals: sku.totalDeals,
        stores: Array.from(sku.stores),
        avgMonthlyFreq: Number((sku.totalDeals / activeMonths).toFixed(1)),
        monthlyCadence: sku.months.slice(1),
        imageUrl: sku.imageUrl,
        sampleProPrice: sku.proPrice,
      };
    })
    .sort((a, b) => b.totalDeals - a.totalDeals)
    .slice(0, 10);

  const total = rows.length || 1;
  const overallAvgMonthlyFreq = Number((total / 12).toFixed(1));

  return {
    overallAvgMonthlyFreq,
    topBrand: brandFrequencyList[0] || null,
    topStore: storeFrequencyList[0] || null,
    brandFrequencyList,
    storeFrequencyList,
    topRepeatedSKUs,
    predictionStats: {
      total,
      actual: total - predictedCount,
      predicted: predictedCount,
      predictedPercent: Number(((predictedCount / total) * 100).toFixed(1)),
    },
  };
}

