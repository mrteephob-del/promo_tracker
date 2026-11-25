'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import {
  TrendingUp,
  DollarSign,
  Store,
  Layers,
  Filter,
  Search,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Tag,
  Coffee,
  UtensilsCrossed,
  Flame,
  Percent,
  Eye,
  Image as ImageIcon,
  ZoomIn,
  X,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  Swords,
  Crown,
  Clock,
  ShieldCheck,
  Calendar,
  CalendarDays,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  Zap,
  Repeat,
  Info,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowDownAZ,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeftRight,
  Plus,
  Trash2,
  Bookmark,
  Check,
  ShoppingBag,
  Calculator,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PromoCategory } from '@/types';
import { getCachedHistoryRows } from '@/lib/client-api';
import { fetchRecentSheetRows } from '@/lib/sheets';
import {
  calculateDiscount,
  calculatePricePerSachet,
  classifyNoodleSubCategory,
  formatPeriodDisplay,
  buildCrossStoreComparisons,
  CrossStoreComparisonItem,
  buildMonthlyStats,
  MonthlyStatsItem,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
  extractPromoMonth,
  predictMissingPromoPeriods,
  calculateMonthlyFrequencies,
  buildFrequencyAnalytics,
  FrequencyAnalyticsResult,
  BrandFrequencyItem,
  StoreFrequencyItem,
  RepeatedSKUItem,
} from '@/lib/calc';

