'use client';

import React from 'react';

/**
 * แผนผัง URL รูปภาพโลโก้ร้านค้าทางการในระบบ (Public Logos)
 */
export const STORE_LOGOS: Record<string, string> = {
  'CJ More': '/logos/cj.jpg',
  'CJ Express': '/logos/cj.jpg',
  'CJ': '/logos/cj.jpg',
  'Mini BigC': '/logos/minibigc.png',
  'Big C': '/logos/minibigc.png',
  'BigC': '/logos/minibigc.png',
  'Lotus Go Fresh': '/logos/lotus.png',
  "Lotus's": '/logos/lotus.png',
  'Lotus': '/logos/lotus.png',
  'โลตัส': '/logos/lotus.png',
  'Tops': '/logos/tops.png',
  'Top': '/logos/tops.png',
  'ท็อปส์': '/logos/tops.png',
};

/**
 * ดึง path รูปโลโก้ของร้านค้า
 */
export function getStoreLogo(storeName: string): string | null {
  if (!storeName) return null;
  const trimmed = storeName.trim();
  if (STORE_LOGOS[trimmed]) return STORE_LOGOS[trimmed];

  const lower = trimmed.toLowerCase();
  if (lower.includes('cj') || lower.includes('ซีเจ')) return '/logos/cj.jpg';
  if (lower.includes('bigc') || lower.includes('big c') || lower.includes('บิ๊กซี')) return '/logos/minibigc.png';
  if (lower.includes('lotus') || lower.includes('โลตัส')) return '/logos/lotus.png';
  if (lower.includes('top') || lower.includes('ท็อป')) return '/logos/tops.png';

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
  className = 'w-5 h-5',
  imgClassName = 'object-contain',
  fallbackIcon,
}: StoreLogoProps) {
  const logoUrl = getStoreLogo(store);

  if (!logoUrl) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-500 font-bold shrink-0 shadow-2xs border border-slate-200/80 ${className}`}
        title={store}
      >
        {fallbackIcon || <span className="text-[10px]">🏪</span>}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-md overflow-hidden bg-white shrink-0 shadow-2xs border border-slate-200/80 p-0.5 ${className}`}
      title={store}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={store}
        className={`w-full h-full rounded-sm ${imgClassName}`}
        loading="lazy"
      />
    </span>
  );
}
