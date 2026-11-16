'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, History, PlusCircle, LayoutDashboard, KeyRound } from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';

export default function Header() {
  const pathname = usePathname();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  return (
    <>
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
                ระบบวิเคราะห์โปรโมชั่น
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1 sm:gap-2">
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
              <span>ประวัติ</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="font-semibold">Dashboard</span>
            </Link>

            {/* API Key Modal Button */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-slate-600 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 cursor-pointer ml-1"
              title="ตั้งค่า Google Gemini API Key"
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">API Key</span>
            </button>
          </div>
        </div>
      </header>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />
    </>
  );
}
