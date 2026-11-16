'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import {
  TRACKED_BRANDS,
  COMMON_NOODLE_BRANDS,
  TRACKED_STORES,
  SheetRowData,
  PromoCategory,
  CATEGORIES,
} from '@/types';
import { getWeekIdentifier, getBangkokDate, classifyNoodleSubCategory } from '@/lib/calc';
import { getCachedHistoryRows } from '@/lib/client-api';
import { fetchRecentSheetRows } from '@/lib/sheets';
import {
  History,
  Store,
  Tag,
  Calendar,
  ExternalLink,
  RefreshCw,
  Filter,
  BarChart3,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function HistoryPage() {
  const [category, setCategory] = useState<PromoCategory>('coffee');
  const [rows, setRows] = useState<(SheetRowData & { imageUrl?: string })[]>(() =>
    getCachedHistoryRows('PRT', 200) as (SheetRowData & { imageUrl?: string })[]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  const sheetName = CATEGORIES[category].sheetName;

  const fetchHistory = async (targetCategory = category) => {
    setLoading(true);
    setError(null);
    const targetSheet = CATEGORIES[targetCategory].sheetName;
    try {
      // 1. ลองดึงข้อมูลสดตรงจาก Google Apps Script Web App
      const resGas = await fetchRecentSheetRows(200, targetSheet);
      if (resGas && Array.isArray(resGas.rows)) {
        setRows(resGas.rows);
        return;
      }
    } catch {
      // 2. ลอง Local API หากมีเซิร์ฟเวอร์
      try {
        const res = await fetch(`/api/history?limit=200&sheetName=${targetSheet}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.rows)) {
            setRows(data.rows);
            return;
          }
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }

    // โหลดข้อมูลล่าสุดจากแคช
    const fallbackRows = getCachedHistoryRows(targetSheet, 200) as (SheetRowData & { imageUrl?: string })[];
    setRows(fallbackRows);
  };

  useEffect(() => {
    fetchHistory(category);
  }, [category]);

  const currentWeekKey = getWeekIdentifier(getBangkokDate());
  const activeBrands = category === 'coffee' ? TRACKED_BRANDS : COMMON_NOODLE_BRANDS.slice(0, 6);

  // สรุปจำนวนโปรโมชั่นในสัปดาห์ปัจจุบัน (Store x Brand Matrix)
  const currentWeekRows = rows.filter((r) => {
    const rowWeekKey = getWeekIdentifier(r.date);
    return rowWeekKey === currentWeekKey;
  });

  const matrixCounts: Record<string, Record<string, number>> = {};
  TRACKED_STORES.forEach((s) => {
    matrixCounts[s] = {};
    activeBrands.forEach((b) => {
      matrixCounts[s][b] = 0;
    });
  });

  currentWeekRows.forEach((r) => {
    const s = r.store.trim();
    const b = r.brand.trim();
    if (matrixCounts[s] && matrixCounts[s][b] !== undefined) {
      matrixCounts[s][b] += 1;
    }
  });

  // คำนวณจำนวนในแต่ละ Sub-Category เมื่อเป็นหมวด Noodle
  const subCategoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      all: rows.length,
      'บะหมี่กึ่งสำเร็จรูป': 0,
      'โจ๊ก': 0,
      'ข้าวต้ม': 0,
      'มันบด': 0,
    };
    rows.forEach((r) => {
      const sub = r.subCategory || classifyNoodleSubCategory(r.brand, r.itemName, r.machanic);
      if (counts[sub] !== undefined) {
        counts[sub] += 1;
      }
    });
    return counts;
  }, [rows]);

  // กรองรายการตาม Store, Brand, Week, SubCategory
  const filteredRows = rows.filter((r) => {
    if (storeFilter !== 'all' && r.store.trim() !== storeFilter) return false;
    if (brandFilter !== 'all' && r.brand.trim() !== brandFilter) return false;
    if (weekFilter === 'thisWeek') {
      const rowWeekKey = getWeekIdentifier(r.date);
      if (rowWeekKey !== currentWeekKey) return false;
    }
    if (category === 'noodle' && subCategoryFilter !== 'all') {
      const itemSub = r.subCategory || classifyNoodleSubCategory(r.brand, r.itemName, r.machanic);
      if (itemSub !== subCategoryFilter) return false;
    }
    return true;
  });

  return (
    <>
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <History className="w-6 h-6 text-amber-600" />
              <span>ประวัติโปรโมชั่น & สรุปภาพรวม</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ดึงข้อมูล 50 รายการล่าสุดจาก Google Sheet แท็บ {sheetName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchHistory(category)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>

            <a
              href="https://docs.google.com/spreadsheets/d/11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs sm:text-sm font-medium rounded-xl transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>เปิด Sheet ({sheetName})</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex p-1.5 bg-slate-200/80 rounded-2xl max-w-lg shadow-inner">
          <button
            type="button"
            onClick={() => {
              setCategory('coffee');
              setSubCategoryFilter('all');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              category === 'coffee'
                ? 'bg-white text-amber-900 shadow-md shadow-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>☕ กาแฟซอง</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              PRT
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory('noodle');
              setSubCategoryFilter('all');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              category === 'noodle'
                ? 'bg-white text-orange-900 shadow-md shadow-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🍜 บะหมี่ / โจ๊ก / ข้าวต้ม</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
              NOODLE
            </span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Weekly Summary Matrix */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              <span>
                สรุปโปรโมชั่นประจำสัปดาห์นี้ ({currentWeekKey}) - แท็บ {sheetName}
              </span>
            </h2>
            <span className="text-xs text-slate-400">
              รวม {currentWeekRows.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">ร้านค้า</th>
                  {activeBrands.map((b) => (
                    <th key={b} className="py-2.5 px-3 font-semibold text-center">
                      {b}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-semibold text-center bg-amber-50/50 text-amber-900">
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TRACKED_STORES.map((s) => {
                  let storeTotal = 0;
                  return (
                    <tr key={s} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{s}</td>
                      {activeBrands.map((b) => {
                        const count = matrixCounts[s]?.[b] || 0;
                        storeTotal += count;
                        return (
                          <td key={b} className="py-2.5 px-3 text-center">
                            {count > 0 ? (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-xs">
                                {count}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-bold text-amber-900 bg-amber-50/30">
                        {storeTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="w-4 h-4 text-amber-600" />
            <span>ตัวกรองรายการ ({filteredRows.length} จาก {rows.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Store filter */}
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">เลือกร้านค้า</label>
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">ทุกร้านค้า</option>
                {TRACKED_STORES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand filter */}
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">เลือกแบรนด์</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">ทุกแบรนด์</option>
                {activeBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Week filter */}
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">เลือกช่วงสัปดาห์</label>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">ทั้งหมด (50 แถวล่าสุด)</option>
                <option value="thisWeek">เฉพาะสัปดาห์นี้ ({currentWeekKey})</option>
              </select>
            </div>
          </div>

          {/* Sub-Category Pills for Noodle Category */}
          {category === 'noodle' && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600">
                หมวดหมู่อาหาร (Sub-Category):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'ทั้งหมด', icon: '🍽️', count: rows.length },
                  { id: 'บะหมี่กึ่งสำเร็จรูป', label: 'บะหมี่', icon: '🍜', count: subCategoryCounts['บะหมี่กึ่งสำเร็จรูป'] || 0 },
                  { id: 'โจ๊ก', label: 'โจ๊ก', icon: '🥣', count: subCategoryCounts['โจ๊ก'] || 0 },
                  { id: 'ข้าวต้ม', label: 'ข้าวต้ม', icon: '🍲', count: subCategoryCounts['ข้าวต้ม'] || 0 },
                  { id: 'มันบด', label: 'มันบด', icon: '🥔', count: subCategoryCounts['มันบด'] || 0 },
                ].map((pill) => {
                  const active = subCategoryFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setSubCategoryFilter(pill.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span>{pill.icon} {pill.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          active ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rows List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <p className="text-sm text-slate-500">กำลังโหลดข้อมูลจาก Google Sheet แท็บ {sheetName}...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">ไม่พบข้อมูลโปรโมชั่นในแท็บ {sheetName}</p>
            <p className="text-xs text-slate-400">ลองสลับหมวด หรือเริ่มบันทึกโปรโมชั่นใหม่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((r, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow space-y-2.5 text-xs sm:text-sm"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{r.brand}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded-lg text-xs">
                      {r.store}
                    </span>
                    {category === 'noodle' && (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
                        {r.subCategory || classifyNoodleSubCategory(r.brand, r.itemName, r.machanic)}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                        r.color.includes('แดง') && r.color.includes('เขียว')
                          ? 'bg-amber-100 text-amber-800'
                          : r.color.includes('แดง')
                          ? 'bg-rose-100 text-rose-800'
                          : r.color.includes('เขียว')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {r.color}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span>{r.date}</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-md font-semibold">
                      {r.freqMonth || r.freqWeek || 1} ครั้ง/เดือน
                    </span>
                  </div>
                </div>

                {/* Item Name */}
                <div className="font-medium text-slate-700">{r.itemName}</div>

                {/* Mechanic */}
                {r.machanic && (
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 text-xs leading-relaxed">
                    {r.machanic}
                  </div>
                )}

                {/* Prices & Meta */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {r.retailPrice && (
                      <span className="text-slate-400 line-through">
                        ปกติ {r.retailPrice} บ.
                      </span>
                    )}
                    {r.proPrice && (
                      <span className="font-bold text-amber-700 text-sm">
                        โปร {r.proPrice} บ.
                      </span>
                    )}
                    {r.packSize && (
                      <span className="text-slate-500">
                        ({r.packSize} {category === 'noodle' ? 'ชิ้น' : 'ซอง'})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {r.period && (
                      <span className="text-slate-600 flex items-center gap-1.5 flex-wrap">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.period}</span>
                        {r.isPredictedPeriod && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            🔮 คาดการณ์
                          </span>
                        )}
                      </span>
                    )}

                    {r.imageUrl && (
                      <a
                        href={r.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        <span>ดูรูป</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