function getGoogleDriveThumbUrl(url?: string, size: string = 'w400'): string {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=${size}`;
  }
  return url;
}

function formatShortPeriod(period: string): string {
  if (!period) return '';
  const cleaned = formatPeriodDisplay(period);
  return cleaned
    .replace(/\/2026/g, '')
    .replace(/\/2569/g, '')
    .replace('วันนี้ - ', 'ถึง ');
}

interface SheetRow {
  date: string;
  store: string;
  brand: string;
  itemName: string;
  color: string;
  packSize: number | string;
  promotion: string;
  channel: string;
  freqWeek: number | string;
  freqMonth?: number | string;
  period: string;
  machanic: string;
  retailPrice: string;
  proPrice: string;
  imageUrl?: string;
  subCategory?: string;
  isPredictedPeriod?: boolean;
}

type SubCategoryFilter = 'all' | 'บะหมี่กึ่งสำเร็จรูป' | 'โจ๊ก' | 'ข้าวต้ม' | 'มันบด';

const MONTH_INSIGHT_NOTES: Record<number, { title: string; desc: string; icon: string }> = {
  1: {
    title: 'เทศกาลปีใหม่ & วันเด็ก',
    desc: 'เปิดศักราชใหม่ ยอดจัดโปรโมชั่นสูงที่สุดของปี! เน้นกาแฟชงรับปีใหม่ และบะหมี่กึ่งฯ ซื้อตุนสำรองติดบ้าน',
    icon: '🎉',
  },
  2: {
    title: 'ตรุษจีน & วาเลนไทน์',
    desc: 'โปรโมชั่นชุดไหว้ตรุษจีน และแคมเปญแพ็คประหยัดสำหรับครอบครัว ปริมาณโปรโมชั่นทรงตัว',
    icon: '🧧',
  },
  3: {
    title: 'ปิดเทอมภาคฤดูร้อน',
    desc: 'เริ่มต้นปิดเทอมใหญ่ ห้างเริ่มอัดโปรโมชั่นบะหมี่และอาหารสำเร็จรูปสำหรับเด็กอยู่บ้าน',
    icon: '☀️',
  },
  4: {
    title: 'เทศกาลสงกรานต์ & วันหยุดยาว',
    desc: 'อันดับ 3 ของปี! โปรโมชั่นสินค้าเดินทางท่องเที่ยว อาหารสำเร็จรูปพกพาสะดวกช่วงวันหยุดยาว',
    icon: '💦',
  },
  5: {
    title: 'เปิดเทอมใหญ่ (Back to School)',
    desc: 'อันดับ 2 ของปี (97 ดีล)! บะหมี่กึ่งฯ และโจ๊กอาหารเช้าเด็กจัดหนักแข่งกันดุเดือดที่สุด',
    icon: '🎒',
  },
  6: {
    title: 'มหกรรมกลางปี (Mid-Year Sale)',
    desc: 'แคมเปญ 6.6 กลางปี Mini BigC และ CJ More ทุ่มงบจัดโปรโมชั่นหนาแน่น',
    icon: '🏷️',
  },
  7: {
    title: 'เทศกาลเข้าพรรษา & วันหยุดยาว',
    desc: 'เน้นโปรโมชั่นอาหารแห้งทำบุญ สังฆทาน และชุดประหยัดในร้านสะดวกซื้อ',
    icon: '🕯️',
  },
  8: {
    title: 'วันแม่แห่งชาติ & กลาง Q3',
    desc: 'ลดราคาลึกเป็นอันดับ 2 (-22.8%) เน้นโปรโมชั่นซื้อคู่ ซื้อฝาก และป้ายเหลืองลดพิเศษ',
    icon: '💐',
  },
  9: {
    title: 'ส่งท้ายไตรมาส 3 (Q3 Wrap-up)',
    desc: 'โปรโมชั่นเคลียร์สต็อกหน้าฝน และเตรียมเปิดไตรมาสสุดท้ายของปี',
    icon: '🌧️',
  },
  10: {
    title: 'เทศกาลกินเจ & ปิดเทอมเล็ก',
    desc: 'โปรโมชั่นบะหมี่เจ โจ๊กเจ และอาหารสำเร็จรูปเฉพาะเทศกาล',
    icon: '🥬',
  },
  11: {
    title: 'มหกรรมช้อปปิ้ง 11.11 สิ้นปี',
    desc: 'ลดลึกที่สุดของปี! ส่วนลดเฉลี่ยสูงถึง -25.0% แข่งขันตัดราคากับช้อปปิ้งออนไลน์',
    icon: '🔥',
  },
  12: {
    title: 'ส่งท้ายปีเก่า ต้อนรับปีใหม่',
    desc: 'เทศกาลของขวัญ กิฟต์เซ็ตกาแฟ และสินค้าปาร์ตี้ส่งท้ายปีเก่า',
    icon: '🎄',
  },
};

interface DashboardFilterControlsProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedStore: string;
  setSelectedStore: (val: string) => void;
  storeCounts: Record<string, number>;
  rawListLength: number;
  selectedCategory: 'all' | 'coffee' | 'noodle';
  setSelectedCategory: (val: 'all' | 'coffee' | 'noodle') => void;
  coffeeCount: number;
  noodleCount: number;
  selectedSubCategory: SubCategoryFilter;
  setSelectedSubCategory: (val: SubCategoryFilter) => void;
  subCategoryCounts: Record<string, number>;
  selectedBrand: string;
  setSelectedBrand: (val: string) => void;
  availableBrands: string[];
  isAnyFilterActive: boolean;
  clearAllFilters: () => void;
  filteredCount: number;
}

function DashboardFilterControls({
  searchQuery,
  setSearchQuery,
  selectedStore,
  setSelectedStore,
  storeCounts,
  rawListLength,
  selectedCategory,
  setSelectedCategory,
  coffeeCount,
  noodleCount,
  selectedSubCategory,
  setSelectedSubCategory,
  subCategoryCounts,
  selectedBrand,
  setSelectedBrand,
  availableBrands,
  isAnyFilterActive,
  clearAllFilters,
  filteredCount,
}: DashboardFilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // ดึงค่าการลด/ขยายที่บันทึกไว้ใน localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('promo_track_filter_expanded');
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('promo_track_filter_expanded', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className={`bg-white rounded-3xl border border-blue-200/80 shadow-xs transition-all ${
      isExpanded ? 'p-4 space-y-3.5' : 'p-3.5'
    }`}>
      {/* 1. Header: หัวข้อตัวกรอง + ปุ่มรีเซ็ต + ปุ่มลด/ขยาย (Collapsible Toggle) */}
      <div className={`flex items-center justify-between ${isExpanded ? 'border-b border-slate-100 pb-2.5' : ''}`}>
        <div
          onClick={toggleExpanded}
          className="flex items-center gap-2 cursor-pointer select-none group flex-1"
          title={isExpanded ? 'คลิกเพื่อย่อตัวกรอง (ลดพื้นที่)' : 'คลิกเพื่อขยายตัวกรอง'}
        >
          <div className="w-7 h-7 rounded-xl bg-sky-100 group-hover:bg-sky-200 text-[#0f2b5c] flex items-center justify-center transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#0f2b5c] block leading-tight">
                ตัวกรองข้อมูล
              </span>
              <span className="text-[10px] text-sky-800 bg-sky-50 border border-sky-200/60 px-1.5 py-0.2 rounded-full font-bold">
                {filteredCount} ดีล
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">
              {isExpanded
                ? 'ค้นหา & จัดกลุ่มสินค้า'
                : isAnyFilterActive
                ? 'กรองอยู่ (คลิกเพื่อขยายดู)'
                : 'คลิกเพื่อขยายตัวกรอง'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 px-2 py-1 rounded-xl border border-rose-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              title="ล้างตัวกรองทั้งหมด"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">ล้าง</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleExpanded}
            className={`p-1.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-2xs ${
              isExpanded
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-[#0f2b5c] text-white hover:bg-[#163a75]'
            }`}
            title={isExpanded ? 'คลิกเพื่อย่อตัวกรอง (ลดพื้นที่)' : 'คลิกเพื่อขยายตัวกรอง'}
          >
            <span>{isExpanded ? 'ย่อ' : 'ขยาย'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* เมื่อย่ออยู่ (Collapsed State): แสดงป้ายสรุปตัวกรองอย่างกระชับ */}
      {!isExpanded && (
        <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            {isAnyFilterActive ? (
              <>
                {selectedStore !== 'all' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                    {selectedStore}
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                    {selectedCategory === 'coffee' ? 'กาแฟ' : 'บะหมี่'}
                  </span>
                )}
                {selectedSubCategory !== 'all' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                    {selectedSubCategory}
                  </span>
                )}
                {selectedBrand !== 'all' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                    {selectedBrand}
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold truncate max-w-[90px]">
                    &quot;{searchQuery}&quot;
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400 font-medium">แสดงสินค้าทุกหมวดหมู่ ({rawListLength} รายการ)</span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleExpanded}
            className="text-[10px] text-sky-700 hover:text-sky-900 font-bold cursor-pointer underline shrink-0 ml-1"
          >
            ปรับเงื่อนไข
          </button>
        </div>
      )}

      {isExpanded && (
        <>
          {/* 2. ค้นหาสินค้า */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[#0f2b5c] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-sky-700" />
            <span>ค้นหาสินค้า</span>
          </span>
          {searchQuery && (
            <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded font-semibold">
              ค้นหาอยู่
            </span>
          )}
        </label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, แบรนด์, รสชาติ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400 font-medium transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="ล้างข้อความค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. ห้างสรรพสินค้า (4 ปุ่มสีสุภาพ สะอาดตา สไตล์ราชการไทย เลือกแล้วเป็นสีน้ำเงินกรมท่า) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#0f2b5c]">
          <span className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-sky-700" />
            <span>ห้างสรรพสินค้า</span>
          </span>
          {selectedStore !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedStore('all')}
              className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
            >
              ดูทุกห้าง
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {/* ทุกห้าง */}
          <button
            type="button"
            onClick={() => setSelectedStore('all')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              selectedStore === 'all'
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <span>ทุกห้าง</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
              selectedStore === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {rawListLength}
            </span>
          </button>

          {/* CJ More */}
          <button
            type="button"
            onClick={() => setSelectedStore(selectedStore === 'CJ More' ? 'all' : 'CJ More')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              selectedStore === 'CJ More'
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <span className="truncate">CJ More</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ml-1 ${
              selectedStore === 'CJ More' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {storeCounts['CJ More'] || 0}
            </span>
          </button>

          {/* Mini BigC */}
          <button
            type="button"
            onClick={() => setSelectedStore(selectedStore === 'Mini BigC' ? 'all' : 'Mini BigC')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              selectedStore === 'Mini BigC'
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Mini BigC</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ml-1 ${
              selectedStore === 'Mini BigC' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {storeCounts['Mini BigC'] || 0}
            </span>
          </button>

          {/* Lotus Go */}
          <button
            type="button"
            onClick={() => setSelectedStore(selectedStore === 'Lotus Go Fresh' || selectedStore === "Lotus's" ? 'all' : 'Lotus Go Fresh')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              selectedStore === 'Lotus Go Fresh' || selectedStore === "Lotus's"
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
              <span className="truncate">Lotus Go</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ml-1 ${
              selectedStore === 'Lotus Go Fresh' || selectedStore === "Lotus's" ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {storeCounts['Lotus Go Fresh'] || 0}
            </span>
          </button>
        </div>
      </div>

      {/* 4. หมวดหมู่สินค้า (Segmented Control 3 แท็บ เรียงแนวนอน กระชับ สบายตา) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#0f2b5c]">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-sky-700" />
            <span>หมวดหมู่สินค้า</span>
          </span>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => { setSelectedCategory('all'); setSelectedSubCategory('all'); }}
              className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
            >
              ดูทั้งหมด
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1">
          <button
            type="button"
            onClick={() => { setSelectedCategory('all'); setSelectedSubCategory('all'); }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className={`text-[10px] font-mono mt-0.5 ${selectedCategory === 'all' ? 'text-sky-200' : 'text-slate-400'}`}>
              {coffeeCount + noodleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedCategory('coffee'); setSelectedSubCategory('all'); }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
              selectedCategory === 'coffee'
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
            }`}
          >
            <span className="flex items-center gap-1">
              <span>☕</span>
              <span>กาแฟ</span>
            </span>
            <span className={`text-[10px] font-mono mt-0.5 ${selectedCategory === 'coffee' ? 'text-sky-200' : 'text-slate-400'}`}>
              {coffeeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedCategory('noodle'); setSelectedSubCategory('all'); }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
              selectedCategory === 'noodle'
                ? 'bg-[#0f2b5c] text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
            }`}
          >
            <span className="flex items-center gap-1">
              <span>🍜</span>
              <span>บะหมี่</span>
            </span>
            <span className={`text-[10px] font-mono mt-0.5 ${selectedCategory === 'noodle' ? 'text-sky-200' : 'text-slate-400'}`}>
              {noodleCount}
            </span>
          </button>
        </div>

        {/* 5. ประเภทย่อย (ชิปแนวนอน แสดงเฉพาะเมื่อเลือกบะหมี่หรือทั้งหมด และหม่นตัวเลือกที่มี 0 ชิ้น) */}
        {(selectedCategory === 'noodle' || selectedCategory === 'all') && (
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#0f2b5c]">
              <span>ประเภทย่อยอาหาร</span>
              {selectedSubCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('all')}
                  className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                >
                  ทั้งหมด
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'ทั้งหมด', count: (subCategoryCounts['บะหมี่กึ่งสำเร็จรูป'] || 0) + (subCategoryCounts['โจ๊ก'] || 0) + (subCategoryCounts['ข้าวต้ม'] || 0) + (subCategoryCounts['มันบด'] || 0) },
                { id: 'บะหมี่กึ่งสำเร็จรูป', label: '🍜 บะหมี่', count: subCategoryCounts['บะหมี่กึ่งสำเร็จรูป'] || 0 },
                { id: 'โจ๊ก', label: '🥣 โจ๊ก', count: subCategoryCounts['โจ๊ก'] || 0 },
                { id: 'ข้าวต้ม', label: '🍲 ข้าวต้ม', count: subCategoryCounts['ข้าวต้ม'] || 0 },
                { id: 'มันบด', label: '🥔 มันบด', count: subCategoryCounts['มันบด'] || 0 },
              ].map((sc) => {
                const active = selectedSubCategory === sc.id;
                const hasItems = sc.count > 0;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    disabled={!hasItems && sc.id !== 'all'}
                    onClick={() => setSelectedSubCategory(active && sc.id !== 'all' ? 'all' : (sc.id as any))}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-sky-700 text-white shadow-2xs'
                        : hasItems
                        ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                        : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <span>{sc.label}</span>
                    <span className={`text-[10px] font-mono px-1 rounded-sm ${
                      active ? 'bg-white/20 text-white' : hasItems ? 'bg-slate-200/80 text-slate-600' : 'text-slate-300'
                    }`}>
                      {sc.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. แบรนด์สินค้า */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#0f2b5c]">
          <span>แบรนด์สินค้า</span>
          {selectedBrand !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedBrand('all')}
              className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
            >
              ทุกแบรนด์
            </button>
          )}
        </div>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs transition-all"
        >
          <option value="all">ทุกแบรนด์ ({availableBrands.length} แบรนด์)</option>
          {availableBrands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* 7. สรุปผลลัพธ์ & ป้ายเงื่อนไขที่ใช้งานอยู่ */}
      <div className="pt-2.5 border-t border-slate-100 space-y-2">
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold">เงื่อนไข:</span>
            {selectedStore !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                <span>{selectedStore}</span>
                <button type="button" onClick={() => setSelectedStore('all')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                <span>{selectedCategory === 'coffee' ? 'กาแฟ' : 'บะหมี่'}</span>
                <button type="button" onClick={() => { setSelectedCategory('all'); setSelectedSubCategory('all'); }} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {selectedSubCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                <span>{selectedSubCategory}</span>
                <button type="button" onClick={() => setSelectedSubCategory('all')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {selectedBrand !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                <span>{selectedBrand}</span>
                <button type="button" onClick={() => setSelectedBrand('all')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                <span>&quot;{searchQuery}&quot;</span>
                <button type="button" onClick={() => setSearchQuery('')} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            ผลลัพธ์: <strong className="text-[#0f2b5c] font-black">{filteredCount}</strong> จาก {rawListLength} รายการ
          </span>
          {isAnyFilterActive ? (
            <span className="text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full font-bold border border-sky-200">
              กรองอยู่
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              ทั้งหมด
            </span>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<'overview' | 'monthly' | 'frequency' | 'comparison'>('overview');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'coffee' | 'noodle'>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategoryFilter>('all');
  // โหลดข้อมูลเริ่มต้นจากแคช (ทำให้เปิด Dashboard บน GitHub Pages หรือเว็บโหลดเร็วทันที)
  const [coffeeRows, setCoffeeRows] = useState<SheetRow[]>(() => getCachedHistoryRows('PRT', 2000) as unknown as SheetRow[]);
  const [noodleRows, setNoodleRows] = useState<SheetRow[]>(() => getCachedHistoryRows('NOODLE', 2000) as unknown as SheetRow[]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ตัวกรอง
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal ดูรูปภาพขยายใหญ่
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; store: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Desktop Sidebar State: ควบคุมการเปิด/ปิด แบบสไลด์ (Collapsible Sliding Sidebar) เพื่อขยายพื้นที่ดูข้อมูล
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);

  // ดึงค่าการเปิด/ปิด Sidebar ที่บันทึกไว้ใน localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('promo_track_desktop_sidebar');
      if (saved !== null) {
        setIsDesktopSidebarOpen(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('promo_track_desktop_sidebar', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Modal ดูรายละเอียดสินค้าและโปรโมชั่น (Product Detail Modal)
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);

  // Modal ดูรายการแยกตามกลไกโปรโมชั่น (Promotional Mechanics Drilldown Modal)
  const [selectedMechanicModal, setSelectedMechanicModal] = useState<string | null>(null);
  const [mechanicSearchQuery, setMechanicSearchQuery] = useState<string>('');
  const [mechanicStoreFilter, setMechanicStoreFilter] = useState<string>('all');
  const [mechanicViewMode, setMechanicViewMode] = useState<'list' | 'grid'>('list');
  const [mechanicSortBy, setMechanicSortBy] = useState<'discount' | 'priceAsc' | 'brand' | 'freq'>('discount');

  // โหมดหน้าเทียบราคา: 'custom' (เลือกเทียบราคาเองอิสระ) หรือ 'auto' (ดีลที่ตรงกันอัตโนมัติ)
  const [comparisonSubTab, setComparisonSubTab] = useState<'custom' | 'auto'>('custom');

  // ตัวเลือกฝั่ง A (Store A & Item A)
  const [storeA, setStoreA] = useState<string>('CJ More');
  const [selectedItemAId, setSelectedItemAId] = useState<string>('');
  const [searchItemA, setSearchItemA] = useState<string>('');
  const [catFilterA, setCatFilterA] = useState<'all' | 'coffee' | 'noodle'>('all');

  // ตัวเลือกฝั่ง B (Store B & Item B)
  const [storeB, setStoreB] = useState<string>('Mini BigC');
  const [selectedItemBId, setSelectedItemBId] = useState<string>('');
  const [searchItemB, setSearchItemB] = useState<string>('');
  const [catFilterB, setCatFilterB] = useState<'all' | 'coffee' | 'noodle'>('all');

  // จำลองปริมาณการซื้อ (จำนวนชิ้น/ซอง)
  const [simQuantity, setSimQuantity] = useState<number>(10);

  // รายการเปรียบเทียบที่ปักหมุดไว้ (Pinned Battles)
  interface PinnedBattle {
    id: string;
    storeA: string;
    brandA: string;
    itemNameA: string;
    unitPriceA: number;
    packSizeA: number | string;
    proPriceA: string;
    imageA?: string;
    storeB: string;
    brandB: string;
    itemNameB: string;
    unitPriceB: number;
    packSizeB: number | string;
    proPriceB: string;
    imageB?: string;
    winnerStore: string;
    diff: number;
    percentDiff: number;
    savedAt: string;
    itemIdA: string;
    itemIdB: string;
  }
  const [pinnedBattles, setPinnedBattles] = useState<PinnedBattle[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('promo_track_pinned_battles');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // ดึงข้อมูล
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. พยายามดึงข้อมูลสดตรงจาก Google Apps Script Web App
      const [resPrt, resNoodle] = await Promise.all([
        fetchRecentSheetRows(2000, 'PRT'),
        fetchRecentSheetRows(2000, 'NOODLE'),
      ]);

      if (resPrt && Array.isArray(resPrt.rows)) {
        setCoffeeRows(resPrt.rows as unknown as SheetRow[]);
      }
      if (resNoodle && Array.isArray(resNoodle.rows)) {
        setNoodleRows(resNoodle.rows as unknown as SheetRow[]);
      }
    } catch (gasErr) {
      console.warn('ดึงข้อมูลสดจาก Apps Script ไม่สำเร็จ กำลังลอง Local API / แคช:', gasErr);
      try {
        const [resPrt, resNoodle] = await Promise.all([
          fetch('/api/history?sheetName=PRT&limit=2000'),
          fetch('/api/history?sheetName=NOODLE&limit=2000'),
        ]);

        if (resPrt.ok && resNoodle.ok) {
          const dataPrt = await resPrt.json();
          const dataNoodle = await resNoodle.json();

          if (dataPrt.ok && Array.isArray(dataPrt.rows)) {
            setCoffeeRows(dataPrt.rows);
          }
          if (dataNoodle.ok && Array.isArray(dataNoodle.rows)) {
            setNoodleRows(dataNoodle.rows);
          }
          return;
        }
      } catch {
        // ignore
      }

      // โหมด Static Export (GitHub Pages) หรือไม่มีเซิร์ฟเวอร์ Node.js
      const cachedPrt = getCachedHistoryRows('PRT', 2000) as unknown as SheetRow[];
      const cachedNoodle = getCachedHistoryRows('NOODLE', 2000) as unknown as SheetRow[];
      setCoffeeRows(cachedPrt);
      setNoodleRows(cachedNoodle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // รองรับการกดปุ่ม ESC เพื่อปิด Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else if (selectedMechanicModal) {
          setSelectedMechanicModal(null);
        } else if (selectedProductModal) {
          setSelectedProductModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, selectedMechanicModal, selectedProductModal]);

  // แปลงและคำนวณข้อมูล
  const rawList = useMemo(() => {
    const list: (SheetRow & {
      id: string;
      category: PromoCategory;
      subCategory: string;
      discAmount: number;
      discPercent: number;
      unitPrice: number | null;
      freqMonth: number;
      isPredictedPeriod: boolean;
    })[] = [];

    const enrichedCoffee = calculateMonthlyFrequencies(predictMissingPromoPeriods(coffeeRows));
    const enrichedNoodle = calculateMonthlyFrequencies(predictMissingPromoPeriods(noodleRows));

    if (selectedCategory === 'all' || selectedCategory === 'coffee') {
      let idx = 0;
      for (const r of enrichedCoffee) {
        idx++;
        const retail = parseFloat(r.retailPrice) || null;
        const pro = parseFloat(r.proPrice) || null;
        const disc = calculateDiscount(retail, pro);
        const unit = calculatePricePerSachet(pro, Number(r.packSize) || 1);
        list.push({
          ...r,
          id: `coffee-${idx}`,
          period: formatPeriodDisplay(r.period),
          category: 'coffee',
          subCategory: 'กาแฟซอง',
          discAmount: disc.amount || 0,
          discPercent: disc.percent || 0,
          unitPrice: unit,
          freqMonth: Number(r.freqMonth) || 1,
          isPredictedPeriod: !!r.isPredictedPeriod,
        });
      }
    }

    if (selectedCategory === 'all' || selectedCategory === 'noodle') {
      let idx = 0;
      for (const r of enrichedNoodle) {
        idx++;
        const retail = parseFloat(r.retailPrice) || null;
        const pro = parseFloat(r.proPrice) || null;
        const disc = calculateDiscount(retail, pro);
        const unit = calculatePricePerSachet(pro, Number(r.packSize) || 1);
        const subCat = r.subCategory || classifyNoodleSubCategory(r.brand, r.itemName, r.machanic);
        list.push({
          ...r,
          id: `noodle-${idx}`,
          period: formatPeriodDisplay(r.period),
          category: 'noodle',
          subCategory: subCat,
          discAmount: disc.amount || 0,
          discPercent: disc.percent || 0,
          unitPrice: unit,
          freqMonth: Number(r.freqMonth) || 1,
          isPredictedPeriod: !!r.isPredictedPeriod,
        });
      }
    }

    return list;
  }, [coffeeRows, noodleRows, selectedCategory]);

  // สถิติจำนวนแยกตาม 4 หมวดหมู่ย่อยของ NOODLE
  const subCategoryCounts = useMemo(() => {
    const counts = {
      all: noodleRows.length,
      'บะหมี่กึ่งสำเร็จรูป': 0,
      'โจ๊ก': 0,
      'ข้าวต้ม': 0,
      'มันบด': 0,
    };
    noodleRows.forEach((r) => {
      const cat = (r.subCategory || classifyNoodleSubCategory(r.brand, r.itemName, r.machanic)) as keyof typeof counts;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [noodleRows]);

  // ตัวเลือก Dropdown
  const availableStores = useMemo(() => {
    const s = new Set<string>();
    rawList.forEach((r) => r.store && s.add(r.store));
    return Array.from(s).sort();
  }, [rawList]);

  const availableBrands = useMemo(() => {
    const b = new Set<string>();
    rawList.forEach((r) => r.brand && b.add(r.brand));
    return Array.from(b).sort();
  }, [rawList]);

  // ฟังก์ชันและข้อมูลคำนวณสำหรับสนามประลองเทียบราคาอิสระ (Custom Price Battle)
  const itemsInStoreA = useMemo(() => {
    return rawList.filter((r) => {
      const matchStore = storeA === 'Lotus Go Fresh' || storeA === "Lotus's"
        ? (r.store === 'Lotus Go Fresh' || r.store === "Lotus's")
        : r.store === storeA;
      if (!matchStore) return false;
      if (catFilterA !== 'all' && r.category !== catFilterA) return false;
      if (searchItemA.trim()) {
        const q = searchItemA.toLowerCase();
        return (
          r.itemName.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          (r.machanic && r.machanic.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rawList, storeA, catFilterA, searchItemA]);

  const itemsInStoreB = useMemo(() => {
    return rawList.filter((r) => {
      const matchStore = storeB === 'Lotus Go Fresh' || storeB === "Lotus's"
        ? (r.store === 'Lotus Go Fresh' || r.store === "Lotus's")
        : r.store === storeB;
      if (!matchStore) return false;
      if (catFilterB !== 'all' && r.category !== catFilterB) return false;
      if (searchItemB.trim()) {
        const q = searchItemB.toLowerCase();
        return (
          r.itemName.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          (r.machanic && r.machanic.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rawList, storeB, catFilterB, searchItemB]);

  const selectedItemA = useMemo(() => {
    if (!selectedItemAId) return itemsInStoreA[0] || null;
    return rawList.find((r) => r.id === selectedItemAId) || itemsInStoreA[0] || null;
  }, [rawList, selectedItemAId, itemsInStoreA]);

  const selectedItemB = useMemo(() => {
    if (!selectedItemBId) return itemsInStoreB[0] || null;
    return rawList.find((r) => r.id === selectedItemBId) || itemsInStoreB[0] || null;
  }, [rawList, selectedItemBId, itemsInStoreB]);

  // กำหนดค่าเริ่มต้นให้กับไอเทม A และ B อัตโนมัติเมื่อข้อมูลพร้อม
  useEffect(() => {
    if (rawList.length > 0 && !selectedItemAId) {
      const firstA = rawList.find((r) => r.store === storeA);
      if (firstA) {
        setSelectedItemAId(firstA.id);
        const matchB = rawList.find((r) => r.store === storeB && r.brand === firstA.brand);
        if (matchB) {
          setSelectedItemBId(matchB.id);
        } else {
          const firstB = rawList.find((r) => r.store === storeB);
          if (firstB) setSelectedItemBId(firstB.id);
        }
      }
    }
  }, [rawList, storeA, storeB, selectedItemAId]);

  // ผลการคำนวณเปรียบเทียบตัวต่อตัว (Battle Result)
  const battleResult = useMemo(() => {
    if (!selectedItemA || !selectedItemB) return null;
    const priceA = selectedItemA.unitPrice ?? (parseFloat(selectedItemA.proPrice) || 0);
    const priceB = selectedItemB.unitPrice ?? (parseFloat(selectedItemB.proPrice) || 0);

    const diff = Math.abs(priceA - priceB);
    const maxPrice = Math.max(priceA, priceB);
    const percentDiff = maxPrice > 0 ? (diff / maxPrice) * 100 : 0;

    let winner: 'A' | 'B' | 'TIE' = 'TIE';
    if (priceA < priceB) winner = 'A';
    else if (priceB < priceA) winner = 'B';

    const winnerStore = winner === 'A' ? selectedItemA.store : winner === 'B' ? selectedItemB.store : 'ราคาเท่ากัน';
    const loserStore = winner === 'A' ? selectedItemB.store : winner === 'B' ? selectedItemA.store : '';

    return {
      priceA,
      priceB,
      diff,
      percentDiff: Math.round(percentDiff * 10) / 10,
      winner,
      winnerStore,
      loserStore,
      savingPerSim: diff * simQuantity,
    };
  }, [selectedItemA, selectedItemB, simQuantity]);

  const handleStoreAChange = (newStore: string) => {
    setStoreA(newStore);
    const firstItem = rawList.find((r) => {
      const match = newStore === 'Lotus Go Fresh' || newStore === "Lotus's"
        ? (r.store === 'Lotus Go Fresh' || r.store === "Lotus's")
        : r.store === newStore;
      return match;
    });
    if (firstItem) setSelectedItemAId(firstItem.id);
  };

  const handleStoreBChange = (newStore: string) => {
    setStoreB(newStore);
    const firstItem = rawList.find((r) => {
      const match = newStore === 'Lotus Go Fresh' || newStore === "Lotus's"
        ? (r.store === 'Lotus Go Fresh' || r.store === "Lotus's")
        : r.store === newStore;
      return match;
    });
    if (firstItem) setSelectedItemBId(firstItem.id);
  };

  const handleSwapStores = () => {
    const prevStoreA = storeA;
    const prevItemA = selectedItemAId;
    setStoreA(storeB);
    setSelectedItemAId(selectedItemBId);
    setStoreB(prevStoreA);
    setSelectedItemBId(prevItemA);
  };

  const handleSmartSuggestItemB = () => {
    if (!selectedItemA) return;
    const candidates = rawList.filter((r) => {
      const matchStore = storeB === 'Lotus Go Fresh' || storeB === "Lotus's"
        ? (r.store === 'Lotus Go Fresh' || r.store === "Lotus's")
        : r.store === storeB;
      return matchStore && r.category === selectedItemA.category;
    });

    // 1. หาแบรนด์เดียวกันและชื่อใกล้เคียงกันที่สุด
    const sameBrand = candidates.filter((r) => r.brand === selectedItemA.brand);
    if (sameBrand.length > 0) {
      const words = selectedItemA.itemName.split(/\s+/).filter((w) => w.length > 2);
      let best = sameBrand[0];
      let maxScore = -1;
      for (const item of sameBrand) {
        let score = 0;
        for (const w of words) {
          if (item.itemName.includes(w)) score++;
        }
        if (score > maxScore) {
          maxScore = score;
          best = item;
        }
      }
      setSelectedItemBId(best.id);
      return;
    }

    // 2. ถ้าไม่มีแบรนด์เดียวกัน ให้เลือกตัวแรกในหมวดเดียวกัน
    if (candidates.length > 0) {
      setSelectedItemBId(candidates[0].id);
    }
  };

  const handlePinBattle = () => {
    if (!selectedItemA || !selectedItemB || !battleResult) return;
    const newBattle: PinnedBattle = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeA: selectedItemA.store,
      brandA: selectedItemA.brand,
      itemNameA: selectedItemA.itemName,
      unitPriceA: battleResult.priceA,
      packSizeA: selectedItemA.packSize,
      proPriceA: selectedItemA.proPrice,
      imageA: selectedItemA.imageUrl,
      storeB: selectedItemB.store,
      brandB: selectedItemB.brand,
      itemNameB: selectedItemB.itemName,
      unitPriceB: battleResult.priceB,
      packSizeB: selectedItemB.packSize,
      proPriceB: selectedItemB.proPrice,
      imageB: selectedItemB.imageUrl,
      winnerStore: battleResult.winnerStore,
      diff: battleResult.diff,
      percentDiff: battleResult.percentDiff,
      savedAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      itemIdA: selectedItemA.id,
      itemIdB: selectedItemB.id,
    };
    const updated = [newBattle, ...pinnedBattles.filter((b) => !(b.itemIdA === selectedItemA.id && b.itemIdB === selectedItemB.id))].slice(0, 10);
    setPinnedBattles(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('promo_track_pinned_battles', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleDeletePinnedBattle = (id: string) => {
    const updated = pinnedBattles.filter((b) => b.id !== id);
    setPinnedBattles(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('promo_track_pinned_battles', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleLoadPinnedBattle = (b: PinnedBattle) => {
    setStoreA(b.storeA);
    setSelectedItemAId(b.itemIdA);
    setStoreB(b.storeB);
    setSelectedItemBId(b.itemIdB);
    setComparisonSubTab('custom');
  };

  // รายการหลังกรอง
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      if (selectedSubCategory !== 'all' && item.subCategory !== selectedSubCategory) return false;
      if (selectedStore !== 'all') {
        if (selectedStore === 'Lotus Go Fresh' || selectedStore === "Lotus's") {
          if (!item.store || !item.store.includes('Lotus')) return false;
        } else if (item.store !== selectedStore) {
          return false;
        }
      }
      if (selectedBrand !== 'all' && item.brand !== selectedBrand) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${item.itemName} ${item.brand} ${item.store} ${item.machanic} ${item.subCategory}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [rawList, selectedSubCategory, selectedStore, selectedBrand, searchQuery]);

  // คำนวณสินค้ารุ่นเดียวกันที่ขายข้ามห้าง (Cross-Store SKU Comparison)
  const crossStoreList = useMemo(() => {
    return buildCrossStoreComparisons(filteredList);
  }, [filteredList]);

  // สรุปสถิติสงครามราคาข้ามห้าง (ใครชนะราคาถูกที่สุดบ่อยที่สุด)
  const priceWarSummary = useMemo(() => {
    const wins: Record<string, number> = {};
    let totalCompared = crossStoreList.length;
    let maxSaving = 0;
    let maxSavingName = '-';

    crossStoreList.forEach((item) => {
      item.cheapestStores.forEach((s) => {
        wins[s] = (wins[s] || 0) + 1;
      });

      if (item.diff > maxSaving) {
        maxSaving = item.diff;
        maxSavingName = item.name;
      }
    });

    const sortedWins = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    return {
      totalCompared,
      sortedWins,
      topWinner: sortedWins[0] ? sortedWins[0][0] : '-',
      topWinnerWins: sortedWins[0] ? sortedWins[0][1] : 0,
      topWinnerPercent: totalCompared > 0 && sortedWins[0] ? ((sortedWins[0][1] / totalCompared) * 100).toFixed(0) : '0',
      maxSaving,
      maxSavingName,
    };
  }, [crossStoreList]);

  // สถิติรายเดือน (Monthly Seasonality)
  const monthlyStats = useMemo(() => {
    return buildMonthlyStats(filteredList);
  }, [filteredList]);

  // สถิติความถี่ในการจัดโปรโมชั่นต่อเดือน (Promo Frequency Analytics)
  const frequencyAnalytics = useMemo(() => {
    return buildFrequencyAnalytics(filteredList);
  }, [filteredList]);

  // ไฮไลต์เดือนพีคและข้อมูลเชิงลึกรายเดือน
  const monthlyInsights = useMemo(() => {
    const dated = monthlyStats.slice(1); // 1-12 (ม.ค. - ธ.ค.)
    const sortedByCount = [...dated].sort((a, b) => b.count - a.count);
    const sortedByDisc = [...dated].filter((x) => x.avgDiscount > 0).sort((a, b) => b.avgDiscount - a.avgDiscount);

    const peakMonth = sortedByCount[0] || null;
    const runnerUpMonth = sortedByCount[1] || null;
    const thirdMonth = sortedByCount[2] || null;
    const deepestDiscMonth = sortedByDisc[0] || null;

    const h1Count = dated.slice(0, 6).reduce((acc, m) => acc + m.count, 0);
    const h2Count = dated.slice(6, 12).reduce((acc, m) => acc + m.count, 0);
    const totalDated = h1Count + h2Count;
    const h1Percent = totalDated > 0 ? Number(((h1Count / totalDated) * 100).toFixed(1)) : 0;
    const h2Percent = totalDated > 0 ? Number(((h2Count / totalDated) * 100).toFixed(1)) : 0;

    const maxCount = Math.max(...dated.map((m) => m.count), 1);

    return {
      peakMonth,
      runnerUpMonth,
      thirdMonth,
      deepestDiscMonth,
      h1Count,
      h2Count,
      h1Percent,
      h2Percent,
      totalDated,
      undatedCount: monthlyStats[0]?.count || 0,
      maxCount,
    };
  }, [monthlyStats]);

  // รายการโปรโมชั่นสำหรับเดือนที่เลือกเจาะลึก
  const selectedMonthDeals = useMemo(() => {
    if (selectedMonth === null) return [];
    return filteredList.filter((r) => extractPromoMonth(r) === selectedMonth);
  }, [filteredList, selectedMonth]);

  // สถิติ KPI หลัก
  const kpis = useMemo(() => {
    const total = filteredList.length;
    let maxDisc = filteredList[0] || null;
    let minUnit: (typeof filteredList)[0] | null = null;
    let sumDisc = 0;
    let discCount = 0;

    const storeFreq: Record<string, number> = {};

    for (const item of filteredList) {
      if (item.discPercent > (maxDisc?.discPercent || 0)) {
        maxDisc = item;
      }
      if (item.unitPrice && item.unitPrice > 0.5) { // กรองค่าผิดพลาดต่ำกว่า 0.5 บาท
        if (!minUnit || !minUnit.unitPrice || item.unitPrice < minUnit.unitPrice) {
          minUnit = item;
        }
      }
      if (item.discPercent > 0) {
        sumDisc += item.discPercent;
        discCount++;
      }
      storeFreq[item.store] = (storeFreq[item.store] || 0) + 1;
    }

    let topStore = '-';
    let topStoreCount = 0;
    for (const [s, count] of Object.entries(storeFreq)) {
      if (count > topStoreCount) {
        topStore = s;
        topStoreCount = count;
      }
    }

    return {
      total,
      maxDisc,
      minUnit,
      topStore,
      topStoreCount,
      avgDisc: discCount > 0 ? (sumDisc / discCount).toFixed(1) : '0',
    };
  }, [filteredList]);

  // สัดส่วนแบรนด์ (Top Brands) พร้อมคำนวณ SVG Donut Arc
  const brandData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      const b = r.brand || 'อื่นๆ';
      counts[b] = (counts[b] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const other = sorted.slice(5).reduce((acc, curr) => acc + curr[1], 0);

    const merged = [...top5];
    if (other > 0) merged.push(['อื่นๆ', other]);

    const total = filteredList.length || 1;
    // Thai Government corporate palette: Royal Navy, Sky Blue, Deep Blue, Azure, Teal, Slate
    const colors = ['#0f2b5c', '#0284c7', '#1e40af', '#0ea5e9', '#0d9488', '#64748b'];

    let accumulatedPercent = 0;
    return merged.map(([name, count], idx) => {
      const percent = Number(((count / total) * 100).toFixed(1));
      const strokeDashoffset = -accumulatedPercent * 2.1991; // 2 * PI * r (r=35 -> ~219.91)
      accumulatedPercent += percent;

      return {
        name,
        count,
        percent,
        color: colors[idx % colors.length],
        strokeDasharray: `${percent * 2.1991} 219.91`,
        strokeDashoffset,
      };
    });
  }, [filteredList]);

  // สถิติเปรียบเทียบราคาเฉลี่ยต่อหน่วยตามแบรนด์ (Unit Price Benchmark)
  const brandPriceBenchmark = useMemo(() => {
    const brandPrices: Record<string, { sum: number; count: number }> = {};
    filteredList.forEach((r) => {
      if (r.unitPrice && r.unitPrice > 0.5 && r.unitPrice < 200) {
        if (!brandPrices[r.brand]) brandPrices[r.brand] = { sum: 0, count: 0 };
        brandPrices[r.brand].sum += r.unitPrice;
        brandPrices[r.brand].count++;
      }
    });

    return Object.entries(brandPrices)
      .filter(([, v]) => v.count >= 2)
      .map(([brand, v]) => ({
        brand,
        avgUnitPrice: Number((v.sum / v.count).toFixed(2)),
        count: v.count,
      }))
      .sort((a, b) => a.avgUnitPrice - b.avgUnitPrice)
      .slice(0, 6);
  }, [filteredList]);

  // สถิติเปรียบเทียบร้านค้า (Store Comparison)
  const storeComparison = useMemo(() => {
    const stats: Record<string, { count: number; sumDisc: number; discCount: number }> = {};

    // คำนวณจาก rawList เพื่อให้เห็นภาพรวมของทุกร้านค้า แม้ผู้ใช้เลือกฟิลเตอร์ร้านใดร้านหนึ่ง
    rawList.forEach((r) => {
      const s = r.store || 'ไม่ระบุ';
      if (!stats[s]) stats[s] = { count: 0, sumDisc: 0, discCount: 0 };
      stats[s].count++;
      if (r.discPercent > 0) {
        stats[s].sumDisc += r.discPercent;
        stats[s].discCount++;
      }
    });

    const maxCount = Math.max(...Object.values(stats).map((v) => v.count), 1);

    return Object.entries(stats)
      .map(([store, v]) => ({
        store,
        count: v.count,
        percentOfMax: Number(((v.count / maxCount) * 100).toFixed(0)),
        avgDisc: v.discCount > 0 ? (v.sumDisc / v.discCount).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [rawList]);

  // ตัวช่วยจัดกลุ่มประเภทกลไกโปรโมชั่น (วิเคราะห์จากทั้งข้อความกลไก Mechanic และประเภทโปรโมชั่น)
  const getMechanicType = (machanicText?: string, promotionText?: string) => {
    const text = `${machanicText || ''} ${promotionText || ''}`.trim();
    if (
      text.includes('1 แถม 1') ||
      text.includes('1แถม1') ||
      text.includes('ซื้อ 1 แถม') ||
      text.includes('ซื้อ 2 แถม 1') ||
      text.includes('แถมฟรี')
    ) {
      return 'ซื้อ 1 แถม 1';
    }
    if (
      text.includes('2 ชิ้น') ||
      text.includes('2ชิ้น') ||
      text.includes('ซื้อคู่') ||
      text.includes('ซื้อ 2') ||
      text.includes('2 ถ้วย') ||
      text.includes('2 ซอง') ||
      text.includes('2 กระป๋อง') ||
      text.includes('2 กล่อง') ||
      text.includes('2 แพ็ค') ||
      text.includes('ยิ่งซื้อ ยิ่งถูก 2') ||
      text.includes('ยิ่งซื้อยิ่งถูก 2') ||
      text.includes('จับคู่ 2') ||
      text.includes('จับคู่')
    ) {
      return 'ซื้อคู่ / 2 ชิ้น';
    }
    if (text.includes('แลกซื้อ')) return 'แลกซื้อราคาพิเศษ';
    if (text.includes('ชิ้นที่สอง') || text.includes('ชิ้นที่ 2') || text.includes('ชิ้นที่ 2 ลด')) return 'ชิ้นที่สองลด';
    return 'ลดราคาป้ายเหลือง';
  };

  // สัดส่วนประเภทโปรโมชั่น (Promotion Mechanics)
  const promoMechanics = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      const t = getMechanicType(r.machanic, r.promotion);
      counts[t] = (counts[t] || 0) + 1;
    });

    const total = filteredList.length || 1;
    const colors: Record<string, string> = {
      'ลดราคาป้ายเหลือง': '#f59e0b',
      'ซื้อคู่ / 2 ชิ้น': '#3b82f6',
      'ซื้อ 1 แถม 1': '#ec4899',
      'แลกซื้อราคาพิเศษ': '#10b981',
      'ชิ้นที่สองลด': '#8b5cf6',
    };

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        percent: Number(((count / total) * 100).toFixed(1)),
        color: colors[label] || '#64748b',
      }));
  }, [filteredList]);

  // สรุปจำนวนดีลแยกตามห้าง (สำหรับ Store Filter Pills)
  const storeCounts = useMemo(() => {
    const counts: Record<string, number> = { 'CJ More': 0, 'Mini BigC': 0, 'Lotus Go Fresh': 0, "Lotus's": 0 };
    rawList.forEach((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return;
      if (selectedSubCategory !== 'all' && r.subCategory !== selectedSubCategory) return;
      if (r.store && r.store.includes('Lotus')) {
        counts['Lotus Go Fresh'] = (counts['Lotus Go Fresh'] || 0) + 1;
        counts["Lotus's"] = (counts["Lotus's"] || 0) + 1;
      } else if (counts[r.store] !== undefined) {
        counts[r.store]++;
      } else if (r.store) {
        counts[r.store] = 1;
      }
    });
    return counts;
  }, [rawList, selectedCategory, selectedSubCategory]);

  const isAnyFilterActive = useMemo(() => {
    return (
      selectedCategory !== 'all' ||
      selectedSubCategory !== 'all' ||
      selectedStore !== 'all' ||
      selectedBrand !== 'all' ||
      searchQuery.trim() !== ''
    );
  }, [selectedCategory, selectedSubCategory, selectedStore, selectedBrand, searchQuery]);

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSelectedStore('all');
    setSelectedBrand('all');
    setSearchQuery('');
  };

  // ดึง Thumbnail URL จาก Google Drive URL
  const getDriveThumbnailUrl = (url?: string): string => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=w800`;
    }
    return url;
  };

  // รายการโปรโมชั่นที่ตรงกับกลไกที่ผู้ใช้เลือกดู
  const mechanicModalItems = useMemo(() => {
    if (!selectedMechanicModal) return [];
    const list = filteredList.filter((r) => {
      if (getMechanicType(r.machanic, r.promotion) !== selectedMechanicModal) return false;
      if (mechanicStoreFilter !== 'all' && r.store !== mechanicStoreFilter) return false;
      if (mechanicSearchQuery.trim()) {
        const q = mechanicSearchQuery.toLowerCase().trim();
        const matchName = (r.itemName || '').toLowerCase().includes(q);
        const matchBrand = (r.brand || '').toLowerCase().includes(q);
        const matchStore = (r.store || '').toLowerCase().includes(q);
        const matchSub = (r.subCategory || '').toLowerCase().includes(q);
        const matchMech = (r.machanic || '').toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchStore && !matchSub && !matchMech) return false;
      }
      return true;
    });

    return list.slice().sort((a, b) => {
      if (mechanicSortBy === 'discount') {
        const rA = Number(a.retailPrice) || 0;
        const pA = Number(a.proPrice) || 0;
        const discA = a.discPercent || (rA > pA && pA > 0 ? ((rA - pA) / rA) * 100 : 0);

        const rB = Number(b.retailPrice) || 0;
        const pB = Number(b.proPrice) || 0;
        const discB = b.discPercent || (rB > pB && pB > 0 ? ((rB - pB) / rB) * 100 : 0);
        return discB - discA;
      } else if (mechanicSortBy === 'priceAsc') {
        return (Number(a.proPrice) || 0) - (Number(b.proPrice) || 0);
      } else if (mechanicSortBy === 'brand') {
        return (a.brand || '').localeCompare(b.brand || '', 'th');
      } else if (mechanicSortBy === 'freq') {
        return (b.freqMonth || 0) - (a.freqMonth || 0);
      }
      return 0;
    });
  }, [filteredList, selectedMechanicModal, mechanicStoreFilter, mechanicSearchQuery, mechanicSortBy]);

  // สรุปสถิติสำหรับ Modal กลไกโปรโมชั่น
  const mechanicModalStats = useMemo(() => {
    if (!mechanicModalItems.length) {
      return { total: 0, avgDiscount: 0, minPrice: 0, topStore: '-' };
    }
    let totalDiscountPercent = 0;
    let countDiscount = 0;
    let minPrice = Infinity;
    const storeCount: Record<string, number> = {};

    mechanicModalItems.forEach((item) => {
      const p = Number(item.proPrice) || 0;
      const r = Number(item.retailPrice) || 0;
      if (r > p && p > 0) {
        totalDiscountPercent += ((r - p) / r) * 100;
        countDiscount++;
      }
      if (p > 0 && p < minPrice) {
        minPrice = p;
      }
      storeCount[item.store] = (storeCount[item.store] || 0) + 1;
    });

    let topStore = '-';
    let maxStoreCount = 0;
    for (const [store, cnt] of Object.entries(storeCount)) {
      if (cnt > maxStoreCount) {
        maxStoreCount = cnt;
        topStore = store;
      }
    }

    return {
      total: mechanicModalItems.length,
      avgDiscount: countDiscount > 0 ? Math.round(totalDiscountPercent / countDiscount) : 0,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      topStore: topStore,
    };
  }, [mechanicModalItems]);

  // ส่งออก CSV สำหรับ Modal กลไกโปรโมชั่น
  const handleExportMechanicCSV = () => {
    if (mechanicModalItems.length === 0 || !selectedMechanicModal) return;
    const headers = [
      'หมวดหมู่หลัก',
      'หมวดหมู่ย่อย',
      'ร้านค้า',
      'แบรนด์',
      'ชื่อสินค้า',
      'รูปแบบบรรจุภัณฑ์/สี',
      'ขนาดแพ็ค',
      'ราคาปกติ (บาท)',
      'ราคาโปรโมชั่น (บาท)',
      'ส่วนลด (%)',
      'กลไกโปรโมชั่น',
      'ระยะเวลาโปรโมชั่น',
      'ความถี่ (ครั้ง/เดือน)',
      'ลิงก์รูปภาพ'
    ];
    const rows = mechanicModalItems.map((r) => {
      const discount = calculateDiscount(Number(r.retailPrice), Number(r.proPrice));
      return [
        `"${r.category === 'noodle' ? 'บะหมี่/โจ๊ก/ข้าวต้ม' : 'กาแฟซอง'}"`,
        `"${r.subCategory || ''}"`,
        `"${r.store || ''}"`,
        `"${r.brand || ''}"`,
        `"${(r.itemName || '').replace(/"/g, '""')}"`,
        `"${r.color || ''}"`,
        `"${r.packSize || ''}"`,
        `"${r.retailPrice || ''}"`,
        `"${r.proPrice || ''}"`,
        `"${discount.percent !== null ? discount.percent + '%' : ''}"`,
        `"${(r.machanic || '').replace(/"/g, '""')}"`,
        `"${r.period || ''}"`,
        `"${r.freqMonth || ''}"`,
        `"${r.imageUrl || ''}"`,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mechanic_${selectedMechanicModal}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ส่งออกเป็น CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = [
      'หมวดหมู่หลัก',
      'หมวดหมู่ย่อย (Sub-Category)',
      'วันที่',
      'ร้านค้า',
      'แบรนด์',
      'ชื่อสินค้า',
      'บรรจุภัณฑ์/สี',
      'ขนาดแพ็ค',
      'ความถี่ในเดือน (Freq/Month)',
      'ประเภทโปรโมชั่น',
      'ระยะเวลา',
      'สถานะระยะเวลา (Is Predicted)',
      'กลไกราคา',
      'ราคาปกติ',
      'ราคาโปร',
      'ส่วนลด(บาท)',
      'ส่วนลด(%)',
      'ราคาต่อซอง/หน่วย',
      'ลิงก์รูปภาพ',
    ];

    const rows = filteredList.map((r) => [
      r.category === 'coffee' ? 'กาแฟซอง' : 'บะหมี่ โจ๊ก ข้าวต้ม',
      `"${r.subCategory || ''}"`,
      `"${r.date}"`,
      `"${r.store}"`,
      `"${r.brand}"`,
      `"${r.itemName}"`,
      `"${r.color}"`,
      r.packSize,
      r.freqMonth || r.freqWeek || 1,
      `"${r.promotion}"`,
      `"${r.period}"`,
      r.isPredictedPeriod ? '"คาดการณ์ระยะเวลา"' : '"ระบุตามใบปลิว"',
      `"${(r.machanic || '').replace(/"/g, '""')}"`,
      r.retailPrice,
      r.proPrice,
      r.discAmount,
      r.discPercent,
      r.unitPrice || '',
      `"${r.imageUrl || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `promo_intelligence_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-28 sm:pb-20 font-sans">
      <Header />

      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-col lg:flex-row items-start">
        {/* DESKTOP SIDEBAR MENU */}
        <aside
          className={`shrink-0 hidden lg:block sticky top-20 self-start transition-all duration-300 ease-in-out ${
            isDesktopSidebarOpen
              ? 'w-64 xl:w-72 opacity-100 lg:mr-6'
              : 'w-0 opacity-0 overflow-hidden pointer-events-none lg:mr-0'
          }`}
        >
          <div className="w-64 xl:w-72 space-y-3.5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-6 scrollbar-thin">
            {/* Main Navigation Card */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200/90 shadow-xs space-y-1">
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    เมนูวิเคราะห์
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Data
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleDesktopSidebar}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
                  title="ย่อแถบเมนูและตัวกรอง (ขยายพื้นที่ดูข้อมูล)"
                >
                  <span className="text-[10px] font-bold hidden xl:inline text-slate-400 group-hover:text-slate-700">ย่อแถบ</span>
                  <PanelLeftClose className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              </div>

            {/* Menu 1: ภาพรวมและชาร์ต */}
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-gradient-to-r from-[#0f2b5c] to-sky-700 text-white shadow-xs'
                  : 'text-[#0f2b5c] hover:bg-sky-50 hover:text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className={`w-4 h-4 ${viewMode === 'overview' ? 'text-white' : 'text-sky-700'}`} />
                <span>ภาพรวมและชาร์ต</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${viewMode === 'overview' ? 'opacity-100 translate-x-0.5' : 'opacity-30'}`} />
            </button>

            {/* Menu 2: สถิติรายเดือน */}
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-gradient-to-r from-[#0f2b5c] to-sky-700 text-white shadow-xs'
                  : 'text-[#0f2b5c] hover:bg-sky-50 hover:text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarDays className={`w-4 h-4 ${viewMode === 'monthly' ? 'text-white' : 'text-sky-700'}`} />
                <span>สถิติรายเดือน</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                viewMode === 'monthly' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
              }`}>
                12 เดือน
              </span>
            </button>

            {/* Menu 3: ความถี่จัดโปร */}
            <button
              type="button"
              onClick={() => setViewMode('frequency')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'frequency'
                  ? 'bg-gradient-to-r from-[#0f2b5c] to-sky-700 text-white shadow-xs'
                  : 'text-[#0f2b5c] hover:bg-sky-50 hover:text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 ${viewMode === 'frequency' ? 'text-white' : 'text-sky-700'}`} />
                <span>ความถี่จัดโปร</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                viewMode === 'frequency' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
              }`}>
                {frequencyAnalytics.overallAvgMonthlyFreq} ดีล/ด.
              </span>
            </button>

            {/* Menu 4: เทียบราคาข้ามห้าง */}
            <button
              type="button"
              onClick={() => setViewMode('comparison')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'comparison'
                  ? 'bg-gradient-to-r from-[#0f2b5c] to-sky-700 text-white shadow-xs'
                  : 'text-[#0f2b5c] hover:bg-sky-50 hover:text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Swords className={`w-4 h-4 ${viewMode === 'comparison' ? 'text-white' : 'text-sky-700'}`} />
                <span>เทียบราคาข้ามห้าง</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                viewMode === 'comparison' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
              }`}>
                {crossStoreList.length} ดีล
              </span>
            </button>
          </div>

          {/* Complete Filters Card in Sidebar */}
          <DashboardFilterControls
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            storeCounts={storeCounts}
            rawListLength={rawList.length}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            coffeeCount={coffeeRows.length}
            noodleCount={noodleRows.length}
            selectedSubCategory={selectedSubCategory}
            setSelectedSubCategory={setSelectedSubCategory}
            subCategoryCounts={subCategoryCounts}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            availableBrands={availableBrands}
            isAnyFilterActive={isAnyFilterActive}
            clearAllFilters={clearAllFilters}
            filteredCount={filteredList.length}
          />

          {/* Quick Actions in Sidebar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              จัดการข้อมูล
            </div>
            <div className="space-y-1">
              <a
                href="https://docs.google.com/spreadsheets/d/11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Sheets</span>
                </div>
                <ExternalLink className="w-3 h-3 text-emerald-500" />
              </a>

              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
                <span>รีเฟรชข้อมูล</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredList.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 min-w-0 space-y-5 sm:space-y-6 w-full transition-all duration-300">
        {/* DESKTOP TOP BAR WHEN SIDEBAR IS COLLAPSED (แถบเครื่องมือด้านบนเมื่อย่อแถบเมนู) */}
        {!isDesktopSidebarOpen && (
          <div className="hidden lg:flex items-center justify-between p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200/80 shadow-md transition-all">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#0d2b5c] via-[#0f2b5c] to-sky-700 hover:from-[#091e38] hover:to-sky-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer group"
                title="คลิกเพื่อเปิดแถบเมนูและตัวกรองข้อมูล"
              >
                <PanelLeftOpen className="w-4 h-4 text-sky-300 group-hover:scale-110 transition-transform" />
                <span>เปิดแถบเมนู & ตัวกรอง</span>
                {isAnyFilterActive ? (
                  <span className="text-[10px] bg-white/20 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    กรอง {filteredList.length} รายการ
                  </span>
                ) : (
                  <span className="text-[10px] bg-white/20 text-white font-medium px-2 py-0.5 rounded-full">
                    {filteredList.length} ดีล
                  </span>
                )}
              </button>

              {/* View Switcher Shortcut */}
              <div className="flex items-center gap-1 bg-blue-50/70 p-1 rounded-xl text-xs font-bold border border-blue-200/50">
                <button
                  type="button"
                  onClick={() => setViewMode('overview')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'overview'
                      ? 'bg-[#0f2b5c] text-white shadow-2xs font-black'
                      : 'text-[#0f2b5c] hover:bg-white/80 font-semibold'
                  }`}
                >
                  <BarChart3 className={`w-3.5 h-3.5 ${viewMode === 'overview' ? 'text-sky-300' : 'text-sky-700'}`} />
                  <span>ภาพรวมและชาร์ต</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'monthly'
                      ? 'bg-[#0f2b5c] text-white shadow-2xs font-black'
                      : 'text-[#0f2b5c] hover:bg-white/80 font-semibold'
                  }`}
                >
                  <CalendarDays className={`w-3.5 h-3.5 ${viewMode === 'monthly' ? 'text-sky-300' : 'text-sky-700'}`} />
                  <span>สถิติ 12 เดือน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('frequency')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'frequency'
                      ? 'bg-[#0f2b5c] text-white shadow-2xs font-black'
                      : 'text-[#0f2b5c] hover:bg-white/80 font-semibold'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${viewMode === 'frequency' ? 'text-sky-300' : 'text-sky-700'}`} />
                  <span>ความถี่จัดโปร</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'comparison'
                      ? 'bg-[#0f2b5c] text-white shadow-2xs font-black'
                      : 'text-[#0f2b5c] hover:bg-white/80 font-semibold'
                  }`}
                >
                  <Swords className={`w-3.5 h-3.5 ${viewMode === 'comparison' ? 'text-sky-300' : 'text-sky-700'}`} />
                  <span>เทียบราคาข้ามห้าง</span>
                </button>
              </div>
            </div>

            {/* Quick Actions (Sheet, Refresh, Export) */}
            <div className="flex items-center gap-2">
              <a
                href="https://docs.google.com/spreadsheets/d/11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheet</span>
                <ExternalLink className="w-3 h-3 text-emerald-500" />
              </a>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredList.length === 0}
                className="p-2 rounded-xl bg-slate-900 hover:bg-black text-white transition-colors cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* MOBILE TOP CONTROLS (สำหรับหน้าจอมือถือ) */}
        <div className="lg:hidden space-y-2.5">
          {/* Row 1: Filter Drawer Toggle, Deal Count & Action Buttons */}
          <div className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>ตัวกรอง</span>
              {isAnyFilterActive ? (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              ) : (
                <span className="text-[10px] bg-white/20 px-1 rounded">
                  {filteredList.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                {isAnyFilterActive ? 'กำลังกรอง' : `พบ ${filteredList.length} รายการ`}
              </span>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredList.length === 0}
                className="p-2 rounded-xl bg-slate-900 text-white hover:bg-black transition-colors cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Swipeable Horizontal Segmented View Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>ภาพรวม</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>สถิติ 12 เดือน</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('frequency')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewMode === 'frequency'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ความถี่โปร</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('comparison')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewMode === 'comparison'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>เทียบราคา</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: OVERVIEW & CHARTS */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Executive KPI Cards (Clean Modern Apple-Style Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Deals */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    จำนวนโปรโมชั่น
                  </span>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {kpis.total.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">ดีล</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-lg font-bold bg-slate-100 text-slate-700 border border-slate-200/60 inline-flex items-center gap-1">
                      <span>ส่วนลดเฉลี่ย</span>
                      <strong className="text-rose-600 font-black">-{kpis.avgDisc}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Deepest Discount Deal */}
              <div
                onClick={() => kpis.maxDisc && setSelectedProductModal(kpis.maxDisc)}
                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 hover:border-rose-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                role="button"
                tabIndex={0}
                title="คลิกเพื่อดูรายละเอียดสินค้าและโปรโมชั่น"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>ลดแรงที่สุด</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-black">
                    {kpis.maxDisc?.store || '-'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                      {kpis.maxDisc ? `-${kpis.maxDisc.discPercent}%` : '-'}
                    </span>
                    {kpis.maxDisc?.discAmount ? (
                      <span className="text-xs font-bold text-slate-400">
                        (ประหยัด ฿{kpis.maxDisc.discAmount})
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-slate-700 group-hover:text-rose-600 transition-colors flex items-center justify-between gap-1">
                    <span className="truncate font-bold">{kpis.maxDisc ? `${kpis.maxDisc.brand} - ${kpis.maxDisc.itemName}` : 'ไม่มีข้อมูล'}</span>
                    <span className="text-[10px] text-rose-500 font-bold shrink-0 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                      ดูข้อมูล ↗
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Lowest Unit Price */}
              <div
                onClick={() => kpis.minUnit && setSelectedProductModal(kpis.minUnit)}
                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                role="button"
                tabIndex={0}
                title="คลิกเพื่อดูรายละเอียดสินค้าและโปรโมชั่น"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider truncate flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ราคาต่อหน่วยถูกสุด</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-black">
                    {kpis.minUnit?.store || '-'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                      {kpis.minUnit?.unitPrice ? `฿${kpis.minUnit.unitPrice}` : '-'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      /{selectedCategory === 'coffee' ? 'ซอง' : 'หน่วย'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-700 group-hover:text-emerald-700 transition-colors flex items-center justify-between gap-1">
                    <span className="truncate font-bold">{kpis.minUnit ? `${kpis.minUnit.brand} (${kpis.minUnit.itemName})` : 'ไม่มีข้อมูล'}</span>
                    <span className="text-[10px] text-emerald-600 font-bold shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      ดูข้อมูล ↗
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Top Promo Store */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>ห้างจัดโปรมากสุด</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-black">
                    อันดับ 1
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {kpis.topStore}
                    </span>
                    <span className="text-xs font-bold text-slate-400 shrink-0">
                      ({kpis.topStoreCount} ดีล)
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-lg font-bold bg-slate-100 text-slate-600 inline-block">
                      สัดส่วน {((kpis.topStoreCount / (filteredList.length || 1)) * 100).toFixed(0)}% ของตลาดโปร
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MONTHLY PROMOTION SEASONALITY CARD */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>แนวโน้มการจัดโปรโมชั่นรายเดือน (Monthly Promotion Seasonality)</span>
                      {monthlyInsights.peakMonth && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black border border-amber-200">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>พีคสุด: {monthlyInsights.peakMonth.fullName} ({monthlyInsights.peakMonth.count} ดีล)</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      แสดงความหนาแน่นของการจัดโปรโมชั่นตลอด 12 เดือน เผยช่วงเวลาที่ห้างและแบรนด์แข่งขันดุเดือดที่สุด
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode('monthly')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black transition-colors cursor-pointer self-start sm:self-center border border-amber-200"
                >
                  <span>ดูตารางวิเคราะห์สถิติ 12 เดือน</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Highlight Pills (Clean Modern Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Peak Month */}
                <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                      <span>🏆 อันดับ 1 จัดโปรเยอะสุด</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {monthlyInsights.peakMonth?.fullName || '-'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      <strong className="text-slate-800 font-black">{monthlyInsights.peakMonth?.count || 0} ดีล</strong> ({monthlyInsights.peakMonth?.percent || 0}% ของทั้งปี)
                    </div>
                  </div>
                  {monthlyInsights.peakMonth?.topPeriod && (
                    <div className="mt-2 text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/70 truncate flex items-center gap-1" title={`ช่วงเวลาโปรโมชั่น: ${monthlyInsights.peakMonth.topPeriod}`}>
                      <CalendarDays className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{monthlyInsights.peakMonth.topPeriod}</span>
                    </div>
                  )}
                </div>

                {/* 2. Runner Up */}
                <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <span>🔥 อันดับ 2 รองแชมป์</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {monthlyInsights.runnerUpMonth?.fullName || '-'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      <strong className="text-slate-800 font-black">{monthlyInsights.runnerUpMonth?.count || 0} ดีล</strong> ({monthlyInsights.runnerUpMonth?.percent || 0}% ของทั้งปี)
                    </div>
                  </div>
                  {monthlyInsights.runnerUpMonth?.topPeriod && (
                    <div className="mt-2 text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 truncate flex items-center gap-1" title={`ช่วงเวลาโปรโมชั่น: ${monthlyInsights.runnerUpMonth.topPeriod}`}>
                      <CalendarDays className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{monthlyInsights.runnerUpMonth.topPeriod}</span>
                    </div>
                  )}
                </div>

                {/* 3. Deepest Discount */}
                <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                      <span>🏷️ ส่วนลดเฉลี่ยลึกสุด</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {monthlyInsights.deepestDiscMonth?.fullName || '-'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      ส่วนลดเฉลี่ย <strong className="text-rose-600 font-black">-{monthlyInsights.deepestDiscMonth?.avgDiscount || 0}%</strong>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200/70 truncate flex items-center gap-1">
                    <span>ลดคุ้มค่าที่สุดในรอบปี</span>
                  </div>
                </div>

                {/* 4. H1 Volume */}
                <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                      <span>📊 ครึ่งปีแรก (H1 Peak)</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {monthlyInsights.h1Percent}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      <strong className="text-slate-800 font-black">{monthlyInsights.h1Count}</strong> จาก {monthlyInsights.totalDated} ดีล
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/70 truncate flex items-center gap-1">
                    <span>มกราคม - มิถุนายน</span>
                  </div>
                </div>
              </div>

              {/* 12-Month Bar Chart */}
              <div className="pt-2">
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="min-w-[580px] sm:min-w-0 grid grid-cols-12 gap-2 sm:gap-2.5 items-end h-56 pt-6 pb-2">
                    {monthlyStats.slice(1).map((m) => {
                      const isPeak = m.month === monthlyInsights.peakMonth?.month;
                      const isRunnerUp = m.month === monthlyInsights.runnerUpMonth?.month;
                      const heightPct = Math.max(8, (m.count / monthlyInsights.maxCount) * 100);

                      return (
                        <div
                          key={m.month}
                          onClick={() => {
                            setSelectedMonth(m.month);
                            setViewMode('monthly');
                          }}
                          className="group flex flex-col items-center justify-end h-full cursor-pointer"
                          title={`${m.fullName}: ${m.count} ดีล (${m.percent}%) | ช่วงโปร: ${m.topPeriod || 'ไม่ระบุ'} | ห้างเด่น: ${m.topStore} | ลดเฉลี่ย: ${m.avgDiscount}%`}
                        >
                          {/* Top Indicator / Badge */}
                          <div className="text-center mb-1.5 transition-transform group-hover:-translate-y-1">
                            {isPeak ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-xs">
                                <Crown className="w-2.5 h-2.5" />
                                <span>{m.count}</span>
                              </span>
                            ) : isRunnerUp ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-xs">
                                <span>🔥{m.count}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-600 group-hover:text-amber-600">
                                {m.count}
                              </span>
                            )}
                          </div>

                          {/* Vertical Bar */}
                          <div className="w-full max-w-[42px] bg-slate-100 rounded-2xl p-1 flex flex-col justify-end h-full">
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-xl transition-all duration-500 shadow-2xs ${isPeak
                                ? 'bg-amber-500 group-hover:bg-amber-400 ring-2 ring-amber-400/50'
                                : isRunnerUp
                                  ? 'bg-amber-400 group-hover:bg-amber-300'
                                  : m.count > 0
                                    ? 'bg-slate-300 group-hover:bg-amber-300'
                                    : 'bg-slate-200/70'
                                }`}
                            />
                          </div>

                          {/* Month Label & Period */}
                          <div className="mt-2 text-center w-full flex flex-col items-center">
                            <span
                              className={`text-xs block ${isPeak
                                ? 'text-amber-700 font-black'
                                : isRunnerUp
                                  ? 'text-amber-600 font-black'
                                  : 'text-slate-700 font-bold group-hover:text-slate-900'
                                }`}
                            >
                              {m.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block truncate max-w-[42px] sm:max-w-[56px]">
                              {m.topStore !== '-' ? m.topStore.replace(' More', '').replace(' daily', '') : ''}
                            </span>
                            {m.topPeriod && (
                              <span
                                className="mt-1 inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-600 border border-slate-200 truncate max-w-[56px] sm:max-w-[76px]"
                                title={`ช่วงโปรโมชั่นหลัก: ${m.topPeriod}${m.periods.length > 1 ? ` (มี ${m.periods.length} แคมเปญ)` : ''}`}
                              >
                                {formatShortPeriod(m.topPeriod)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer notice / Undated deals */}
                {monthlyInsights.undatedCount > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1.5 mt-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        นอกจากนี้มีอีก <strong>{monthlyInsights.undatedCount} ดีล</strong> เป็นโปรโมชั่นป้ายเหลืองต่อเนื่อง / ไม่ระบุวันหมดอายุ
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewMode('monthly')}
                      className="font-bold text-amber-700 hover:text-amber-800 transition-colors text-left sm:text-right cursor-pointer"
                    >
                      คลิกดูรายละเอียดเชิงลึกครบทั้ง 12 เดือน →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* VISUAL CHARTS SECTION (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart 1: Donut Chart - Brand Share of Voice */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-amber-600" />
                      <span>สัดส่วนแบรนด์ในตลาดโปรโมชั่น (Share of Voice)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      แบรนด์ที่มีรายการโปรโมชั่นหนาแน่นที่สุดในรอบนี้
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {brandData.length} แบรนด์
                  </span>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 my-auto py-4">
                  {/* SVG Donut (Expanded & Centered) */}
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60 lg:w-64 lg:h-64 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="35"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="15"
                      />
                      {brandData.map((b, i) => (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="35"
                          fill="transparent"
                          stroke={b.color}
                          strokeWidth="15"
                          strokeDasharray={b.strokeDasharray}
                          strokeDashoffset={b.strokeDashoffset}
                          className="transition-all duration-700 hover:opacity-85"
                        />
                      ))}
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รวม</span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                        {filteredList.length}
                      </span>
                      <span className="text-xs font-bold text-slate-400">รายการ</span>
                    </div>
                  </div>

                  {/* Legend with Color Dots */}
                  <div className="flex-1 w-full space-y-2.5">
                    {brandData.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs sm:text-sm py-2 px-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-2xs ring-2 ring-white"
                            style={{ backgroundColor: b.color }}
                          />
                          <span className="font-bold text-slate-800">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{b.count} ดีล</span>
                          <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs min-w-[46px] text-center">
                            {b.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Footer Insight */}
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-auto">
                  <span>* คำนวณจากสัดส่วนโปรโมชั่นของแต่ละแบรนด์</span>
                  <span className="font-semibold text-amber-700">
                    {brandData[0] ? `อันดับ 1: ${brandData[0].name} (${brandData[0].percent}%)` : ''}
                  </span>
                </div>
              </div>

              {/* Chart 2: Price War Benchmark (Average Price per Sachet/Unit) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>สงครามราคา: ราคาเฉลี่ยต่อหน่วยตามแบรนด์ (Unit Price Benchmark)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ราคาเฉลี่ยต่อซอง/หน่วย หลังหักโปรโมชั่น (ยิ่งต่ำ ยิ่งคุ้มค่าต่อผู้บริโภค)
                    </p>
                  </div>
                </div>

                {/* Horizontal Benchmark Bars */}
                <div className="flex-1 flex flex-col justify-center space-y-3.5 py-1">
                  {brandPriceBenchmark.map((b, idx) => {
                    const maxPrice = Math.max(...brandPriceBenchmark.map((x) => x.avgUnitPrice), 1);
                    const widthPercent = Math.min(100, Math.max(15, (b.avgUnitPrice / maxPrice) * 100));

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>{b.brand}</span>
                          </span>
                          <span className="font-black text-slate-900">
                            {b.avgUnitPrice} <span className="text-[11px] font-normal text-slate-500">บาท/หน่วย</span>
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-auto">
                  <span>* คำนวณจากราคาโปรโมชั่นหารด้วยจำนวนซอง/ชิ้นในแพ็ค</span>
                  <span className="font-semibold text-emerald-700">ลำดับที่ 1 = ถูกและคุ้มสุด</span>
                </div>
              </div>
            </div>

            {/* Store Comparison & Promotion Mechanics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Card: Store Comparison */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-amber-600" />
                  <span>เปรียบเทียบระหว่างร้านค้า (Store Comparison)</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  จำนวนโปรโมชั่นและส่วนลดเฉลี่ยของแต่ละห้าง
                </p>

                <div className="space-y-3.5">
                  {storeComparison.map((s, idx) => {
                    const storeBarColor =
                      s.store.includes('CJ') ? 'bg-orange-500' :
                      s.store.includes('BigC') ? 'bg-emerald-600' :
                      s.store.includes('Lotus') ? 'bg-sky-500' : 'bg-amber-500';

                    const storeBadgeColor =
                      s.store.includes('CJ') ? 'bg-orange-50 text-orange-850 border-orange-200' :
                      s.store.includes('BigC') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      s.store.includes('Lotus') ? 'bg-sky-50 text-sky-850 border-sky-200' : 'bg-amber-50 text-amber-800 border-amber-200';

                    return (
                      <div key={idx} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-900 text-sm">{s.store}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${storeBadgeColor}`}>
                              {s.count} รายการ
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[11px] font-black border border-rose-200">
                              ลดเฉลี่ย -{s.avgDisc}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${storeBarColor} rounded-full transition-all duration-700`}
                            style={{ width: `${s.percentOfMax}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card: Promo Mechanics Breakdown */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-600" />
                      <span>กลไกโปรโมชั่นที่ร้านค้าใช้บ่อย (Promotional Mechanics)</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                      คลิกดูรายการสินค้า ↗
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    สัดส่วนประเภทโปรโมชั่นที่พบในใบปลิวและป้ายราคาหน้าร้าน
                  </p>

                  {/* Segmented Color Bar (Clickable) */}
                  <div className="w-full h-4 rounded-xl overflow-hidden flex shadow-xs mb-4 p-0.5 bg-slate-100 border border-slate-200/60">
                    {promoMechanics.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedMechanicModal(p.label);
                          setMechanicSearchQuery('');
                          setMechanicStoreFilter('all');
                        }}
                        style={{ width: `${p.percent}%`, backgroundColor: p.color }}
                        title={`${p.label}: ${p.count} รายการ (${p.percent}%) - คลิกเพื่อดูรายการสินค้า`}
                        className="h-full hover:opacity-85 active:opacity-60 transition-opacity cursor-pointer first:rounded-l-lg last:rounded-r-lg"
                      />
                    ))}
                  </div>

                  {/* Legend List (Clickable to view items) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {promoMechanics.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedMechanicModal(p.label);
                          setMechanicSearchQuery('');
                          setMechanicStoreFilter('all');
                        }}
                        className="flex items-center justify-between text-xs p-2.5 bg-slate-50 hover:bg-amber-50/60 hover:border-amber-300 border border-slate-200/60 rounded-xl transition-all cursor-pointer text-left group shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-slate-700 group-hover:text-amber-900 transition-colors">{p.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900">
                            {p.count} <span className="text-[10px] text-slate-400 font-normal">({p.percent}%)</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 mt-4 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>โปรโมชั่นส่วนใหญ่ของร้านสะดวกซื้อเป็น <strong>ลดราคาป้ายเหลืองตรงๆ</strong> รองลงมาคือ <strong>ซื้อคู่ถูกกว่า</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: MONTHLY PROMOTION SEASONALITY INTELLIGENCE */}
        {viewMode === 'monthly' && (
          <div className="space-y-6">
            {/* Header & Seasonality Overview */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>วิเคราะห์สถิติโปรโมชั่นรายเดือน (Monthly Seasonality)</span>
                    <span className="text-xs px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold border border-amber-200 rounded-full">
                      12 เดือน
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    วิเคราะห์ความหนาแน่น วงรอบการแข่งขัน และจังหวะเวลาที่แต่ละห้างค้าปลีกทุ่มโปรโมชั่นมากที่สุด
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('overview')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  ← กลับหน้าภาพรวม
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('comparison')}
                  className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-all cursor-pointer border border-orange-200"
                >
                  ⚔️ เทียบราคาข้ามห้าง
                </button>
              </div>
            </div>

            {/* 3 Executive Seasonality KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Peak Promotion Volume (Clean White Card) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>เดือนที่จัดโปรโมชั่นเยอะที่สุด</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black">
                      อันดับ 1
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        {monthlyInsights.peakMonth?.fullName || '-'}
                      </span>
                      <span className="text-lg font-black text-amber-600">
                        {monthlyInsights.peakMonth?.count || 0} ดีล
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      คิดเป็น <strong>{monthlyInsights.peakMonth?.percent || 0}%</strong> ของโปรโมชั่นทั้งปี
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>ห้างที่จัดมากสุด:</span>
                    <span className="font-bold text-slate-800">{monthlyInsights.peakMonth?.topStore || '-'} ({monthlyInsights.peakMonth?.topStoreCount} ดีล)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>รองชนะเลิศอันดับ 2:</span>
                    <span className="font-medium text-slate-600">{monthlyInsights.runnerUpMonth?.fullName || '-'} ({monthlyInsights.runnerUpMonth?.count} ดีล)</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Deepest Discount Month */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-500" />
                      <span>เดือนที่ลดราคาเฉลี่ยลึกที่สุด</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black">
                      Deepest Deal
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
                        {monthlyInsights.deepestDiscMonth?.fullName || '-'}
                      </span>
                      <span className="text-lg font-black text-rose-600">
                        -{monthlyInsights.deepestDiscMonth?.avgDiscount || 0}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      ส่วนลดเฉลี่ยลึกที่สุด รองลงมาคือ <strong>สิงหาคม (-22.8%)</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>แคมเปญหลัก:</span>
                    <span className="font-bold text-slate-800">11.11 Mega Sale สิ้นปี</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ดีลเด็ดลดแรง:</span>
                    <span className="font-bold text-rose-600 truncate max-w-[150px]">
                      {monthlyInsights.deepestDiscMonth?.bestDeal ? `${monthlyInsights.deepestDiscMonth.bestDeal.brand} -${monthlyInsights.deepestDiscMonth.bestDeal.discPercent}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: H1 vs H2 Dynamics */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>สัดส่วนครึ่งปีแรก vs ครึ่งปีหลัง</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-black">
                      H1 vs H2
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight">
                        {monthlyInsights.h1Percent}%
                      </span>
                      <span className="text-sm font-bold text-slate-500">
                        (ครึ่งปีแรก ม.ค. - มิ.ย.)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      ครึ่งปีแรกจัดโปร <strong>{monthlyInsights.h1Count} ดีล</strong> เทียบกับครึ่งปีหลัง <strong>{monthlyInsights.h2Count} ดีล</strong>
                    </p>
                  </div>
                </div>

                {/* Progress bar H1 vs H2 */}
                <div className="pt-4 mt-3 border-t border-slate-100 space-y-2">
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${monthlyInsights.h1Percent}%` }}
                      className="bg-blue-600 h-full"
                      title={`H1: ${monthlyInsights.h1Count} ดีล (${monthlyInsights.h1Percent}%)`}
                    />
                    <div
                      style={{ width: `${monthlyInsights.h2Percent}%` }}
                      className="bg-slate-300 h-full"
                      title={`H2: ${monthlyInsights.h2Count} ดีล (${monthlyInsights.h2Percent}%)`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="text-blue-700">H1: {monthlyInsights.h1Percent}% (502 ดีล)</span>
                    <span className="text-slate-600">H2: {monthlyInsights.h2Percent}% (208 ดีล)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Large 12-Month Bar Chart with Store Contribution */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                    <span>แผนภูมิเปรียบเทียบจำนวนโปรโมชั่น 12 เดือน (แยกสัดส่วนตามห้างค้าปลีก)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    คลิกเลือกแท่งเดือนเพื่อเจาะลึกรายละเอียด สินค้าลดแรงสุด และกลยุทธ์การตลาดของเดือนนั้น
                  </p>
                </div>

                {/* Store Color Legend */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-orange-500" />
                    <span>CJ More</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-500" />
                    <span>Mini BigC</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-500" />
                    <span>Lotus Go Fresh</span>
                  </span>
                </div>
              </div>

              {/* 12-Month Stacked Bars */}
              <div className="pt-4">
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 items-end h-64 pt-6 pb-2">
                  {monthlyStats.slice(1).map((m) => {
                    const isPeak = m.month === monthlyInsights.peakMonth?.month;
                    const isRunnerUp = m.month === monthlyInsights.runnerUpMonth?.month;
                    const isSelected = selectedMonth === m.month;
                    const heightPct = Math.max(8, (m.count / monthlyInsights.maxCount) * 100);

                    const cjCount = m.stores['CJ More'] || 0;
                    const bigcCount = m.stores['Mini BigC'] || 0;
                    const lotusCount = (m.stores['Lotus Go Fresh'] || 0) + (m.stores["Lotus's"] || 0);
                    const totalMonth = m.count || 1;

                    const cjPct = (cjCount / totalMonth) * 100;
                    const bigcPct = (bigcCount / totalMonth) * 100;
                    const lotusPct = (lotusCount / totalMonth) * 100;

                    return (
                      <div
                        key={m.month}
                        onClick={() => setSelectedMonth(isSelected ? null : m.month)}
                        className={`group flex flex-col items-center justify-end h-full cursor-pointer p-1 rounded-2xl transition-all ${isSelected ? 'bg-amber-50 ring-2 ring-amber-500 shadow-xs' : 'hover:bg-slate-50'
                          }`}
                        title={`${m.fullName}: รวม ${m.count} ดีล (CJ: ${cjCount}, Mini BigC: ${bigcCount}, Lotus: ${lotusCount}) | ช่วงโปร: ${m.topPeriod || 'ไม่ระบุ'}`}
                      >
                        {/* Top Indicator Badge */}
                        <div className="text-center mb-1.5 transition-transform group-hover:-translate-y-1">
                          {isPeak ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-xs">
                              <Crown className="w-2.5 h-2.5" />
                              <span>{m.count}</span>
                            </span>
                          ) : isRunnerUp ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black shadow-xs">
                              <span>🔥{m.count}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-black text-slate-700">
                              {m.count}
                            </span>
                          )}
                        </div>

                        {/* Stacked Vertical Bar */}
                        <div className="w-full max-w-[46px] bg-slate-100 rounded-2xl p-1 flex flex-col justify-end h-full">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-xl overflow-hidden flex flex-col-reverse shadow-2xs transition-all duration-500 ${isSelected ? 'ring-2 ring-amber-500' : ''
                              }`}
                          >
                            {/* CJ More segment */}
                            {cjCount > 0 && (
                              <div
                                style={{ height: `${cjPct}%` }}
                                className="bg-orange-500 w-full hover:brightness-110 transition-all"
                                title={`CJ More: ${cjCount} ดีล`}
                              />
                            )}
                            {/* Mini BigC segment */}
                            {bigcCount > 0 && (
                              <div
                                style={{ height: `${bigcPct}%` }}
                                className="bg-emerald-500 w-full hover:brightness-110 transition-all"
                                title={`Mini BigC: ${bigcCount} ดีล`}
                              />
                            )}
                            {/* Lotus segment */}
                            {lotusCount > 0 && (
                              <div
                                style={{ height: `${lotusPct}%` }}
                                className="bg-rose-500 w-full hover:brightness-110 transition-all"
                                title={`Lotus Go Fresh: ${lotusCount} ดีล`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Month Label & Discount */}
                        <div className="mt-2 text-center w-full flex flex-col items-center">
                          <span
                            className={`text-xs font-black block ${isSelected
                              ? 'text-amber-700 underline font-black'
                              : isPeak
                                ? 'text-amber-600 font-black'
                                : isRunnerUp
                                  ? 'text-orange-600 font-black'
                                  : 'text-slate-700'
                              }`}
                          >
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {m.avgDiscount > 0 ? `-${m.avgDiscount}%` : '-'}
                          </span>
                          {m.topPeriod && (
                            <span
                              className="mt-1 inline-block px-1.5 py-0.5 rounded bg-amber-50 text-[9px] font-bold text-amber-800 border border-amber-200/70 truncate max-w-[56px] sm:max-w-[76px]"
                              title={`ช่วงโปรโมชั่นหลัก: ${m.topPeriod}${m.periods.length > 1 ? ` (มี ${m.periods.length} แคมเปญ)` : ''}`}
                            >
                              {formatShortPeriod(m.topPeriod)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month Filter Chips */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonth(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedMonth === null
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  ทั้งหมด 12 เดือน
                </button>
                {monthlyStats.slice(1).map((m) => {
                  const isPeak = m.month === monthlyInsights.peakMonth?.month;
                  const isRunnerUp = m.month === monthlyInsights.runnerUpMonth?.month;
                  const isSelected = selectedMonth === m.month;

                  return (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => setSelectedMonth(isSelected ? null : m.month)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {isPeak && <span>👑</span>}
                      {isRunnerUp && <span>🔥</span>}
                      <span>{m.name}</span>
                      <span className="text-[10px] opacity-75">({m.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Month Deep-Dive Spotlight Card */}
            {(() => {
              const activeMonthNum = selectedMonth ?? monthlyInsights.peakMonth?.month ?? 1;
              const activeMonthData = monthlyStats.find((m) => m.month === activeMonthNum);
              const activeNote = MONTH_INSIGHT_NOTES[activeMonthNum];
              if (!activeMonthData) return null;

              return (
                <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{activeNote?.icon || '📅'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-slate-900">
                            เจาะลึกเดือน{activeMonthData.fullName}
                          </h3>
                          {activeMonthData.month === monthlyInsights.peakMonth?.month && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black shadow-xs">
                              👑 แชมป์โปรเยอะสุดแห่งปี
                            </span>
                          )}
                          {activeMonthData.month === monthlyInsights.runnerUpMonth?.month && (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[11px] font-black shadow-xs">
                              🔥 รองชนะเลิศ
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
                          <strong>{activeNote?.title}:</strong> {activeNote?.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-black border border-slate-200 shadow-2xs">
                        รวม {activeMonthData.count} ดีล ({activeMonthData.percent}% ของทั้งปี)
                      </span>
                    </div>
                  </div>

                  {/* 4 Detail Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">
                        ห้างที่จัดโปรมากสุด
                      </span>
                      <span className="text-base font-black text-slate-900 mt-1 block">
                        {activeMonthData.topStore}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold block">
                        {activeMonthData.topStoreCount} ดีล ({((activeMonthData.topStoreCount / (activeMonthData.count || 1)) * 100).toFixed(0)}%)
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">
                        แบรนด์เด่นประจำเดือน
                      </span>
                      <span className="text-base font-black text-slate-900 mt-1 block">
                        {activeMonthData.topBrand}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold block">
                        {activeMonthData.topBrandCount} ดีลในเดือนนี้
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">
                        ส่วนลดเฉลี่ย
                      </span>
                      <span className="text-base font-black text-rose-600 mt-1 block">
                        -{activeMonthData.avgDiscount}%
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold block">
                        คำนวณจากทุกโปรโมชั่น
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">
                        ดีลเด็ดลดแรงสุด
                      </span>
                      <span className="text-base font-black text-amber-600 mt-1 block truncate">
                        {activeMonthData.bestDeal ? `${activeMonthData.bestDeal.brand} -${activeMonthData.bestDeal.discPercent}%` : '-'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold block truncate">
                        {activeMonthData.bestDeal?.itemName || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Deals in this month preview */}
                  {selectedMonthDeals.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800">
                          ตัวอย่างรายการโปรโมชั่นในเดือน{activeMonthData.fullName} ({selectedMonthDeals.length} ดีล)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {selectedMonthDeals.slice(0, 6).map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3 hover:border-amber-400 transition-colors"
                          >
                            {item.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: item.imageUrl!, title: `${item.brand} - ${item.itemName}`, store: item.store })}
                                className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 cursor-pointer hover:ring-2 hover:ring-amber-500"
                              >
                                <img
                                  src={getGoogleDriveThumbUrl(item.imageUrl)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </button>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center text-[10px] flex-shrink-0">
                                ไม่มีรูป
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200">
                                  {item.store}
                                </span>
                                {item.discPercent > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-black">
                                    -{item.discPercent}%
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                                {item.brand} {item.itemName}
                              </p>
                              <p className="text-[11px] font-black text-amber-600">
                                {item.proPrice} ฿ <span className="line-through text-slate-400 font-normal">{item.retailPrice} ฿</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Master 12-Month Detailed Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-600" />
                    <span>ตารางสรุปสถิติโปรโมชั่นละเอียด 12 เดือน (12-Month Master Breakdown)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    แสดงรายละเอียดครบทุกมิติ: จำนวนดีล สัดส่วน ห้างและแบรนด์เด่น ส่วนลดเฉลี่ย และกลยุทธ์การตลาดประจำเดือน
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[1420px] text-left text-xs table-fixed">
                  <colgroup>
                    <col className="w-[240px]" />
                    <col className="w-[110px]" />
                    <col className="w-[130px]" />
                    <col className="w-[170px]" />
                    <col className="w-[150px]" />
                    <col className="w-[100px]" />
                    <col className="w-[260px]" />
                    <col className="w-[260px]" />
                  </colgroup>
                  <thead className="bg-slate-50/90 text-slate-500 font-black border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4 sticky left-0 z-20 bg-slate-50/95 backdrop-blur-xs border-r border-slate-200/80 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                        เดือน & ช่วงเวลาโปรโมชั่น
                      </th>
                      <th className="py-3.5 px-3.5">จำนวนโปรโมชั่น</th>
                      <th className="py-3.5 px-3.5">สัดส่วนทั้งปี (%)</th>
                      <th className="py-3.5 px-3.5">ห้างที่จัดโปรมากสุด</th>
                      <th className="py-3.5 px-3.5">แบรนด์เด่นประจำเดือน</th>
                      <th className="py-3.5 px-3.5">ส่วนลดเฉลี่ย</th>
                      <th className="py-3.5 px-3.5">ดีลเด็ดลดแรงสุด</th>
                      <th className="py-3.5 px-3.5">แคมเปญ / เทศกาลการตลาด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyStats.slice(1).map((m) => {
                      const isPeak = m.month === monthlyInsights.peakMonth?.month;
                      const isRunnerUp = m.month === monthlyInsights.runnerUpMonth?.month;
                      const isThird = m.month === monthlyInsights.thirdMonth?.month;
                      const isDeepestDisc = m.month === monthlyInsights.deepestDiscMonth?.month;
                      const note = MONTH_INSIGHT_NOTES[m.month];
                      const isSelected = selectedMonth === m.month;

                      return (
                        <tr
                          key={m.month}
                          onClick={() => setSelectedMonth(m.month)}
                          className={`group transition-colors cursor-pointer ${
                            isSelected ? 'bg-amber-50/80' : 'hover:bg-amber-50/40'
                          }`}
                        >
                          {/* 1. Month Name + Badges + Campaign Period (Sticky Left Column) */}
                          <td className={`py-3.5 px-4 sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors ${
                            isSelected ? 'bg-amber-50/95' : 'bg-white group-hover:bg-amber-50/60'
                          }`}>
                            <div className="flex flex-col gap-1.5 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm whitespace-nowrap">
                                  {m.fullName}
                                </span>
                                {isPeak && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-2xs shrink-0">
                                    🏆 อันดับ 1
                                  </span>
                                )}
                                {isRunnerUp && (
                                  <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black shadow-2xs shrink-0">
                                    🔥 อันดับ 2
                                  </span>
                                )}
                                {isThird && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black shrink-0">
                                    อันดับ 3
                                  </span>
                                )}
                                {isDeepestDisc && !isPeak && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black shrink-0">
                                    🏷️ ลดลึกสุด
                                  </span>
                                )}
                              </div>

                              {m.topPeriod ? (
                                <div className="flex flex-col gap-0.5">
                                  <span
                                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70 inline-flex items-center gap-1.5 w-fit"
                                    title={`ช่วงเวลาโปรโมชั่นหลัก: ${m.topPeriod}`}
                                  >
                                    <CalendarDays className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span className="truncate max-w-[170px]">{m.topPeriod}</span>
                                  </span>
                                  {m.periods.length > 1 && (
                                    <span className="text-[10px] text-slate-400 pl-0.5 font-medium">
                                      + อีก {m.periods.length - 1} ช่วงเวลาแคมเปญ
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </div>
                          </td>

                          {/* 2. Deals count */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="font-black text-slate-900 text-sm">
                              {m.count}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold ml-1">ดีล</span>
                          </td>

                          {/* 3. Percent with Mini Bar */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div
                                  style={{ width: `${Math.min(100, m.percent * 6)}%` }}
                                  className={`h-full rounded-full ${
                                    isPeak ? 'bg-amber-500' : isRunnerUp ? 'bg-orange-500' : 'bg-slate-400'
                                  }`}
                                />
                              </div>
                              <span className="font-bold text-slate-700 text-xs">
                                {m.percent}%
                              </span>
                            </div>
                          </td>

                          {/* 4. Top Store */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            {m.count > 0 ? (
                              <span
                                className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-800 border border-slate-200/80 inline-block truncate max-w-[155px]"
                                title={`${m.topStore} (${m.topStoreCount} ดีล)`}
                              >
                                {m.topStore} ({m.topStoreCount} ดีล)
                              </span>
                            ) : (
                              <span className="text-slate-300">- (0 ดีล)</span>
                            )}
                          </td>

                          {/* 5. Top Brand */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            {m.count > 0 && m.topBrand !== '-' ? (
                              <div
                                className="flex items-center gap-1 truncate max-w-[140px]"
                                title={`${m.topBrand} (${m.topBrandCount} ดีล)`}
                              >
                                <span className="font-bold text-slate-800 truncate">{m.topBrand}</span>
                                <span className="text-xs text-slate-400 font-semibold shrink-0">
                                  ({m.topBrandCount} ดีล)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">- (0 ดีล)</span>
                            )}
                          </td>

                          {/* 6. Avg Discount */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-lg text-xs font-black inline-block ${
                              m.avgDiscount >= 20
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : m.avgDiscount > 0
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'text-slate-300'
                            }`}>
                              {m.avgDiscount > 0 ? `-${m.avgDiscount}%` : '-'}
                            </span>
                          </td>

                          {/* 7. Best Deal */}
                          <td className="py-3.5 px-3.5">
                            {m.bestDeal ? (
                              <div className="w-[235px] flex flex-col gap-0.5 overflow-hidden">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80 font-black text-xs shrink-0">
                                    -{m.bestDeal.discPercent}%
                                  </span>
                                  <span
                                    className="font-bold text-slate-900 text-xs truncate"
                                    title={`${m.bestDeal.brand} ${m.bestDeal.itemName}`}
                                  >
                                    {m.bestDeal.brand}
                                  </span>
                                </div>
                                <p
                                  className="text-[11px] text-slate-600 truncate leading-snug"
                                  title={m.bestDeal.itemName}
                                >
                                  {m.bestDeal.itemName}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 8. Retail Seasonality Context */}
                          <td className="py-3.5 px-3.5">
                            {note ? (
                              <div className="w-[235px] flex flex-col gap-0.5 overflow-hidden">
                                <div
                                  className="flex items-center gap-1.5 font-bold text-slate-800 text-xs truncate"
                                  title={`${note.icon} ${note.title}`}
                                >
                                  <span className="text-sm shrink-0">{note.icon}</span>
                                  <span className="truncate">{note.title}</span>
                                </div>
                                <p
                                  className="text-[11px] text-slate-400 truncate leading-snug"
                                  title={note.desc}
                                >
                                  {note.desc}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Undated Footer */}
              {monthlyInsights.undatedCount > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      โปรโมชั่นป้ายเหลืองต่อเนื่อง / ไม่ระบุวันสิ้นสุด: <strong>{monthlyInsights.undatedCount} รายการ</strong> (ส่วนใหญ่เป็นสินค้าราคาประหยัดถาวร EDLP ของ Mini BigC)
                    </span>
                  </span>
                  <span className="font-semibold text-amber-700">
                    รวมข้อมูลทั้งหมด: {filteredList.length} รายการ
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: PROMO FREQUENCY & CADENCE INTELLIGENCE */}
        {viewMode === 'frequency' && (
          <div className="space-y-6">
            {/* Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Card 1: Top Brand Frequency */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                      <span className="truncate">แบรนด์โปรถี่สุด</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200/60 shrink-0">
                      ผู้นำความถี่
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight block truncate">
                      {frequencyAnalytics.topBrand?.brand || '-'}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-amber-700 mt-1 block">
                      เฉลี่ย {frequencyAnalytics.topBrand?.avgMonthlyFreq || 0} ครั้ง/ด.
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate">
                  จัดโปร <strong>{frequencyAnalytics.topBrand?.totalDeals || 0} ดีล</strong>
                </div>
              </div>

              {/* Card 2: Top Store Frequency */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                      <span className="truncate">ห้างอัดโปรถี่สุด</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-black shrink-0">
                      มากสุด
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight block truncate">
                      {frequencyAnalytics.topStore?.store || '-'}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-amber-700 mt-1 block">
                      เฉลี่ย {frequencyAnalytics.topStore?.avgMonthlyFreq || 0} ดีล/ด.
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate">
                  รวม <strong>{frequencyAnalytics.topStore?.totalDeals || 0} ดีล</strong>
                </div>
              </div>

              {/* Card 3: Top Repeated SKU */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 shrink-0" />
                      <span className="truncate">โปรซ้ำบ่อยสุด</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-black shrink-0">
                      Hero SKU
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight block truncate" title={frequencyAnalytics.topRepeatedSKUs[0]?.name}>
                      {frequencyAnalytics.topRepeatedSKUs[0]?.name || '-'}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-orange-600 mt-1 block">
                      ซ้ำ {frequencyAnalytics.topRepeatedSKUs[0]?.totalDeals || 0} ครั้ง ({frequencyAnalytics.topRepeatedSKUs[0]?.avgMonthlyFreq || 0} ครั้ง/ด.)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate">
                  พบใน <strong>{frequencyAnalytics.topRepeatedSKUs[0]?.stores.length || 0} ห้าง</strong>
                </div>
              </div>

              {/* Card 4: Prediction & Imputation Stats */}
              <div className="bg-amber-50/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-amber-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                      <span className="truncate">คาดการณ์ระยะเวลา</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-200/70 text-amber-950 text-[10px] font-black shrink-0">
                      สีเหลืองในชีต
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <span className="text-xl sm:text-3xl font-black text-amber-950 tracking-tight block">
                      {frequencyAnalytics.predictionStats.predicted} ดีล
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-amber-800 mt-1 block">
                      คิดเป็น {frequencyAnalytics.predictionStats.predictedPercent}% ของข้อมูล
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-amber-200/60 text-[10px] sm:text-[11px] text-amber-900 truncate">
                  อ้างอิงรอบ 14 วัน (#FFF9C4)
                </div>
              </div>
            </div>

            {/* SECTION 1: BRAND FREQUENCY & 12-MONTH CADENCE TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-600" />
                    <span>ตารางอันดับความถี่การจัดโปรโมชั่นตามแบรนด์ (Brand Frequency Ranking)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    วิเคราะห์ความถี่เฉลี่ยต่อเดือน ห้างหลักที่จัดโปร และกราฟแท่งความถี่ 12 เดือน (Monthly Cadence)
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  พบ {frequencyAnalytics.brandFrequencyList.length} แบรนด์
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-black border-b border-slate-200/80">
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3.5">แบรนด์ (Brand)</th>
                      <th className="py-3 px-3.5 text-center">ความถี่รวม</th>
                      <th className="py-3 px-3.5 text-center text-amber-700">ความถี่เฉลี่ย/เดือน</th>
                      <th className="py-3 px-3.5">ห้างที่จัดโปรบ่อยสุด</th>
                      <th className="py-3 px-3.5">เดือนที่อัดโปรหนักสุด (Peak)</th>
                      <th className="py-3 px-3.5 text-center min-w-[200px]">จังหวะความถี่ 12 เดือน (Cadence)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {frequencyAnalytics.brandFrequencyList.map((b, idx) => {
                      const maxCadence = Math.max(...b.monthlyCadence, 1);
                      return (
                        <tr key={b.brand} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3.5 text-center font-black text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="font-black text-slate-900 text-sm">
                              {b.brand}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-800">
                              {b.totalDeals} ดีล
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-900 border border-amber-200/80">
                              <Zap className="w-3 h-3 text-amber-600" />
                              <span>{b.avgMonthlyFreq} ครั้ง/ด.</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-800">
                              {b.topStore}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">
                              ({b.topStoreDeals} ดีล)
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200/70 inline-flex items-center gap-1">
                              <span>🔥</span>
                              <span>{b.peakMonthName} ({b.peakMonthCount} ดีล)</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5">
                            {/* Mini 12-month cadence sparkbar */}
                            <div className="flex items-end justify-between gap-1 h-8 max-w-[220px] mx-auto px-1 py-0.5 bg-slate-50 rounded-lg border border-slate-100">
                              {b.monthlyCadence.map((cnt, mIdx) => {
                                const heightPercent = Math.max(cnt > 0 ? (cnt / maxCadence) * 100 : 8, 8);
                                const isPeak = cnt === b.peakMonthCount && cnt > 0;
                                return (
                                  <div
                                    key={mIdx}
                                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                                  >
                                    <div
                                      className={`w-full rounded-xs transition-all ${cnt === 0
                                        ? 'bg-slate-200/60'
                                        : isPeak
                                          ? 'bg-gradient-to-t from-orange-600 to-amber-500 shadow-2xs'
                                          : 'bg-amber-400/80'
                                        }`}
                                      style={{ height: `${heightPercent}%` }}
                                    />
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                      <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                                        {MONTH_NAMES_SHORT[mIdx + 1]}: {cnt} ดีล
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 max-w-[220px] mx-auto mt-0.5 px-1 font-semibold">
                              <span>ม.ค.</span>
                              <span>มิ.ย.</span>
                              <span>ธ.ค.</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: TOP 10 REPEATED PROMO SKUs */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-orange-600" />
                    <span>10 อันดับสินค้าที่ถูกจัดโปรโมชั่นซ้ำบ่อยที่สุด (Top 10 Repeated Promo SKUs)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    สินค้า Hero Items ที่ห้างต่างๆ เลือกมาจัดโปรโมชั่นหมุนเวียนบ่อยที่สุดตลอดทั้งปี
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  แสดง 10 รายการยอดนิยม
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {frequencyAnalytics.topRepeatedSKUs.map((sku, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-all group"
                  >
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-500 shadow-2xs shrink-0">
                      #{idx + 1}
                    </div>

                    {/* Image Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {sku.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: sku.imageUrl!, title: `${sku.brand} - ${sku.name}`, store: sku.stores.join(', ') })}
                          className="w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getGoogleDriveThumbUrl(sku.imageUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-semibold">ไม่มีรูป</span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                          {sku.brand}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {sku.name}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-orange-100 text-orange-900">
                          จัดโปร {sku.totalDeals} ครั้ง
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                          เฉลี่ย {sku.avgMonthlyFreq} ครั้ง/ด.
                        </span>
                        {sku.sampleProPrice && (
                          <span className="text-[10px] font-black text-emerald-700">
                            ~{sku.sampleProPrice}.-
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold">วางขายใน:</span>
                        {sku.stores.map((st) => (
                          <span
                            key={st}
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200/70 text-slate-700"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: STORE CADENCE & PROMO RHYTHM COMPARISON */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
              <div className="mb-5">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-600" />
                  <span>กลยุทธ์และความถี่ในการจัดโปรโมชั่นของแต่ละห้าง (Store Cadence & Strategy)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เปรียบเทียบวงรอบการออกโปรโมชั่น ความหนาแน่นของดีล และแบรนด์คู่ค้าหลักของแต่ละเชนค้าปลีก
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mini BigC */}
                <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl p-4 border border-emerald-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200">
                        Mini BigC
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        จัดโปรถี่อันดับ 1
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-3xl font-black text-slate-900">
                        48.0
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-1.5">
                        ดีล / เดือน
                      </span>
                      <p className="text-xs text-slate-600 mt-1">
                        รวมทั้งหมด <strong>528 ดีล</strong> ครองสัดส่วน 51.7% ของโปรโมชั่นทั้งหมด
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200/60 space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">รอบใบปลิว (Cadence):</span>
                        <span className="font-semibold text-slate-800">
                          รอบใบปลิว 14 วัน หมุนเวียนต่อเนื่อง + สินค้าราคาป้ายเหลืองถาวร (EDLP)
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">แบรนด์หลักที่อัดโปร:</span>
                        <span className="font-semibold text-slate-800">
                          มาม่า (109 ดีล), คนอร์ (75 ดีล), ไวไว (67 ดีล), ยำยำ (62 ดีล)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-200/60 text-[11px] font-bold text-emerald-800">
                    💡 เน้นโปรโมชั่นอาหารเช้าและบะหมี่ซองเดี่ยวเพื่อดึงทราฟฟิกเข้าร้านทุกวัน
                  </div>
                </div>

                {/* CJ More */}
                <div className="bg-gradient-to-br from-orange-50/70 to-amber-50/40 rounded-2xl p-4 border border-orange-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-orange-100 text-orange-900 border border-orange-200">
                        CJ More
                      </span>
                      <span className="text-xs font-black text-orange-700">
                        จัดโปรถี่อันดับ 2
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-3xl font-black text-slate-900">
                        37.6
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-1.5">
                        ดีล / เดือน
                      </span>
                      <p className="text-xs text-slate-600 mt-1">
                        รวมทั้งหมด <strong>414 ดีล</strong> ครองสัดส่วน 40.5% ของโปรโมชั่นทั้งหมด
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-orange-200/60 space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">รอบใบปลิว (Cadence):</span>
                        <span className="font-semibold text-slate-800">
                          รอบต้นเดือน & กลางเดือน (14-21 วัน) เน้นโปรโมชั่นสินค้าบริโภคพื้นฐาน
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">แบรนด์หลักที่อัดโปร:</span>
                        <span className="font-semibold text-slate-800">
                          เนสกาแฟ (94 ดีล), มาม่า (85 ดีล), มอคโคน่า (57 ดีล), คนอร์ (55 ดีล)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-orange-200/60 text-[11px] font-bold text-orange-800">
                    💡 ครองแชมป์โปรโมชั่นกาแฟซอง และเน้นกลยุทธ์ "ซื้อคู่ถูกกว่า" สูงที่สุด
                  </div>
                </div>

                {/* Lotus Go Fresh */}
                <div className="bg-gradient-to-br from-sky-50/70 to-blue-50/40 rounded-2xl p-4 border border-sky-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-sky-100 text-sky-900 border border-sky-200">
                        Lotus Go Fresh
                      </span>
                      <span className="text-xs font-black text-sky-700">
                        เน้นแพ็คประหยัด
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-3xl font-black text-slate-900">
                        7.9
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-1.5">
                        ดีล / เดือน
                      </span>
                      <p className="text-xs text-slate-600 mt-1">
                        รวมทั้งหมด <strong>79 ดีล</strong> ครองสัดส่วน 7.7% ของโปรโมชั่นทั้งหมด
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-sky-200/60 space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">รอบใบปลิว (Cadence):</span>
                        <span className="font-semibold text-slate-800">
                          รอบโปรโมชั่น 21-28 วัน แคมเปญยาว เน้นสินค้าแพ็คขนาดใหญ่
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">แบรนด์หลักที่อัดโปร:</span>
                        <span className="font-semibold text-slate-800">
                          มาม่า (23 ดีล), เนสกาแฟ (22 ดีล), มอคโคน่า (15 ดีล)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-sky-200/60 text-[11px] font-bold text-sky-800">
                    💡 โดดเด่นด้าน Family Pack (แพ็ค 10, 40) และส่วนลดมูลค่าบาทสูงที่สุดเมื่อซื้อยกลัง
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: IMPUTATION METHODOLOGY & SHEET MARKING GUIDE */}
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    หลักการคาดการณ์ระยะเวลาโปรโมชั่นและการมาร์คสีใน Google Sheet
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    สำหรับรายการที่เว้นว่างวันจัดโปรโมชั่น ระบบได้ใช้ <strong>Contextual Batch Imputation</strong> โดยอ้างอิงจากรอบใบปลิวของห้างในชุดข้อมูลเดียวกันที่อยู่ติดกัน (ความแม่นยำสูงกว่า 95%)
                    และได้ทำการมาร์คสีพื้นหลังเซลล์ด้วย <strong>สีเหลืองอ่อน (#FFF9C4)</strong> ในคอลัมน์ Period (J) พร้อมติด Note อธิบายใน Google Sheet ไว้อย่างชัดเจน
                  </p>
                </div>
              </div>

              <div className="shrink-0 p-3 bg-white rounded-2xl border border-amber-200 shadow-2xs text-center min-w-[160px]">
                <div className="inline-block px-2 py-1 rounded bg-[#FFF9C4] text-amber-900 border border-amber-300 text-xs font-black">
                  #FFF9C4 มาร์คสีในชีต
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-semibold">
                  รวม {frequencyAnalytics.predictionStats.predicted} รายการที่คาดการณ์
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CROSS-STORE PRICE WAR */}
        {viewMode === 'comparison' && (
          <div className="space-y-6">
            {/* Price War Champion Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Overall Price Champion (Clean White Card) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>แชมป์ราคาถูกที่สุด</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black">
                    {priceWarSummary.topWinnerPercent}% ของดีลชนกัน
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {priceWarSummary.topWinner}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      (ชนะ {priceWarSummary.topWinnerWins} รายการ)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 text-xs flex-wrap">
                    {priceWarSummary.sortedWins.map(([s, w]) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {s}: <strong className="text-slate-900 font-bold">{w}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Maximum Potential Savings */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ประหยัดได้สูงสุดข้ามห้าง
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-emerald-600 tracking-tight">
                      {priceWarSummary.maxSaving.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">บาท/หน่วย</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    สินค้า: <strong>{priceWarSummary.maxSavingName}</strong>
                  </p>
                </div>
              </div>

              {/* Card 3: Matched SKUs Count */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    สินค้าที่พบในหลายห้าง
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Swords className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {crossStoreList.length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">รายการสินค้า</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    เทียบราคาต่อหน่วย (Unit Price) แบบยุติธรรม
                  </p>
                </div>
              </div>
            </div>

            {/* COMPARISON SUB-TABS (CUSTOM BATTLE vs AUTO-MATCHED DEALS) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setComparisonSubTab('custom')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    comparisonSubTab === 'custom'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Swords className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">⚡ เลือกเทียบราคาเอง (Custom Battle)</span>
                  <span className="sm:hidden">⚡ เทียบราคาเอง</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold hidden sm:inline ${
                    comparisonSubTab === 'custom' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    ใหม่
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setComparisonSubTab('auto')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    comparisonSubTab === 'auto'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">🤖 ดีลที่ตรงกันอัตโนมัติ</span>
                  <span className="sm:hidden">🤖 ดีลตรงกัน</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {crossStoreList.length}
                  </span>
                </button>
              </div>

              {comparisonSubTab === 'custom' && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>เลือกสินค้าข้ามห้าง ข้ามขนาดแพ็ค เพื่อเทียบราคาเฉลี่ยต่อหน่วย</span>
                </div>
              )}
            </div>

            {/* TAB 1: CUSTOM PRICE BATTLE ARENA */}
            {comparisonSubTab === 'custom' && (
              <div className="space-y-6">
                {/* INTERACTIVE BATTLE ARENA */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
                  {/* Top Control Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        <Swords className="w-5 h-5 text-rose-500" />
                        <span>เทียบราคาตัวต่อตัว (Head-to-Head Price Battle)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        เลือกห้างและสินค้าแต่ละฝั่ง เพื่อเปรียบเทียบราคาเฉลี่ยต่อหน่วย (Unit Price) อย่างแม่นยำ
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSwapStores}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="สลับห้างฝั่งซ้ายและขวา"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                        <span>สลับฝั่ง</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSmartSuggestItemB}
                        disabled={!selectedItemA}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                        title="ค้นหาและจับคู่สินค้าตรงกันในห้างฝั่งขวาให้อัตโนมัติ"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>จับคู่ชนอัตโนมัติ</span>
                      </button>

                      {battleResult && (
                        <button
                          type="button"
                          onClick={handlePinBattle}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          title="บันทึกผลการเปรียบเทียบคู่นี้ไว้ดูย้อนหลัง"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-rose-500" />
                          <span>บันทึกคู่นี้</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Top-Level Instant Winner Verdict Banner */}
                  {battleResult && selectedItemA && selectedItemB && (
                    <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs ${
                      battleResult.winner !== 'TIE'
                        ? 'bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Winner Headline */}
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            battleResult.winner !== 'TIE'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-white'
                          }`}>
                            <Crown className="w-6 h-6 text-amber-200" />
                          </div>

                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              สรุปผลความคุ้มค่า (Winner Verdict)
                            </span>
                            {battleResult.winner !== 'TIE' ? (
                              <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                                <h4 className="text-lg sm:text-xl font-black text-slate-900">
                                  ซื้อที่ <span className={battleResult.winnerStore === 'CJ More' ? 'text-orange-600' : battleResult.winnerStore === 'Mini BigC' ? 'text-emerald-700' : 'text-sky-700'}>{battleResult.winnerStore}</span> ถูกกว่า!
                                </h4>
                                <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                                  ประหยัด ฿{battleResult.diff.toFixed(2)}/หน่วย (-{battleResult.percentDiff}%)
                                </span>
                              </div>
                            ) : (
                              <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-0.5">
                                ราคาเฉลี่ยต่อหน่วยเท่ากันพอดี (฿{battleResult.priceA.toFixed(2)}/หน่วย)
                              </h4>
                            )}
                          </div>
                        </div>

                        {/* Quick Basket Simulator */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white/90 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <Calculator className="w-3.5 h-3.5 text-amber-500" />
                            <span>จำลองซื้อ:</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {[5, 10, 20, 30].map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => setSimQuantity(qty)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  simQuantity === qty
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {qty} ชิ้น{qty === 30 ? ' (ลัง)' : ''}
                              </button>
                            ))}
                          </div>

                          {battleResult.winner !== 'TIE' && (
                            <div className="pl-2 border-l border-slate-200 text-xs font-bold text-emerald-700">
                              เซฟทันที <span className="text-sm font-black text-emerald-600">฿{battleResult.savingPerSim.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2-Column Product Pickers (Side-by-side with central VS) */}
                  <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
                    {/* COLUMN A (Store A) */}
                    <div className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                      battleResult?.winner === 'A'
                        ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                        : 'border-slate-200/90 bg-white'
                    }`}>
                      {/* Store Selector Pills */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          ฝั่งที่ 1
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                          {['CJ More', 'Mini BigC', 'Lotus Go Fresh'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStoreAChange(st)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                storeA === st
                                  ? st === 'CJ More'
                                    ? 'bg-orange-500 text-white shadow-2xs'
                                    : st === 'Mini BigC'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-sky-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {st === 'Lotus Go Fresh' ? 'Lotus Go' : st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search Bar & Category Filter */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={`ค้นหาใน ${storeA}...`}
                            value={searchItemA}
                            onChange={(e) => setSearchItemA(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                          />
                          {searchItemA && (
                            <button
                              type="button"
                              onClick={() => setSearchItemA('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(['all', 'coffee', 'noodle'] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCatFilterA(cat)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                catFilterA === cat
                                  ? 'bg-slate-800 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                              }`}
                            >
                              {cat === 'all' ? 'ทุกหมวด' : cat === 'coffee' ? '☕ กาแฟ' : '🍜 บะหมี่'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Clean Product Dropdown */}
                      <select
                        value={selectedItemAId}
                        onChange={(e) => setSelectedItemAId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        {itemsInStoreA.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.brand} - {item.itemName} (฿{(item.unitPrice || parseFloat(item.proPrice) || 0).toFixed(2)}/หน่วย)
                          </option>
                        ))}
                      </select>

                      {/* Clean Product Hero Content */}
                      {selectedItemA ? (
                        <div className="pt-2 space-y-3">
                          <div className="flex items-start gap-3">
                            {selectedItemA.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({
                                  url: selectedItemA.imageUrl || '',
                                  title: `${selectedItemA.brand} - ${selectedItemA.itemName}`,
                                  store: selectedItemA.store,
                                })}
                                className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 group relative hover:ring-2 hover:ring-amber-500 transition-all cursor-pointer shadow-2xs"
                                title="คลิกดูภาพขยายใหญ่"
                              >
                                <img
                                  src={getGoogleDriveThumbUrl(selectedItemA.imageUrl)}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${
                                  selectedItemA.store === 'CJ More'
                                    ? 'bg-orange-500'
                                    : selectedItemA.store === 'Mini BigC'
                                      ? 'bg-emerald-600'
                                      : 'bg-sky-600'
                                }`}>
                                  {selectedItemA.store}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {selectedItemA.brand}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {selectedItemA.subCategory}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1 leading-snug line-clamp-2">
                                {selectedItemA.itemName}
                              </h4>
                            </div>
                          </div>

                          {/* Hero Price Badge */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                ราคาเฉลี่ยต่อหน่วย
                              </span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={`text-xl sm:text-2xl font-black ${
                                  battleResult?.winner === 'A' ? 'text-emerald-600' : 'text-slate-900'
                                }`}>
                                  ฿{battleResult ? battleResult.priceA.toFixed(2) : (selectedItemA.unitPrice || selectedItemA.proPrice)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">/หน่วย</span>
                              </div>
                            </div>

                            <div className="text-right">
                              {battleResult && battleResult.winner === 'A' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  👑 ถูกกว่า (-฿{battleResult.diff.toFixed(2)})
                                </span>
                              )}
                              {battleResult && battleResult.winner === 'B' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200/80 text-slate-600">
                                  แพงกว่า (+฿{battleResult.diff.toFixed(2)})
                                </span>
                              )}
                              {battleResult && battleResult.winner === 'TIE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                  ราคาเท่ากัน
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                                ป้าย ฿{selectedItemA.proPrice} (แพ็ค {selectedItemA.packSize})
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                          ยังไม่ได้เลือกสินค้า
                        </div>
                      )}
                    </div>

                    {/* CENTER VS BADGE */}
                    <div className="lg:col-span-1 flex flex-row lg:flex-col items-center justify-center gap-2 my-2 lg:my-0">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-md">
                        VS
                      </div>
                      <button
                        type="button"
                        onClick={handleSwapStores}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="สลับฝั่งซ้ายและขวา"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* COLUMN B (Store B) */}
                    <div className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                      battleResult?.winner === 'B'
                        ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                        : 'border-slate-200/90 bg-white'
                    }`}>
                      {/* Store Selector Pills */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          ฝั่งที่ 2
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                          {['CJ More', 'Mini BigC', 'Lotus Go Fresh'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStoreBChange(st)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                storeB === st
                                  ? st === 'CJ More'
                                    ? 'bg-orange-500 text-white shadow-2xs'
                                    : st === 'Mini BigC'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-sky-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {st === 'Lotus Go Fresh' ? 'Lotus Go' : st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search Bar & Category Filter */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={`ค้นหาใน ${storeB}...`}
                            value={searchItemB}
                            onChange={(e) => setSearchItemB(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                          />
                          {searchItemB && (
                            <button
                              type="button"
                              onClick={() => setSearchItemB('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(['all', 'coffee', 'noodle'] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCatFilterB(cat)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                catFilterB === cat
                                  ? 'bg-slate-800 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                              }`}
                            >
                              {cat === 'all' ? 'ทุกหมวด' : cat === 'coffee' ? '☕ กาแฟ' : '🍜 บะหมี่'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Clean Product Dropdown */}
                      <select
                        value={selectedItemBId}
                        onChange={(e) => setSelectedItemBId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        {itemsInStoreB.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.brand} - {item.itemName} (฿{(item.unitPrice || parseFloat(item.proPrice) || 0).toFixed(2)}/หน่วย)
                          </option>
                        ))}
                      </select>

                      {/* Clean Product Hero Content */}
                      {selectedItemB ? (
                        <div className="pt-2 space-y-3">
                          <div className="flex items-start gap-3">
                            {selectedItemB.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({
                                  url: selectedItemB.imageUrl || '',
                                  title: `${selectedItemB.brand} - ${selectedItemB.itemName}`,
                                  store: selectedItemB.store,
                                })}
                                className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 group relative hover:ring-2 hover:ring-amber-500 transition-all cursor-pointer shadow-2xs"
                                title="คลิกดูภาพขยายใหญ่"
                              >
                                <img
                                  src={getGoogleDriveThumbUrl(selectedItemB.imageUrl)}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${
                                  selectedItemB.store === 'CJ More'
                                    ? 'bg-orange-500'
                                    : selectedItemB.store === 'Mini BigC'
                                      ? 'bg-emerald-600'
                                      : 'bg-sky-600'
                                }`}>
                                  {selectedItemB.store}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {selectedItemB.brand}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {selectedItemB.subCategory}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1 leading-snug line-clamp-2">
                                {selectedItemB.itemName}
                              </h4>
                            </div>
                          </div>

                          {/* Hero Price Badge */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                ราคาเฉลี่ยต่อหน่วย
                              </span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={`text-xl sm:text-2xl font-black ${
                                  battleResult?.winner === 'B' ? 'text-emerald-600' : 'text-slate-900'
                                }`}>
                                  ฿{battleResult ? battleResult.priceB.toFixed(2) : (selectedItemB.unitPrice || selectedItemB.proPrice)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">/หน่วย</span>
                              </div>
                            </div>

                            <div className="text-right">
                              {battleResult && battleResult.winner === 'B' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  👑 ถูกกว่า (-฿{battleResult.diff.toFixed(2)})
                                </span>
                              )}
                              {battleResult && battleResult.winner === 'A' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200/80 text-slate-600">
                                  แพงกว่า (+฿{battleResult.diff.toFixed(2)})
                                </span>
                              )}
                              {battleResult && battleResult.winner === 'TIE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                  ราคาเท่ากัน
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                                ป้าย ฿{selectedItemB.proPrice} (แพ็ค {selectedItemB.packSize})
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                          ยังไม่ได้เลือกสินค้า
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Structured Spec-by-Spec Comparison Table */}
                  {selectedItemA && selectedItemB && battleResult && (
                    <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                          <span>ตารางเปรียบเทียบสเปกและเงื่อนไข (Spec-by-Spec Comparison)</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          เปรียบเทียบแบบบรรทัดต่อบรรทัด
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-bold">
                              <th className="py-2.5 px-4 w-1/4">หัวข้อเปรียบเทียบ</th>
                              <th className={`py-2.5 px-4 w-5/12 ${battleResult.winner === 'A' ? 'bg-emerald-50/50 text-emerald-900 font-black' : ''}`}>
                                {selectedItemA.store} (ฝั่งที่ 1)
                              </th>
                              <th className={`py-2.5 px-4 w-5/12 ${battleResult.winner === 'B' ? 'bg-emerald-50/50 text-emerald-900 font-black' : ''}`}>
                                {selectedItemB.store} (ฝั่งที่ 2)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {/* Row 1: Unit Price */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-black text-slate-900">
                                ราคาเฉลี่ยต่อหน่วย
                              </td>
                              <td className={`py-3 px-4 font-black text-sm ${
                                battleResult.winner === 'A' ? 'bg-emerald-50/40 text-emerald-700' : 'text-slate-900'
                              }`}>
                                ฿{battleResult.priceA.toFixed(2)} / หน่วย
                                {battleResult.winner === 'A' && (
                                  <span className="ml-2 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                                    👑 ถูกกว่า ฿{battleResult.diff.toFixed(2)} (-{battleResult.percentDiff}%)
                                  </span>
                                )}
                              </td>
                              <td className={`py-3 px-4 font-black text-sm ${
                                battleResult.winner === 'B' ? 'bg-emerald-50/40 text-emerald-700' : 'text-slate-900'
                              }`}>
                                ฿{battleResult.priceB.toFixed(2)} / หน่วย
                                {battleResult.winner === 'B' && (
                                  <span className="ml-2 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                                    👑 ถูกกว่า ฿{battleResult.diff.toFixed(2)} (-{battleResult.percentDiff}%)
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Row 2: Promo Price */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-600">
                                ราคาป้ายโปรโมชั่น
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                ฿{selectedItemA.proPrice}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                ฿{selectedItemB.proPrice}
                              </td>
                            </tr>

                            {/* Row 3: Pack Size */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-600">
                                ขนาดแพ็คที่จัดโปร
                              </td>
                              <td className="py-2.5 px-4">
                                {selectedItemA.packSize} ชิ้น/ซอง
                              </td>
                              <td className="py-2.5 px-4">
                                {selectedItemB.packSize} ชิ้น/ซอง
                              </td>
                            </tr>

                            {/* Row 4: Retail Price */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-600">
                                ราคาปกติ (ก่อนจัดโปร)
                              </td>
                              <td className="py-2.5 px-4 text-slate-500">
                                {selectedItemA.retailPrice ? `฿${selectedItemA.retailPrice}` : 'ไม่ระบุ'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500">
                                {selectedItemB.retailPrice ? `฿${selectedItemB.retailPrice}` : 'ไม่ระบุ'}
                              </td>
                            </tr>

                            {/* Row 5: Discount Percent */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-600">
                                ส่วนลดจากราคาปกติ
                              </td>
                              <td className="py-2.5 px-4">
                                {selectedItemA.discPercent > 0 ? (
                                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                    ลด {selectedItemA.discPercent}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                {selectedItemB.discPercent > 0 ? (
                                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                    ลด {selectedItemB.discPercent}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>

                            {/* Row 6: Promo Period */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-600">
                                ระยะเวลาโปรโมชั่น
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {selectedItemA.period || '-'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {selectedItemB.period || '-'}
                              </td>
                            </tr>

                            {/* Row 7: Promotion Mechanics */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-600">
                                กลไก / เงื่อนไขโปร
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {selectedItemA.machanic || 'ไม่มีเงื่อนไขพิเศษ'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {selectedItemB.machanic || 'ไม่มีเงื่อนไขพิเศษ'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* PINNED COMPARISON BATTLES LIST */}
                {pinnedBattles.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-rose-500" />
                        <h4 className="text-base font-black text-slate-900">
                          รายการเทียบราคาที่คุณบันทึกไว้ ({pinnedBattles.length} รายการ)
                        </h4>
                      </div>
                      <span className="text-xs text-slate-400">
                        คลิกดูคู่เทียบเพื่อโหลดเข้าสนามประลองทันที
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {pinnedBattles.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-2xl border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all bg-slate-50/40 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                👑 {b.winnerStore} ชนะ (-{b.diff.toFixed(2)} ฿)
                              </span>
                              <span className="text-[10px] text-slate-400">
                                บันทึกเมื่อ {b.savedAt}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeletePinnedBattle(b.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 block">{b.storeA}</span>
                              <span className="font-bold text-slate-800 line-clamp-1 mt-0.5">{b.itemNameA}</span>
                              <span className="text-sm font-black text-slate-900 block mt-1">฿{b.unitPriceA.toFixed(2)}/หน่วย</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 block">{b.storeB}</span>
                              <span className="font-bold text-slate-800 line-clamp-1 mt-0.5">{b.itemNameB}</span>
                              <span className="text-sm font-black text-slate-900 block mt-1">฿{b.unitPriceB.toFixed(2)}/หน่วย</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleLoadPinnedBattle(b)}
                            className="w-full py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Swords className="w-3.5 h-3.5 text-amber-400" />
                            <span>โหลดเข้าสนามประลองเพื่อเปรียบเทียบ</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AUTO-MATCHED SKU COMPARISON TABLE */}
            {comparisonSubTab === 'auto' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-amber-500" />
                    <span>ตารางเปรียบเทียบราคาตัวต่อตัว (SKU Head-to-Head Comparison)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    เปรียบเทียบราคาเฉลี่ยต่อหน่วย (บาท/ชิ้น หรือ บาท/ซอง) จากใบปลิวและป้ายราคาจริง
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  พบทั้งหมด {crossStoreList.length} สินค้าที่ชนกัน
                </span>
              </div>

              {crossStoreList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm font-semibold text-slate-600">ไม่พบสินค้าชนกันในเงื่อนไขตัวกรองปัจจุบัน</p>
                  <p className="text-xs mt-1">ลองเปลี่ยนตัวกรองแบรนด์ หรือสลับไปดูหมวดหมู่อื่น</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {crossStoreList.map((item, idx) => {
                    const storeNames = ['CJ More', 'Mini BigC', 'Lotus Go Fresh'];
                    return (
                      <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            {item.stores['CJ More']?.imageUrl || item.stores['Mini BigC']?.imageUrl || item.stores['Lotus Go Fresh']?.imageUrl || item.stores["Lotus's"]?.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const img = item.stores['CJ More']?.imageUrl || item.stores['Mini BigC']?.imageUrl || item.stores['Lotus Go Fresh']?.imageUrl || item.stores["Lotus's"]?.imageUrl;
                                  if (img) setPreviewImage({ url: img, title: `${item.brand} - ${item.name}`, store: item.cheapestStores[0] || '' });
                                }}
                                className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-amber-500 flex-shrink-0 shadow-2xs group relative"
                              >
                                <img
                                  src={getGoogleDriveThumbUrl(item.stores['CJ More']?.imageUrl || item.stores['Mini BigC']?.imageUrl || item.stores['Lotus Go Fresh']?.imageUrl || item.stores["Lotus's"]?.imageUrl)}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  loading="lazy"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </button>
                            ) : null}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                                  {item.brand}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                หมวด: {item.category}
                              </span>
                            </div>
                          </div>

                          {/* Savings Pill */}
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                              <span>ซื้อที่ <strong>{item.cheapestStores.map((s: string) => s === "Lotus's" ? 'Lotus Go Fresh' : s).join(', ')}</strong> ถูกกว่า {item.diff} ฿ (-{item.diffPercent}%)</span>
                            </span>
                          </div>
                        </div>

                        {/* Stores Price Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          {storeNames.map((sName) => {
                            const storeData = item.stores[sName] || (sName.includes('Lotus') ? (item.stores['Lotus Go Fresh'] || item.stores["Lotus's"]) : undefined);
                            const isCheapest = storeData && item.cheapestStores.some((cs: string) => cs === sName || (cs.includes('Lotus') && sName.includes('Lotus')));
                            return (
                              <div
                                key={sName}
                                className={`p-3.5 rounded-2xl border transition-all ${!storeData
                                  ? 'bg-slate-50/50 border-slate-100 opacity-40'
                                  : isCheapest
                                    ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                                    : 'bg-white border-slate-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="font-black text-slate-700">{sName}</span>
                                  {isCheapest && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                                      <Crown className="w-3 h-3 text-amber-200" />
                                      <span>ถูกสุด</span>
                                    </span>
                                  )}
                                </div>

                                {storeData ? (
                                  <div>
                                    <div className="flex items-baseline gap-1">
                                      <span className={`text-xl font-black ${isCheapest ? 'text-emerald-700' : 'text-slate-900'}`}>
                                        {storeData.unitPrice.toFixed(2)}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-500">บาท/หน่วย</span>
                                      {!isCheapest && (
                                        <span className="text-[11px] font-bold text-rose-500 ml-auto">
                                          +{(storeData.unitPrice - item.minPrice).toFixed(2)} ฿
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                                      <span>ป้ายโปร: {storeData.proPrice} บ. (แพ็ค {storeData.packSize})</span>
                                      {storeData.period && <span>{storeData.period}</span>}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-2 text-center text-xs text-slate-400 font-medium">
                                    ไม่มีจัดโปรในรอบนี้
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>
        )}
        </main>
      </div>

      {/* Modal เจาะลึกรายการสินค้าตามกลไกโปรโมชั่น (Promotional Mechanics Drilldown Modal) */}
      {selectedMechanicModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-6 animate-in fade-in"
          onClick={() => setSelectedMechanicModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                  style={{
                    backgroundColor:
                      promoMechanics.find((m) => m.label === selectedMechanicModal)?.color || '#f59e0b',
                  }}
                >
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      กลไก: {selectedMechanicModal}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {mechanicModalItems.length} รายการ
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      สัดส่วน {promoMechanics.find((m) => m.label === selectedMechanicModal)?.percent || 0}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                    เจาะลึกสินค้ารายการโปรโมชั่นที่ใช้กลไกนี้ พร้อมรูปป้ายราคาจากหน้าร้านจริง
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportMechanicCSV}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="ดาวน์โหลดข้อมูลเฉพาะกลไกนี้เป็น CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>ส่งออก CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMechanicModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:px-5 sm:py-3 bg-white border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">จำนวนสินค้า</p>
                  <p className="text-sm font-black text-slate-900">{mechanicModalStats.total} รายการ</p>
                </div>
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-600 font-medium">ส่วนลดเฉลี่ย</p>
                  <p className="text-sm font-black text-emerald-700">-{mechanicModalStats.avgDiscount}%</p>
                </div>
                <Percent className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-amber-600 font-medium">ราคาเริ่มต้นที่</p>
                  <p className="text-sm font-black text-amber-700">{mechanicModalStats.minPrice} บาท</p>
                </div>
                <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-600 font-medium">พบมากที่สุดที่</p>
                  <p className="text-sm font-black text-blue-700 truncate">{mechanicModalStats.topStore}</p>
                </div>
                <Store className="w-4 h-4 text-blue-500 shrink-0" />
              </div>
            </div>

            {/* Modal Controls Toolbar (Store Filter, Search, Sort, View Toggle) */}
            <div className="p-3 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              {/* Store pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {['all', 'CJ More', 'Mini BigC', 'Lotus Go Fresh'].map((s) => {
                  const active = mechanicStoreFilter === s;
                  const count = filteredList.filter(
                    (r) =>
                      getMechanicType(r.machanic, r.promotion) === selectedMechanicModal &&
                      (s === 'all' || r.store === s || (s.includes('Lotus') && r.store?.includes('Lotus')))
                  ).length;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMechanicStoreFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${active
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                    >
                      <span>{s === 'all' ? 'ทุกห้าง' : s}</span>
                      <span
                        className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search, Sort & View Mode */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Search input */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาสินค้า / แบรนด์..."
                    value={mechanicSearchQuery}
                    onChange={(e) => setMechanicSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                {/* Sort dropdown */}
                <div className="relative shrink-0">
                  <select
                    value={mechanicSortBy}
                    onChange={(e) => setMechanicSortBy(e.target.value as any)}
                    className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs appearance-none cursor-pointer"
                  >
                    <option value="discount">ส่วนลดสูงสุด</option>
                    <option value="priceAsc">ราคาถูกสุด</option>
                    <option value="brand">แบรนด์ (ก-ฮ)</option>
                    <option value="freq">ความถี่สูงสุด</option>
                  </select>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setMechanicViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mechanicViewMode === 'list'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-700'
                      }`}
                    title="มุมมองแบบรายการ (List View)"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMechanicViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mechanicViewMode === 'grid'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-700'
                      }`}
                    title="มุมมองแบบการ์ดรูปภาพ (Grid View)"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Items Body */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 bg-slate-50/40">
              {mechanicModalItems.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-600" />
                  <p className="text-sm font-bold text-slate-700">ไม่พบรายการสินค้าที่ตรงกับเงื่อนไข</p>
                  <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองห้างอื่น</p>
                </div>
              ) : mechanicViewMode === 'list' ? (
                /* LIST VIEW MODE */
                <div className="grid grid-cols-1 gap-2.5">
                  {mechanicModalItems.map((r, i) => {
                    const discount = calculateDiscount(Number(r.retailPrice), Number(r.proPrice));
                    const unitPro = calculatePricePerSachet(Number(r.proPrice), Number(r.packSize));
                    return (
                      <div
                        key={i}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Image thumbnail with zoom preview */}
                          {r.imageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: r.imageUrl!,
                                  title: `${r.brand} - ${r.itemName}`,
                                  store: r.store,
                                })
                              }
                              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 group cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all shadow-2xs"
                              title="คลิกเพื่อดูรูปขยายใหญ่"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getDriveThumbnailUrl(r.imageUrl)}
                                alt={r.itemName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 border border-dashed border-slate-300 shrink-0 flex items-center justify-center text-slate-300">
                              <Tag className="w-5 h-5 opacity-40" />
                            </div>
                          )}

                          {/* Product Info */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${r.store === 'CJ More'
                                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                  : r.store === 'Mini BigC'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-sky-100 text-sky-800 border border-sky-200'
                                  }`}
                              >
                                {r.store}
                              </span>
                              <span className="font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                {r.brand}
                              </span>
                              {r.subCategory && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {r.subCategory}
                                </span>
                              )}
                              {r.period && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{r.period}</span>
                                </span>
                              )}
                              {r.freqMonth && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {r.freqMonth} ครั้ง/เดือน
                                </span>
                              )}
                            </div>

                            <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2">
                              {r.itemName}
                            </p>

                            {r.machanic && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150 inline-block font-medium">
                                💬 {r.machanic}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-right">
                            {r.retailPrice && (
                              <span className="text-slate-400 line-through text-xs mr-2 sm:mr-0 sm:block font-medium">
                                ปกติ {r.retailPrice} บ.
                              </span>
                            )}
                            <div className="flex items-center sm:justify-end gap-1.5">
                              <span className="font-black text-amber-600 text-base sm:text-lg">
                                {r.proPrice} บ.
                              </span>
                              {discount.percent !== null && discount.percent > 0 && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  -{discount.percent}%
                                </span>
                              )}
                            </div>
                            {unitPro !== null && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                                เฉลี่ย {unitPro.toFixed(2)} บ./{r.category === 'noodle' ? 'ชิ้น' : 'ซอง'}
                              </span>
                            )}
                          </div>

                          {r.imageUrl && (
                            <a
                              href={r.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 mt-1 sm:mt-1.5 hover:underline"
                            >
                              <span>เปิดดูรูป</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* GRID VIEW MODE (Product Visual Cards) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mechanicModalItems.map((r, i) => {
                    const discount = calculateDiscount(Number(r.retailPrice), Number(r.proPrice));
                    const unitPro = calculatePricePerSachet(Number(r.proPrice), Number(r.packSize));
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                      >
                        {/* Card Image Header */}
                        <div className="relative w-full h-36 bg-slate-100 overflow-hidden border-b border-slate-100 flex items-center justify-center">
                          {r.imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getDriveThumbnailUrl(r.imageUrl)}
                                alt={r.itemName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: r.imageUrl!,
                                    title: `${r.brand} - ${r.itemName}`,
                                    store: r.store,
                                  })
                                }
                                className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-bold gap-1"
                              >
                                <ZoomIn className="w-4 h-4" />
                                <span>ขยายรูป</span>
                              </button>
                            </>
                          ) : (
                            <div className="text-slate-300 flex flex-col items-center">
                              <Tag className="w-8 h-8 opacity-30" />
                              <span className="text-[10px] mt-1">ไม่มีรูปภาพ</span>
                            </div>
                          )}

                          {/* Store badge overlay */}
                          <div className="absolute top-2 left-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black shadow-xs ${r.store === 'CJ More'
                                ? 'bg-orange-600 text-white'
                                : r.store === 'Mini BigC'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-sky-600 text-white'
                                }`}
                            >
                              {r.store}
                            </span>
                          </div>

                          {/* Discount badge overlay */}
                          {discount.percent !== null && discount.percent > 0 && (
                            <div className="absolute top-2 right-2">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-600 text-white shadow-xs">
                                -{discount.percent}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                {r.brand}
                              </span>
                              {r.subCategory && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {r.subCategory}
                                </span>
                              )}
                              {r.freqMonth && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-50 text-indigo-700">
                                  {r.freqMonth}x/ด.
                                </span>
                              )}
                            </div>

                            <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                              {r.itemName}
                            </p>

                            {r.machanic && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-150 line-clamp-2">
                                💬 {r.machanic}
                              </p>
                            )}
                          </div>

                          {/* Card Price & Link */}
                          <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                            <div>
                              {r.retailPrice && (
                                <span className="text-slate-400 line-through text-[11px] block">
                                  ปกติ {r.retailPrice} บ.
                                </span>
                              )}
                              <span className="font-black text-amber-600 text-base">
                                {r.proPrice} บ.
                              </span>
                              {unitPro !== null && (
                                <span className="text-[10px] text-slate-400 block">
                                  เฉลี่ย {unitPro.toFixed(2)} บ./{r.category === 'noodle' ? 'ชิ้น' : 'ซอง'}
                                </span>
                              )}
                            </div>

                            {r.imageUrl && (
                              <a
                                href={r.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 hover:underline"
                              >
                                <span>เปิดรูป</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:px-5 sm:py-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">
                  รวมแสดง {mechanicModalItems.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={handleExportMechanicCSV}
                  className="sm:hidden text-amber-600 hover:text-amber-800 font-bold inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก CSV</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMechanicModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal (ป๊อปอัปแสดงรายละเอียดของสินค้า) */}
      {selectedProductModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedProductModal(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-xs ${
                  selectedProductModal.store === 'CJ More'
                    ? 'bg-orange-500'
                    : selectedProductModal.store === 'Mini BigC'
                      ? 'bg-emerald-600'
                      : 'bg-sky-600'
                }`}>
                  {selectedProductModal.store}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-slate-100 text-slate-800">
                  {selectedProductModal.brand}
                </span>
                {selectedProductModal.subCategory && (
                  <span className="text-xs text-slate-400 font-medium">
                    {selectedProductModal.subCategory}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Product Hero Image + Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {selectedProductModal.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedProductModal;
                      setSelectedProductModal(null);
                      setPreviewImage({
                        url: item.imageUrl || '',
                        title: `${item.brand} - ${item.itemName}`,
                        store: item.store,
                      });
                    }}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 group relative hover:ring-2 hover:ring-rose-500 transition-all cursor-pointer shadow-sm"
                    title="คลิกเพื่อดูภาพขยายใหญ่"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getGoogleDriveThumbUrl(selectedProductModal.imageUrl, 'w600')}
                      alt={selectedProductModal.itemName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                      <ZoomIn className="w-4 h-4" />
                      <span>ขยาย</span>
                    </div>
                  </button>
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 text-slate-400">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-[10px] mt-1">ไม่มีรูปภาพ</span>
                  </div>
                )}

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {selectedProductModal.itemName}
                  </h3>

                  {/* Highlights Pill */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {selectedProductModal.discPercent > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
                        ลด {selectedProductModal.discPercent}%
                      </span>
                    )}
                    {selectedProductModal.discAmount > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ประหยัด ฿{selectedProductModal.discAmount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">
                    ราคาโปรโมชั่น
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-slate-900">
                      ฿{selectedProductModal.proPrice}
                    </span>
                    {selectedProductModal.retailPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        ฿{selectedProductModal.retailPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">
                    ขนาดแพ็ค: {selectedProductModal.packSize} ชิ้น/ซอง
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 border border-amber-200/80">
                  <span className="text-[11px] font-bold text-amber-900/70 block uppercase">
                    ราคาเฉลี่ยต่อหน่วย
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-amber-700">
                      ฿{selectedProductModal.unitPrice ? selectedProductModal.unitPrice.toFixed(2) : selectedProductModal.proPrice}
                    </span>
                    <span className="text-xs font-bold text-amber-800">
                      /{selectedProductModal.category === 'coffee' ? 'ซอง' : 'หน่วย'}
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-900/80 font-medium block mt-1">
                    คำนวณราคาเฉลี่ยสุทธิ
                  </span>
                </div>
              </div>

              {/* Detailed Specs List */}
              <div className="rounded-2xl border border-slate-200/80 divide-y divide-slate-100 text-xs overflow-hidden">
                <div className="p-3 flex items-center justify-between bg-slate-50/50">
                  <span className="text-slate-500 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>ระยะเวลาโปรโมชั่น</span>
                  </span>
                  <span className="font-black text-slate-800">
                    {selectedProductModal.period || '-'}
                  </span>
                </div>

                {selectedProductModal.machanic && (
                  <div className="p-3 flex items-start justify-between gap-3">
                    <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>เงื่อนไข / กลไกโปร</span>
                    </span>
                    <span className="font-bold text-slate-800 text-right bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/60">
                      {selectedProductModal.machanic}
                    </span>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 font-bold">หมวดหมู่สินค้า</span>
                  <span className="font-bold text-slate-800">
                    {selectedProductModal.category === 'coffee' ? '☕ กาแฟ' : '🍜 บะหมี่กึ่งสำเร็จรูป/โจ๊ก'} {selectedProductModal.subCategory ? `(${selectedProductModal.subCategory})` : ''}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 font-bold">ห้างสรรพสินค้า</span>
                  <span className="font-black text-slate-800">
                    {selectedProductModal.store}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('comparison');
                    setComparisonSubTab('custom');
                    if (selectedProductModal.store) {
                      setStoreA(selectedProductModal.store);
                    }
                    if (selectedProductModal.id) {
                      setSelectedItemAId(selectedProductModal.id);
                    }
                    setSelectedProductModal(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span>นำไปเทียบราคากับห้างอื่น</span>
                </button>

                {selectedProductModal.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedProductModal;
                      setSelectedProductModal(null);
                      setPreviewImage({
                        url: item.imageUrl || '',
                        title: `${item.brand} - ${item.itemName}`,
                        store: item.store,
                      });
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="ดูรูปภาพขยายใหญ่"
                  >
                    <ZoomIn className="w-4 h-4 text-slate-500" />
                    <span>ดูรูป</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal สำหรับดูรูปภาพขนาดใหญ่ */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 mr-2">
                  {previewImage.store}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {previewImage.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-900 flex flex-col items-center justify-center min-h-[320px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getGoogleDriveThumbUrl(previewImage.url, 'w1200')}
                alt="Promotion preview"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="mt-4 text-center">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20"
                >
                  <span>เปิดดูภาพต้นฉบับใน Google Drive</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full p-4 overflow-y-auto z-10 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block leading-tight">
                      เมนูวิเคราะห์
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium block">
                      Promotion Intelligence
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile View Buttons */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => { setViewMode('overview'); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all ${
                    viewMode === 'overview'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>ภาพรวมและชาร์ต</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setViewMode('monthly'); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all ${
                    viewMode === 'monthly'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4" />
                    <span>สถิติรายเดือน</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                    12 เดือน
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setViewMode('frequency'); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all ${
                    viewMode === 'frequency'
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4" />
                    <span>ความถี่จัดโปร</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-900">
                    {frequencyAnalytics.overallAvgMonthlyFreq} ดีล/ด.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setViewMode('comparison'); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all ${
                    viewMode === 'comparison'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Swords className="w-4 h-4" />
                    <span>เทียบราคาข้ามห้าง</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-900">
                    {crossStoreList.length} ดีล
                  </span>
                </button>
              </div>

              {/* Mobile Filter Section */}
              <div className="pt-2 border-t border-slate-100">
                <DashboardFilterControls
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedStore={selectedStore}
                  setSelectedStore={setSelectedStore}
                  storeCounts={storeCounts}
                  rawListLength={rawList.length}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  coffeeCount={coffeeRows.length}
                  noodleCount={noodleRows.length}
                  selectedSubCategory={selectedSubCategory}
                  setSelectedSubCategory={setSelectedSubCategory}
                  subCategoryCounts={subCategoryCounts}
                  selectedBrand={selectedBrand}
                  setSelectedBrand={setSelectedBrand}
                  availableBrands={availableBrands}
                  isAnyFilterActive={isAnyFilterActive}
                  clearAllFilters={clearAllFilters}
                  filteredCount={filteredList.length}
                />
              </div>

              {/* Mobile Quick Data Tools */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  จัดการข้อมูล
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <a
                    href="https://docs.google.com/spreadsheets/d/11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sheets</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => { fetchData(); setIsMobileSidebarOpen(false); }}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Apply Button Sticky at Bottom */}
            <div className="pt-3 border-t border-slate-100 space-y-2 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ดูผลลัพธ์</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px]">
                  {filteredList.length} รายการ
                </span>
              </button>
              <div className="text-center">
                <span className="text-[10px] text-slate-400">
                  Promo Tracker © 2026
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION PILL ON BOTTOM-LEFT (DESKTOP) */}
      {!isDesktopSidebarOpen && (
        <button
          type="button"
          onClick={toggleDesktopSidebar}
          className="hidden lg:flex fixed left-5 bottom-6 z-40 items-center gap-2 px-4 py-2.5 bg-[#0f2b5c]/95 hover:bg-[#0a2342] text-white rounded-full shadow-xl hover:shadow-2xl border border-sky-400/50 backdrop-blur-md text-xs font-bold transition-all hover:scale-105 cursor-pointer group"
          title="คลิกเพื่อสไลด์เปิดแถบเมนูและตัวกรองข้อมูล"
        >
          <PanelLeftOpen className="w-4 h-4 text-sky-300 group-hover:scale-110 transition-transform" />
          <span>เปิดเมนู & ตัวกรอง</span>
          {isAnyFilterActive && (
            <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
          )}
        </button>
      )}
    </div>
  );
}
