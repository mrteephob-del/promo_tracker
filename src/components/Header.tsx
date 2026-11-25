'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, PlusCircle, LayoutDashboard, KeyRound, Landmark, ShieldCheck } from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';

export default function Header() {
  const pathname = usePathname();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [thaiDateStr, setThaiDateStr] = useState('');

  useEffect(() => {
    try {
      const now = new Date();
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const dayName = thaiDays[now.getDay()];
      const day = now.getDate();
      const month = thaiMonths[now.getMonth()];
      const year = now.getFullYear() + 543;
      setThaiDateStr(`วัน${dayName}ที่ ${day} ${month} พ.ศ. ${year}`);
    } catch {
      // fallback
    }
  }, []);

  const navLinks: { href: string; label: string; shortLabel: string; icon: any; highlight?: boolean }[] = [
    { href: '/', label: 'บันทึกโปรโมชั่น', shortLabel: 'บันทึก', icon: PlusCircle },
    { href: '/history', label: 'คลังประวัติข้อมูล', shortLabel: 'ประวัติ', icon: History },
    { href: '/dashboard', label: 'ศูนย์วิเคราะห์ข้อมูล', shortLabel: 'แดชบอร์ด', icon: LayoutDashboard },
  ];

  return (
    <>
      {/* THAI GOVERNMENT TOP SERVICE RIBBON */}
      <div className="bg-[#071d3a] text-sky-200/90 text-[11px] py-1 px-4 sm:px-6 lg:px-8 border-b border-blue-900/50">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-semibold text-white tracking-wide truncate">
              ระบบสารสนเทศกลาง e-Service ภาครัฐ
            </span>
            <span className="hidden md:inline text-sky-400/60">|</span>
            <span className="hidden md:inline truncate text-sky-200/80">
              การติดตามและตรวจสอบราคาโปรโมชั่นสินค้าอุปโภคบริโภค
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[10px] sm:text-[11px]">
            {thaiDateStr && (
              <span className="hidden sm:inline text-sky-300/90 font-medium">
                {thaiDateStr}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
              ระบบออนไลน์
            </span>
          </div>
        </div>
      </div>

      {/* MAIN THAI GOVERNMENT NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#0d2b5c] text-white border-b-2 border-sky-400 shadow-md">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-15 sm:h-17 flex items-center justify-between">
          {/* Logo & Official Brand */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#0a2342] via-[#0f346b] to-sky-600 border border-sky-300/40 text-amber-400 flex items-center justify-center shadow-md shadow-blue-950/40 shrink-0 group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base text-white tracking-tight block leading-tight">
                  ระบบติดตามและวิเคราะห์ราคาโปรโมชั่น
                </span>
                <span className="hidden lg:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  e-Price Monitor
                </span>
              </div>
              <span className="hidden sm:block text-[11px] text-sky-200 font-medium leading-tight mt-0.5">
                ระบบสารสนเทศเพื่อการคุ้มครองผู้บริโภคและการพาณิชย์
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isHighlight = item.highlight;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isHighlight
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-orange-950/40 border border-amber-300/50 font-black'
                      : isActive
                      ? 'bg-sky-600 text-white shadow-sm border-b-2 border-sky-200 font-bold'
                      : 'text-sky-100 hover:bg-blue-900/70 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isHighlight ? 'text-amber-100' : isActive ? 'text-white' : 'text-sky-300'}`} />
                  <span>{item.label}</span>
                  {isHighlight && (
                    <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded-full font-black">
                      HOT
                    </span>
                  )}
                </Link>
              );
            })}

            {/* API Key Modal Button */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors bg-[#081e3a] hover:bg-blue-900 text-sky-200 hover:text-white border border-sky-400/40 cursor-pointer ml-1.5"
              title="ตั้งค่า Google Gemini API Key"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>ตั้งค่าระบบ</span>
            </button>
          </div>

          {/* Mobile Right Quick Action (API Key) */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-sky-100 bg-[#081e3a] hover:bg-blue-900 border border-sky-400/40 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>ตั้งค่า</span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d2b5c]/95 backdrop-blur-md border-t border-sky-900/60 py-1.5 px-2 flex items-center justify-around shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isHighlight = item.highlight;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isHighlight
                  ? 'text-amber-300 font-black'
                  : isActive
                  ? 'text-sky-300 font-bold'
                  : 'text-sky-200/60 hover:text-white font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                isHighlight ? 'bg-amber-500/20 text-amber-300' : isActive ? 'bg-sky-500/20 text-sky-300' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 leading-none font-bold">
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
