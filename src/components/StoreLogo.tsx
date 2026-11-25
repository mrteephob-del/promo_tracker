'use client';

import React from 'react';
import { STORE_LOGOS_DATA_URI } from '@/data/storeLogosBase64';

/**
 * แผนผัง Data URI รูปภาพโลโก้ร้านค้าทางการในระบบ (Base64 Encoded)
 * โหลดได้ทันที 100% โดยไม่ต้องส่ง HTTP Request และไม่ได้รับผลกระทบจาก basePath หรือการตั้งค่าโฮสต์
 */
export const STORE_LOGOS: Record<string, string> = {
  'CJ More': STORE_LOGOS_DATA_URI.cj,
  'CJ Express': STORE_LOGOS_DATA_URI.cj,
  'CJ': STORE_LOGOS_DATA_URI.cj,
  'Mini BigC': STORE_LOGOS_DATA_URI.minibigc,
  'Big C': STORE_LOGOS_DATA_URI.minibigc,
  'BigC': STORE_LOGOS_DATA_URI.minibigc,
  'Lotus Go Fresh': STORE_LOGOS_DATA_URI.lotus,
  "Lotus's": STORE_LOGOS_DATA_URI.lotus,
  'Lotus': STORE_LOGOS_DATA_URI.lotus,
  'โลตัส': STORE_LOGOS_DATA_URI.lotus,
  'Tops': STORE_LOGOS_DATA_URI.tops,
  'Top': STORE_LOGOS_DATA_URI.tops,
  'ท็อปส์': STORE_LOGOS_DATA_URI.tops,
};

/**
 * ดึง Data URI รูปโลโก้ของร้านค้า
 */
export function getStoreLogo(storeName: string): string | null {
  if (!storeName) return null;
  const trimmed = storeName.trim();
  if (STORE_LOGOS[trimmed]) return STORE_LOGOS[trimmed];

  const lower = trimmed.toLowerCase();
  if (lower.includes('cj') || lower.includes('ซีเจ')) return STORE_LOGOS_DATA_URI.cj;
  if (lower.includes('bigc') || lower.includes('big c') || lower.includes('บิ๊กซี')) return STORE_LOGOS_DATA_URI.minibigc;
  if (lower.includes('lotus') || lower.includes('โลตัส')) return STORE_LOGOS_DATA_URI.lotus;
  if (lower.includes('top') || lower.includes('ท็อป')) return STORE_LOGOS_DATA_URI.tops;

  return null;
}

interface StoreLogoProps {
  store: string;
  className?: string;
  imgClassName?: string;
  fallbackIcon?: React.ReactNode;
}

/**
 * คอมโพเนนต์แสดงโลโก้ร้านค้าอย่างสวยงาม คมชัด รองรับทุกมุมมองในระบบ
 */
export default function StoreLogo({
  store,
  className = 'w-7 h-7',
  imgClassName = 'object-contain',
  fallbackIcon,
}: StoreLogoProps) {
  const logoUrl = getStoreLogo(store);

  if (!logoUrl) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-bold shrink-0 shadow-2xs border border-slate-200/80 ${className}`}
        title={store}
      >
        {fallbackIcon || <span className="text-[10px]">🏪</span>}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-lg overflow-hidden bg-white shrink-0 shadow-2xs border border-slate-200/80 p-0.5 ${className}`}
      title={store}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={store}
        className={`w-full h-full rounded-md ${imgClassName}`}
        loading="eager"
      />
    </span>
  );
}
