import { describe, it, expect } from 'vitest';
import {
  convertYMDtoDMY,
  convertDMYtoYMD,
  parseDMYDate,
  getWeekIdentifier,
  calculateDiscount,
  calculatePricePerSachet,
  formatPrice,
  isDuplicatePromotion,
  isTrackedBrand,
} from '../src/lib/calc';

describe('Date & Calendar Functions', () => {
  it('converts YMD to DMY format and handles Buddhist Era', () => {
    expect(convertYMDtoDMY('2026-11-09')).toBe('09/11/2026');
    // If input is Buddhist year 2569
    expect(convertYMDtoDMY('2569-11-09')).toBe('09/11/2026');
  });

  it('converts DMY to YMD format and handles Buddhist Era', () => {
    expect(convertDMYtoYMD('09/11/2026')).toBe('2026-11-09');
    expect(convertDMYtoYMD('09/11/2569')).toBe('2026-11-09');
  });

  it('parses DMY string to Date object converting BE to CE', () => {
    const dateCE = parseDMYDate('09/11/2026');
    expect(dateCE).not.toBeNull();
    expect(dateCE?.getUTCFullYear()).toBe(2026);
    expect(dateCE?.getUTCMonth()).toBe(10); // November is index 10
    expect(dateCE?.getUTCDate()).toBe(9);

    const dateBE = parseDMYDate('09/11/2569');
    expect(dateBE).not.toBeNull();
    expect(dateBE?.getUTCFullYear()).toBe(2026);
  });

  it('calculates the same week identifier for Monday through Sunday', () => {
    // 2026-11-09 is Monday, 2026-11-15 is Sunday
    const monday = '09/11/2026';
    const wednesday = '11/11/2026';
    const sunday = '15/11/2026';
    const nextMonday = '16/11/2026';

    const weekMon = getWeekIdentifier(monday);
    const weekWed = getWeekIdentifier(wednesday);
    const weekSun = getWeekIdentifier(sunday);
    const weekNext = getWeekIdentifier(nextMonday);

    expect(weekMon).toBe(weekWed);
    expect(weekMon).toBe(weekSun);
    expect(weekMon).not.toBe(weekNext);
  });
});

describe('Price & Discount Calculations', () => {
  it('calculates discount amount and percentage correctly', () => {
    const result = calculateDiscount(176, 155);
    expect(result.amount).toBe(21.0);
    // (21 / 176) * 100 = 11.9318... -> 11.9%
    expect(result.percent).toBe(11.9);
  });

  it('handles null and edge case values in discount calculation', () => {
    expect(calculateDiscount(null, 155)).toEqual({ amount: null, percent: null });
    expect(calculateDiscount(176, null)).toEqual({ amount: null, percent: null });
    expect(calculateDiscount(0, 155)).toEqual({ amount: null, percent: null });
    // Pro price higher than retail (no discount)
    expect(calculateDiscount(100, 120)).toEqual({ amount: 0, percent: 0 });
  });

  it('calculates price per sachet correctly', () => {
    // Retail: 176 / 40 = 4.40
    expect(calculatePricePerSachet(176, 40)).toBe(4.4);
    // Pro: 155 / 40 = 3.875 -> 3.88
    expect(calculatePricePerSachet(155, 40)).toBe(3.88);
  });

  it('handles null or invalid pack size in price per sachet', () => {
    expect(calculatePricePerSachet(null, 40)).toBeNull();
    expect(calculatePricePerSachet(176, null)).toBeNull();
    expect(calculatePricePerSachet(176, 0)).toBeNull();
  });

  it('formats price with 2 decimal places', () => {
    expect(formatPrice(176)).toBe('176.00');
    expect(formatPrice(155.5)).toBe('155.50');
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
  });
});

