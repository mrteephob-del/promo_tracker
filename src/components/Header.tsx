'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, History, PlusCircle } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-800 tracking-tight block leading-tight">
              Promo Tracker
            </span>
            <span className="text-[11px] text-amber-700 font-medium block">
              บันทึกโปรโมชั่นกาแฟซอง
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'bg-amber-100 text-amber-900'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกโปร</span>
          </Link>

          <Link
            href="/history"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              pathname === '/history'
                ? 'bg-amber-100 text-amber-900'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติ & สรุป</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
