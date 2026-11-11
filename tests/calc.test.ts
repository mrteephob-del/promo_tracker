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