describe('Duplicate Promotion Check', () => {
  const basePromo = {
    store: 'Mini BigC',
    brand: 'เนสกาแฟ',
    color: 'แดง,เขียว',
    period: '06/11/2026 - 08/11/2026',
    proPrice: 155.0,
  };

  it('identifies exact duplicate promotions', () => {
    const identicalPromo = { ...basePromo };
    expect(isDuplicatePromotion(basePromo, identicalPromo)).toBe(true);
  });

  it('does not flag as duplicate if any key field differs', () => {
    expect(isDuplicatePromotion(basePromo, { ...basePromo, store: '7-11' })).toBe(false);
    expect(isDuplicatePromotion(basePromo, { ...basePromo, brand: 'เบอร์ดี้' })).toBe(false);
    expect(isDuplicatePromotion(basePromo, { ...basePromo, color: 'แดง' })).toBe(false);
    expect(isDuplicatePromotion(basePromo, { ...basePromo, period: '10/11/2026 - 12/11/2026' })).toBe(false);
    expect(isDuplicatePromotion(basePromo, { ...basePromo, proPrice: 150.0 })).toBe(false);
  });
});

describe('Tracked Brands Validation', () => {
  it('correctly validates the 4 tracked coffee brands', () => {
    expect(isTrackedBrand('เนสกาแฟ')).toBe(true);
    expect(isTrackedBrand('มอคโคน่า')).toBe(true);
    expect(isTrackedBrand('เบอร์ดี้')).toBe(true);
    expect(isTrackedBrand('ซุปเปอร์')).toBe(true);

    expect(isTrackedBrand('เขาช่อง')).toBe(false);
    expect(isTrackedBrand('Starbucks')).toBe(false);
    expect(isTrackedBrand('')).toBe(false);
  });
});

