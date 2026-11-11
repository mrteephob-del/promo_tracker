'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Coffee, History, PlusCircle, LogOut } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error', e);
    }
  };

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

        {/* Navigation & Logout */}
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
            <span className="hidden xs:inline">บันทึกโปร</span>
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
            <span className="hidden xs:inline">ประวัติ & สรุป</span>
          </Link>

          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

