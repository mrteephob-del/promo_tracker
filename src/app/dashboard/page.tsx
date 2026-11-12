'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import {
  TrendingUp,
  Award,
  DollarSign,
  Store,
  Layers,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Tag,
  Coffee,
  UtensilsCrossed,
  Flame,
} from 'lucide-react';
import { PromoCategory } from '@/types';
import { calculateDiscount, calculatePricePerSachet, formatPrice } from '@/lib/calc';

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
  period: string;
  machanic: string;
  retailPrice: string;
  proPrice: string;
  imageUrl?: string;
}

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'coffee' | 'noodle'>('all');
  const [coffeeRows, setCoffeeRows] = useState<SheetRow[]>([]);
  const [noodleRows, setNoodleRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ตัวกรอง
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'discountPercent' | 'proPrice' | 'brand'>('discountPercent');

  // ดึงข้อมูลจากทั้ง 2 แถบชีต
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resPrt, resNoodle] = await Promise.all([
        fetch('/api/history?sheetName=PRT&limit=2000'),
        fetch('/api/history?sheetName=NOODLE&limit=2000'),
      ]);

      const dataPrt = await resPrt.json();
      const dataNoodle = await resNoodle.json();

      if (dataPrt.ok) setCoffeeRows(dataPrt.rows || []);
      if (dataNoodle.ok) setNoodleRows(dataNoodle.rows || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ไม่สามารถโหลดข้อมูลจาก Google Sheet ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // รวมและแปลงแถวข้อมูล
  const rawList = useMemo(() => {
    const list: (SheetRow & { category: PromoCategory; discAmount: number; discPercent: number; unitPrice: number | null })[] = [];

    if (selectedCategory === 'all' || selectedCategory === 'coffee') {
      for (const r of coffeeRows) {
        const retail = parseFloat(r.retailPrice) || null;
        const pro = parseFloat(r.proPrice) || null;
        const disc = calculateDiscount(retail, pro);
        const unit = calculatePricePerSachet(pro, Number(r.packSize) || 1);
        list.push({
          ...r,
          category: 'coffee',
          discAmount: disc.amount || 0,
          discPercent: disc.percent || 0,
          unitPrice: unit,
        });
      }
    }

    if (selectedCategory === 'all' || selectedCategory === 'noodle') {
      for (const r of noodleRows) {
        const retail = parseFloat(r.retailPrice) || null;
        const pro = parseFloat(r.proPrice) || null;
        const disc = calculateDiscount(retail, pro);
        const unit = calculatePricePerSachet(pro, Number(r.packSize) || 1);
        list.push({
          ...r,
          category: 'noodle',
          discAmount: disc.amount || 0,
          discPercent: disc.percent || 0,
          unitPrice: unit,
        });
      }
    }

    return list;
  }, [coffeeRows, noodleRows, selectedCategory]);

  // ตัวเลือกสำหรับ Filter Dropdown
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

  // รายการที่ผ่านการกรอง (Filtered Items)
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      if (selectedStore !== 'all' && item.store !== selectedStore) return false;
      if (selectedBrand !== 'all' && item.brand !== selectedBrand) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${item.itemName} ${item.brand} ${item.store} ${item.machanic}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [rawList, selectedStore, selectedBrand, searchQuery]);

  // เรียงลำดับ
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (sortBy === 'discountPercent') return b.discPercent - a.discPercent;
      if (sortBy === 'proPrice') {
        const pA = parseFloat(a.proPrice) || 0;
        const pB = parseFloat(b.proPrice) || 0;
        return pA - pB;
      }
      return a.brand.localeCompare(b.brand);
    });
  }, [filteredList, sortBy]);

  // สถิติ KPI หลัก
  const kpis = useMemo(() => {
    const totalPromos = filteredList.length;
    let maxDiscItem = filteredList[0] || null;
    let minUnitItem: (typeof filteredList)[0] | null = null;
    let totalDiscPercent = 0;
    let validDiscCount = 0;

    const storeCounts: Record<string, number> = {};

    for (const item of filteredList) {
      if (item.discPercent > (maxDiscItem?.discPercent || 0)) {
        maxDiscItem = item;
      }
      if (item.unitPrice && item.unitPrice > 0) {
        if (!minUnitItem || !minUnitItem.unitPrice || item.unitPrice < minUnitItem.unitPrice) {
          minUnitItem = item;
        }
      }
      if (item.discPercent > 0) {
        totalDiscPercent += item.discPercent;
        validDiscCount++;
      }
      storeCounts[item.store] = (storeCounts[item.store] || 0) + 1;
    }

    let topStore = '-';
    let topStoreCount = 0;
    for (const [s, count] of Object.entries(storeCounts)) {
      if (count > topStoreCount) {
        topStore = s;
        topStoreCount = count;
      }
    }

    const avgDiscPercent = validDiscCount > 0 ? (totalDiscPercent / validDiscCount).toFixed(1) : '0';

    return {
      totalPromos,
      maxDiscItem,
      minUnitItem,
      topStore,
      topStoreCount,
      avgDiscPercent,
    };
  }, [filteredList]);

  // ชาร์ต: Share of Voice ตามแบรนด์ (Top 6 Brands)
  const brandShare = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      const b = r.brand || 'อื่นๆ';
      counts[b] = (counts[b] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const otherCount = sorted.slice(5).reduce((sum, curr) => sum + curr[1], 0);

    const result = [...top5];
    if (otherCount > 0) {
      result.push(['อื่นๆ', otherCount]);
    }

    const total = filteredList.length || 1;
    const colors = [
      '#f59e0b', // amber
      '#3b82f6', // blue
      '#10b981', // emerald
      '#ec4899', // pink
      '#8b5cf6', // purple
      '#94a3b8', // slate (others)
    ];

    return result.map(([brand, count], idx) => ({
      brand,
      count,
      percent: ((count / total) * 100).toFixed(1),
      color: colors[idx % colors.length],
    }));
  }, [filteredList]);

  // ชาร์ต: ร้านค้า (Store Breakdown)
  const storeShare = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      const s = r.store || 'ไม่ระบุ';
      counts[s] = (counts[s] || 0) + 1;
    });
    const total = filteredList.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([store, count]) => ({
        store,
        count,
        percent: ((count / total) * 100).toFixed(1),
      }));
  }, [filteredList]);

  // ชาร์ต: ชนิดบรรจุภัณฑ์ (ซอง vs ถ้วย หรือ แดง vs เขียว)
  const packageShare = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      const pkg = r.color || 'ไม่ระบุ';
      counts[pkg] = (counts[pkg] || 0) + 1;
    });
    const total = filteredList.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([pkg, count]) => ({
        package: pkg,
        count,
        percent: ((count / total) * 100).toFixed(1),
      }));
  }, [filteredList]);

  // ชาร์ต: ประเภทโปรโมชั่น (Promotion Mechanics)
  const promoTypeShare = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      let t = r.promotion || 'ลดราคา';
      if (t.includes('1 แถม 1')) t = '1 แถม 1';
      else if (t.includes('ซื้อ 2') || t.includes('ซื้อคู่')) t = 'ซื้อคู่/2 ชิ้น';
      else if (t.includes('แลกซื้อ')) t = 'แลกซื้อ';
      else if (t.includes('ชิ้นที่สอง')) t = 'ชิ้นที่ 2 ลด';
      else t = 'ลดราคาตรงๆ';
      counts[t] = (counts[t] || 0) + 1;
    });
    const total = filteredList.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        percent: ((count / total) * 100).toFixed(1),
      }));
  }, [filteredList]);

  // ส่งออกเป็น CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = [
      'หมวด',
      'วันที่',
      'ร้านค้า',
      'แบรนด์',
      'ชื่อสินค้า',
      'บรรจุภัณฑ์/สี',
      'ขนาดแพ็ค',
      'ประเภทโปรโมชั่น',
      'ระยะเวลา',
      'กลไกราคา',
      'ราคาปกติ',
      'ราคาโปร',
      'ส่วนลด(บาท)',
      'ส่วนลด(%)',
      'ราคาต่อซอง/หน่วย',
      'ลิงก์รูป',
    ];

    const rows = filteredList.map((r) => [
      r.category === 'coffee' ? 'กาแฟซอง' : 'บะหมี่/โจ๊ก',
      `"${r.date}"`,
      `"${r.store}"`,
      `"${r.brand}"`,
      `"${r.itemName}"`,
      `"${r.color}"`,
      r.packSize,
      `"${r.promotion}"`,
      `"${r.period}"`,
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
    link.setAttribute('download', `promo_dashboard_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-xl shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Promotion Intelligence Dashboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              แดชบอร์ดวิเคราะห์สงครามราคา สัดส่วนการจัดโปรโมชั่น และดีลสุดคุ้มข้ามร้านค้า
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              <span>รีเฟรช</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredList.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ทั้งหมด ({coffeeRows.length + noodleRows.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('coffee')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'coffee'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>☕ กาแฟซอง ({coffeeRows.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('noodle')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'noodle'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>🍜 บะหมี่/โจ๊ก ({noodleRows.length})</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Store Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Store className="w-3 h-3 text-amber-600" />
              <span>ร้านค้า:</span>
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">ทุกร้านค้า ({availableStores.length} ร้าน)</option>
              {availableStores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-600" />
              <span>แบรนด์:</span>
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">ทุกแบรนด์ ({availableBrands.length} แบรนด์)</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-amber-600" />
              <span>ค้นหาชื่อสินค้า / รสชาติ:</span>
            </label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อสินค้า เช่น ริช อโรมา, ต้มยำกุ้ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-amber-600" />
              <span>เรียงลำดับตาม:</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="discountPercent">🔥 ลดราคา % มากที่สุด</option>
              <option value="proPrice">💰 ราคาโปรโมชั่นถูกที่สุด</option>
              <option value="brand">🔤 ชื่อแบรนด์ (ก-ฮ)</option>
            </select>
          </div>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">กำลังดึงข้อมูลและประมวลผล Dashboard...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 4 Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* KPI 1: Total Active Promos */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    จำนวนโปรโมชั่น
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {kpis.totalPromos.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">รายการ</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  เฉลี่ยลดราคา {kpis.avgDiscPercent}%
                </div>
              </div>

              {/* KPI 2: Deepest Discount */}
              <div className="bg-gradient-to-br from-rose-500 to-orange-600 text-white rounded-3xl p-4 sm:p-5 shadow-md shadow-rose-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>ลดแรงที่สุด</span>
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight">
                    {kpis.maxDiscItem ? `-${kpis.maxDiscItem.discPercent}%` : '-'}
                  </span>
                  {kpis.maxDiscItem?.discAmount ? (
                    <span className="text-xs font-semibold text-white/80">
                      (ลด {kpis.maxDiscItem.discAmount} บ.)
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-white/90 truncate mt-1">
                  {kpis.maxDiscItem
                    ? `${kpis.maxDiscItem.brand} - ${kpis.maxDiscItem.itemName} (${kpis.maxDiscItem.store})`
                    : 'ไม่มีข้อมูล'}
                </div>
              </div>

              {/* KPI 3: Lowest Unit Price */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ราคาเฉลี่ยต่ำสุด
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    {kpis.minUnitItem?.unitPrice ? `${kpis.minUnitItem.unitPrice}` : '-'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    บาท/{selectedCategory === 'coffee' ? 'ซอง' : 'หน่วย'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-1">
                  {kpis.minUnitItem
                    ? `${kpis.minUnitItem.brand} (${kpis.minUnitItem.store})`
                    : 'ไม่มีข้อมูล'}
                </div>
              </div>

              {/* KPI 4: Top Promo Store */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ร้านที่จัดโปรมากสุด
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
                    {kpis.topStore}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ({kpis.topStoreCount} ดีล)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  คิดเป็น {((kpis.topStoreCount / (filteredList.length || 1)) * 100).toFixed(0)}% ของโปรโมชั่นทั้งหมด
                </div>
              </div>
            </div>

            {/* Charts Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 1: Brand Share of Voice */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-600" />
                    <span>สัดส่วนการจัดโปรโมชั่นตามแบรนด์ (Brand Share of Voice)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    แบรนด์ที่มีรายการโปรโมชั่นมากที่สุดในกลุ่มที่เลือก
                  </p>
                </div>

                {/* Bars & Breakdown */}
                <div className="space-y-3 mt-4">
                  {brandShare.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.brand}</span>
                        </span>
                        <span className="text-slate-500">
                          <span className="font-bold text-slate-900">{item.count}</span> รายการ ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 2: Store Breakdown & Promo Types */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>การกระจายตัวตามร้านค้า (Store Distribution)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    เปรียบเทียบความหนาแน่นของโปรโมชั่นในแต่ละร้านค้า
                  </p>
                </div>

                <div className="space-y-3.5 mt-4">
                  {storeShare.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="font-bold text-slate-800">{item.store}</span>
                        <span className="text-slate-500">
                          <span className="font-bold text-slate-900">{item.count}</span> โปรโมชั่น ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sub-breakdown: Promo Mechanics */}
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    กลไกโปรโมชั่นที่ใช้บ่อย:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {promoTypeShare.map((pt, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{pt.type}</span>
                        <span className="text-slate-400">({pt.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Top 10 Best Deals Leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>10 ดีลโปรโมชั่นสุดคุ้ม (Top Best Deals)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    จัดอันดับรายการสินค้าที่มอบส่วนลดสูงสุด หรือราคาเฉลี่ยต่อหน่วยคุ้มค่าที่สุด
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  แสดง 10 จากทั้งหมด {filteredList.length} รายการ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80">
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3.5">ร้านค้า</th>
                      <th className="py-3 px-3.5">แบรนด์ / สินค้า</th>
                      <th className="py-3 px-3.5">บรรจุภัณฑ์</th>
                      <th className="py-3 px-3.5 text-right">ราคาปกติ</th>
                      <th className="py-3 px-3.5 text-right font-black text-slate-900">ราคาโปร</th>
                      <th className="py-3 px-3.5 text-right font-black text-rose-600">ส่วนลด</th>
                      <th className="py-3 px-3.5 text-right">เฉลี่ยต่อชิ้น</th>
                      <th className="py-3 px-3.5 text-center">รูปภาพ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sortedList.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                            {item.store}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 max-w-[240px]">
                          <span className="font-bold text-slate-900 block truncate">
                            {item.brand} - {item.itemName}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {item.machanic}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                          {item.color || '-'} {Number(item.packSize) > 1 ? `(แพ็ค ${item.packSize})` : ''}
                        </td>
                        <td className="py-3 px-3.5 text-right text-slate-400 line-through">
                          {item.retailPrice ? `${item.retailPrice}.-` : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-slate-900 text-sm">
                          {item.proPrice ? `${item.proPrice}.-` : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {item.discPercent > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200">
                              -{item.discPercent}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-emerald-700">
                          {item.unitPrice ? `${item.unitPrice} ฿` : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {item.imageUrl ? (
                            <a
                              href={item.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-semibold hover:underline"
                            >
                              <span>ดูรูป</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
