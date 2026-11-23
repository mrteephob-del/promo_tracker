'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, History, PlusCircle, LayoutDashboard, KeyRound } from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';

export default function Header() {
  const pathname = usePathname();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'บันทึกโปร', shortLabel: 'บันทึก', icon: PlusCircle },
    { href: '/history', label: 'ประวัติ', shortLabel: 'ประวัติ', icon: History },
    { href: '/dashboard', label: 'Dashboard', shortLabel: 'แดชบอร์ด', icon: LayoutDashboard },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20 shrink-0">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-slate-800 tracking-tight block leading-tight">
                Promo Tracker
              </span>
              <span className="hidden sm:block text-[11px] text-amber-700 font-medium leading-tight">
                ระบบวิเคราะห์โปรโมชั่น
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? item.href === '/dashboard'
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs font-semibold'
                        : 'bg-amber-100 text-amber-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* API Key Modal Button */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-slate-600 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 cursor-pointer ml-1"
              title="ตั้งค่า Google Gemini API Key"
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>API Key</span>
            </button>
          </div>

          {/* Mobile Right Quick Action (API Key) */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>API Key</span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly on phones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                isActive ? 'bg-amber-50 text-amber-600' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 leading-none">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />
    </>
  );
}