describe('Categories and Sheet Mapping', () => {
  it('maps coffee to PRT tab and noodle to NOODLE tab', async () => {
    const { CATEGORIES, COMMON_NOODLE_BRANDS, NOODLE_SUB_CATEGORIES } = await import('../src/types');
    expect(CATEGORIES.coffee.sheetName).toBe('PRT');
    expect(CATEGORIES.noodle.sheetName).toBe('NOODLE');
    expect(CATEGORIES.all.id).toBe('all');
    expect(CATEGORIES.all.sheetName).toContain('PRT');
    expect(CATEGORIES.all.sheetName).toContain('NOODLE');
    expect(COMMON_NOODLE_BRANDS).toContain('มาม่า');
    expect(COMMON_NOODLE_BRANDS).toContain('ไวไว');
    expect(COMMON_NOODLE_BRANDS).toContain('ยำยำ');
    expect(COMMON_NOODLE_BRANDS).toContain('นิสชิน');
    expect(COMMON_NOODLE_BRANDS).toContain('คนอร์');

    expect(NOODLE_SUB_CATEGORIES).toContain('บะหมี่กึ่งสำเร็จรูป');
    expect(NOODLE_SUB_CATEGORIES).toContain('โจ๊ก');
    expect(NOODLE_SUB_CATEGORIES).toContain('ข้าวต้ม');
    expect(NOODLE_SUB_CATEGORIES).toContain('มันบด');
  });

  it('correctly detects item category in all-in-one scanning mode', async () => {
    const { detectItemCategory } = await import('../src/lib/calc');

    // กาแฟ
    expect(detectItemCategory('เนสกาแฟ', 'เบลนด์ แอนด์ บรู ริช อโรมา')).toBe('coffee');
    expect(detectItemCategory('มอคโคน่า', 'ทรีอินวัน เอสเปรสโซ')).toBe('coffee');
    expect(detectItemCategory('Birdy', 'เบอร์ดี้ โรบัสต้า กาแฟกระป๋อง')).toBe('coffee');
    expect(detectItemCategory('ซุปเปอร์', 'Super Coffee 3in1')).toBe('coffee');
    expect(detectItemCategory('เขาช่อง', 'กาแฟปรุงสำเร็จ')).toBe('coffee');
    expect(detectItemCategory('Boss', 'บอส คอฟฟี่ ลาเต้')).toBe('coffee');

    // บะหมี่ โจ๊ก ข้าวต้ม และอื่นๆ
    expect(detectItemCategory('มาม่า', 'บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง')).toBe('noodle');
    expect(detectItemCategory('ไวไว', 'เส้นหมี่อบแห้ง 180 ก.')).toBe('noodle');
    expect(detectItemCategory('คนอร์', 'คัพโจ๊ก รสหมู')).toBe('noodle');
    expect(detectItemCategory('เกษตร', 'ข้าวต้มกึ่งสำเร็จรูป รสกุ้ง')).toBe('noodle');
    expect(detectItemCategory('เลย์', 'มันฝรั่งทอดกรอบ รสออริจินัล')).toBe('noodle');
  });

  it('correctly classifies items into 4 NOODLE sub-categories', async () => {
    const { classifyNoodleSubCategory } = await import('../src/lib/calc');

    // 1. มันบด
    expect(classifyNoodleSubCategory('คนอร์', 'มันบดกึ่งสำเร็จรูป รสชีส')).toBe('มันบด');
    expect(classifyNoodleSubCategory('Maggi', 'Mashed Potato Instant Cup')).toBe('มันบด');

    // 2. ข้าวต้ม
    expect(classifyNoodleSubCategory('เกษตร', 'ข้าวต้มกึ่งสำเร็จรูป รสกุ้ง')).toBe('ข้าวต้ม');
    expect(classifyNoodleSubCategory('ไทย', 'ไทย ข้าวต้มกึ่งสำเร็จรูป 5 ซอง')).toBe('ข้าวต้ม');
    expect(classifyNoodleSubCategory('ไวไว', 'ไวไว ข้าวต้มกึ่งสำเร็จรูป ทุกรสชาติ 72 ก.')).toBe('ข้าวต้ม');

    // 3. โจ๊ก
    expect(classifyNoodleSubCategory('คนอร์', 'คัพโจ๊ก รสหมู')).toBe('โจ๊ก');
    expect(classifyNoodleSubCategory('มาม่า', 'โจ๊กกึ่งสำเร็จรูป คัพ')).toBe('โจ๊ก');
    expect(classifyNoodleSubCategory('คนอร์', 'คนอร์ โจ๊ก/ข้าวต้ม 57 กรัม')).toBe('โจ๊ก');

    // 4. บะหมี่กึ่งสำเร็จรูป
    expect(classifyNoodleSubCategory('มาม่า', 'มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ')).toBe('บะหมี่กึ่งสำเร็จรูป');
    expect(classifyNoodleSubCategory('ซัมยัง', 'Buldak Carbonara ราเมง')).toBe('บะหมี่กึ่งสำเร็จรูป');
    expect(classifyNoodleSubCategory('นิสชิน', 'ยากิโซบะ รสซอสญี่ปุ่น')).toBe('บะหมี่กึ่งสำเร็จรูป');
    expect(classifyNoodleSubCategory('ไวไว', 'ไวไว ควิก รสต้มโคล้ง')).toBe('บะหมี่กึ่งสำเร็จรูป');
  });

  it('calculates promo expiry status correctly', async () => {
    const { getPromoStatus } = await import('../src/lib/calc');
    const ref = new Date(Date.UTC(2026, 10, 12)); // 12 Nov 2026

    expect(getPromoStatus('01/11/2026 - 30/11/2026', ref)).toBe('active');
    expect(getPromoStatus('วันนี้ - 14/11/2026', ref)).toBe('expiring_soon');
    expect(getPromoStatus('01/10/2026 - 05/11/2026', ref)).toBe('expired');
    expect(getPromoStatus('', ref)).toBe('active');
  });

  it('builds cross-store price comparisons correctly', async () => {
    const { buildCrossStoreComparisons } = await import('../src/lib/calc');
    const sampleItems = [
      { store: 'CJ More', brand: 'มาม่า', itemName: 'ต้มยำกุ้ง', proPrice: '6.00', packSize: 1 },
      { store: 'Mini BigC', brand: 'มาม่า', itemName: 'ต้มยำกุ้ง 60 กรัม', proPrice: '6.50', packSize: 1 },
      { store: "Lotus's", brand: 'มาม่า', itemName: 'ต้มยำกุ้ง แพ็ค 10', proPrice: '62.00', packSize: 10 },
      { store: 'CJ More', brand: 'เนสกาแฟ', itemName: 'กาแฟซองเดียว', proPrice: '5.00', packSize: 1 },
    ];

    const comparisons = buildCrossStoreComparisons(sampleItems);
    expect(comparisons.length).toBe(1);
    expect(comparisons[0].brand).toBe('มาม่า');
    expect(comparisons[0].storeCount).toBe(3);
    expect(comparisons[0].minPrice).toBe(6.00);
    expect(comparisons[0].cheapestStores).toContain('CJ More');
  });

  it('extracts promotion month and builds detailed monthly stats', async () => {
    const { extractPromoMonth, buildMonthlyStats } = await import('../src/lib/calc');

    expect(extractPromoMonth({ date: '15/01/2026' })).toBe(1);
    expect(extractPromoMonth({ period: '01/05/2026 - 31/05/2026' })).toBe(5);
    expect(extractPromoMonth({ period: 'ถึง 20/04/2026' })).toBe(4);
    expect(extractPromoMonth({ period: '' })).toBe(0);

    const testRows = [
      { date: '10/01/2026', store: 'CJ More', brand: 'มาม่า', itemName: 'ต้มยำ', retailPrice: '10', proPrice: '8' },
      { period: '15/01/2026 - 20/01/2026', store: 'Mini BigC', brand: 'มาม่า', itemName: 'หมูสับ', retailPrice: '10', proPrice: '7' },
      { date: '01/05/2026', store: 'Lotus', brand: 'คนอร์', itemName: 'โจ๊ก', retailPrice: '20', proPrice: '15' },
    ];

    const stats = buildMonthlyStats(testRows);
    expect(stats.length).toBe(13); // month 0 (ongoing) + 1-12
    expect(stats[1].count).toBe(2); // 2 in January
    expect(stats[1].fullName).toBe('มกราคม');
    expect(stats[1].topStore).toBe('CJ More'); // CJ More and Mini BigC both 1
    expect(stats[5].count).toBe(1); // 1 in May
    expect(stats[5].topBrand).toBe('คนอร์');
  });

  it('predicts missing promo periods and calculates monthly frequencies', async () => {
    const {
      predictMissingPromoPeriods,
      calculateMonthlyFrequencies,
      buildFrequencyAnalytics,
    } = await import('../src/lib/calc');

    const sampleData = [
      {
        store: "Lotus's",
        brand: 'เนสกาแฟ',
        itemName: 'ริช อโรมา',
        period: '',
        date: '10/01/2026',
      },
      {
        store: "Lotus's",
        brand: 'เนสกาแฟ',
        itemName: 'เอสเปรสโซ',
        period: '08/01/2026 - 28/01/2026',
        date: '12/01/2026',
      },
      {
        store: 'Mini BigC',
        brand: 'มาม่า',
        itemName: 'หมูสับ',
        period: '01/02/2026 - 15/02/2026',
        date: '02/02/2026',
      },
      {
        store: 'Mini BigC',
        brand: 'มาม่า',
        itemName: 'ต้มยำกุ้ง',
        period: '',
        date: '',
      },
    ];

    // 1. Prediction test
    const predicted = predictMissingPromoPeriods(sampleData);
    expect(predicted[0].isPredictedPeriod).toBe(true);
    expect(predicted[0].period).toBe('08/01/2026 - 28/01/2026'); // Imputed from row 1 (forward scan)
    expect(predicted[1].isPredictedPeriod).toBe(false);
    expect(predicted[3].isPredictedPeriod).toBe(true);
    expect(predicted[3].period).toBe('01/02/2026 - 15/02/2026'); // Imputed from row 2 (backward scan)

    // 2. Monthly frequency calculation test
    const withFreq = calculateMonthlyFrequencies(predicted);
    expect(withFreq[0].freqMonth).toBe(2); // Lotus's + เนสกาแฟ + Jan = 2
    expect(withFreq[1].freqMonth).toBe(2);
    expect(withFreq[2].freqMonth).toBe(2); // Mini BigC + มาม่า + Feb = 2
    expect(withFreq[3].freqMonth).toBe(2);

    // 3. Analytics test
    const analytics = buildFrequencyAnalytics(withFreq);
    expect(analytics.predictionStats.total).toBe(4);
    expect(analytics.predictionStats.predicted).toBe(2);
    expect(analytics.predictionStats.predictedPercent).toBe(50);
    expect(analytics.brandFrequencyList.length).toBe(2);
    expect(analytics.topRepeatedSKUs.length).toBeGreaterThan(0);
  });
});

