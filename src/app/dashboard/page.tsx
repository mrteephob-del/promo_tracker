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
  Download,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Tag,
  Coffee,
  UtensilsCrossed,
  Flame,
  Percent,
  Eye,
  X,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { PromoCategory } from '@/types';
import { calculateDiscount, calculatePricePerSachet } from '@/lib/calc';

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
  const [sortBy, setSortBy] = useState<'discountPercent' | 'proPrice' | 'unitPrice'>('discountPercent');

  // Modal ดูรูปภาพขยายใหญ่
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; store: string } | null>(null);

  // ดึงข้อมูล
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

  // แปลงและคำนวณข้อมูล
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

  // รายการหลังกรอง
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

  // การเรียงลำดับ
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (sortBy === 'discountPercent') return b.discPercent - a.discPercent;
      if (sortBy === 'proPrice') {
        const pA = parseFloat(a.proPrice) || 0;
        const pB = parseFloat(b.proPrice) || 0;
        return pA - pB;
      }
      if (sortBy === 'unitPrice') {
        const uA = a.unitPrice || 9999;
        const uB = b.unitPrice || 9999;
        return uA - uB;
      }
      return a.brand.localeCompare(b.brand);
    });
  }, [filteredList, sortBy]);

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
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#64748b'];

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

  // สัดส่วนประเภทโปรโมชั่น (Promotion Mechanics)
  const promoMechanics = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredList.forEach((r) => {
      let t = r.promotion || 'ลดราคา';
      if (t.includes('1 แถม 1')) t = 'ซื้อ 1 แถม 1';
      else if (t.includes('2 ชิ้น') || t.includes('ซื้อคู่') || t.includes('ซื้อ 2')) t = 'ซื้อคู่ / 2 ชิ้น';
      else if (t.includes('แลกซื้อ')) t = 'แลกซื้อราคาพิเศษ';
      else if (t.includes('ชิ้นที่สอง') || t.includes('ชิ้นที่ 2')) t = 'ชิ้นที่สองลด';
      else t = 'ลดราคาป้ายเหลือง';
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
      'ลิงก์รูปภาพ',
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
    link.setAttribute('download', `promo_intelligence_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 pb-20 font-sans">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Header Title & Actions */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Promotion Visual Dashboard</span>
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-full">
                    Live Data
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  วิเคราะห์สงครามราคา สัดส่วนการตลาดของแต่ละแบรนด์ และดีลสุดคุ้มประจำสัปดาห์
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredList.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Big Category Segmented Tabs */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-200/70 p-1.5 rounded-3xl">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedStore('all');
              setSelectedBrand('all');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>ทั้งหมด ({coffeeRows.length + noodleRows.length})</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('coffee');
              setSelectedStore('all');
              setSelectedBrand('all');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              selectedCategory === 'coffee'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>☕ กาแฟซอง ({coffeeRows.length})</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('noodle');
              setSelectedStore('all');
              setSelectedBrand('all');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              selectedCategory === 'noodle'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>🍜 บะหมี่ โจ๊ก ข้าวต้ม ({noodleRows.length})</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          {/* Store Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>เลือกร้านค้า</span>
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>เลือกแบรนด์</span>
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">ทุกแบรนด์ ({availableBrands.length} แบรนด์)</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-600" />
              <span>ค้นหาชื่อสินค้า / รสชาติ</span>
            </label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อสินค้า เช่น ต้มยำกุ้ง, ริช อโรมา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
              <span>เรียงลำดับ</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="discountPercent">🔥 ลดราคา % มากที่สุด</option>
              <option value="unitPrice">💡 ราคาเฉลี่ยต่อชิ้นถูกสุด</option>
              <option value="proPrice">💰 ราคาโปรโมชั่นต่ำสุด</option>
            </select>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Deals */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                จำนวนโปรโมชั่น
              </span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpis.total.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">ดีล</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span>ส่วนลดเฉลี่ยของตลาด:</span>
                <span className="font-bold text-emerald-600">{kpis.avgDisc}%</span>
              </p>
            </div>
          </div>

          {/* Card 2: Deepest Discount Deal */}
          <div className="bg-gradient-to-br from-rose-500 to-orange-500 text-white rounded-3xl p-5 shadow-lg shadow-rose-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-4 h-4" />
                <span>ดีลลดแรงที่สุด</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white text-[11px] font-black">
                {kpis.maxDisc?.store || '-'}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight">
                  {kpis.maxDisc ? `-${kpis.maxDisc.discPercent}%` : '-'}
                </span>
                {kpis.maxDisc?.discAmount ? (
                  <span className="text-xs font-bold text-white/90">
                    (ลด {kpis.maxDisc.discAmount} บาท)
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-white/90 truncate mt-1 font-medium">
                {kpis.maxDisc ? `${kpis.maxDisc.brand} - ${kpis.maxDisc.itemName}` : 'ไม่มีข้อมูล'}
              </p>
            </div>
          </div>

          {/* Card 3: Lowest Unit Price */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ราคาเฉลี่ยต่ำที่สุด
              </span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-700 tracking-tight">
                  {kpis.minUnit?.unitPrice ? `${kpis.minUnit.unitPrice}` : '-'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  บาท/{selectedCategory === 'coffee' ? 'ซอง' : 'หน่วย'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-1">
                {kpis.minUnit ? `${kpis.minUnit.brand} (${kpis.minUnit.store})` : 'ไม่มีข้อมูล'}
              </p>
            </div>
          </div>

          {/* Card 4: Top Promo Store */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ร้านที่จัดโปรมากสุด
              </span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-amber-700 tracking-tight">
                  {kpis.topStore}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ({kpis.topStoreCount} ดีล)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                สัดส่วน {((kpis.topStoreCount / (filteredList.length || 1)) * 100).toFixed(0)}% ของกลุ่มที่เลือก
              </p>
            </div>
          </div>
        </div>

        {/* VISUAL CHARTS SECTION (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Donut Chart - Brand Share of Voice */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-amber-600" />
                  <span>สัดส่วนแบรนด์ในตลาดโปรโมชั่น (Share of Voice)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  แบรนด์ที่มีรายการโปรโมชั่นหนาแน่นที่สุดในรอบนี้
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* SVG Donut */}
              <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                      className="transition-all duration-700 hover:opacity-80"
                    />
                  ))}
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs font-bold text-slate-400">รวม</span>
                  <span className="text-xl font-black text-slate-900 leading-tight">
                    {filteredList.length}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">รายการ</span>
                </div>
              </div>

              {/* Legend with Color Dots */}
              <div className="flex-1 w-full space-y-2">
                {brandData.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="font-bold text-slate-800">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{b.count} ดีล</span>
                      <span className="text-[11px] font-semibold text-slate-400 w-12 text-right">
                        ({b.percent}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Price War Benchmark (Average Price per Sachet/Unit) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
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
            <div className="space-y-3.5 py-1">
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

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-2">
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

            <div className="space-y-4">
              {storeComparison.map((s, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-900 text-sm">{s.store}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-black">
                        {s.count} รายการ
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[11px] font-black border border-rose-200">
                        ลดเฉลี่ย -{s.avgDisc}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full transition-all duration-700"
                      style={{ width: `${s.percentOfMax}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Promo Mechanics Breakdown */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>กลไกโปรโมชั่นที่ร้านค้าใช้บ่อย (Promotional Mechanics)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                สัดส่วนประเภทโปรโมชั่นที่พบในใบปลิวและป้ายราคา
              </p>

              {/* Segmented Color Bar */}
              <div className="w-full h-4 rounded-xl overflow-hidden flex shadow-xs mb-4">
                {promoMechanics.map((p, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${p.percent}%`, backgroundColor: p.color }}
                    title={`${p.label}: ${p.count} รายการ (${p.percent}%)`}
                    className="h-full hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>

              {/* Legend List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {promoMechanics.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-bold text-slate-700">{p.label}</span>
                    </div>
                    <span className="font-black text-slate-900">
                      {p.count} <span className="text-[10px] text-slate-400 font-normal">({p.percent}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 mt-4 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>โปรโมชั่นส่วนใหญ่ของร้านสะดวกซื้อเป็น <strong>ลดราคาป้ายเหลืองตรงๆ</strong> รองลงมาคือ <strong>ซื้อคู่ถูกกว่า</strong></span>
            </div>
          </div>
        </div>

        {/* 10 TOP BEST DEALS WITH IMAGE THUMBNAILS */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>10 ดีลโปรโมชั่นสุดคุ้ม (Top Best Deals)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                สินค้าที่มอบส่วนลดสูงสุดและราคาเฉลี่ยต่อหน่วยคุ้มค่าที่สุด พร้อมรูปถ่ายจากชั้นวาง
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              แสดง 10 จากทั้งหมด {filteredList.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-black border-b border-slate-200/80">
                  <th className="py-3 px-3.5 text-center w-12">#</th>
                  <th className="py-3 px-3.5">รูปภาพ</th>
                  <th className="py-3 px-3.5">ร้านค้า</th>
                  <th className="py-3 px-3.5">แบรนด์ / สินค้า</th>
                  <th className="py-3 px-3.5">บรรจุภัณฑ์</th>
                  <th className="py-3 px-3.5 text-right">ราคาปกติ</th>
                  <th className="py-3 px-3.5 text-right font-black text-slate-900">ราคาโปร</th>
                  <th className="py-3 px-3.5 text-right font-black text-rose-600">ส่วนลด</th>
                  <th className="py-3 px-3.5 text-right">เฉลี่ยต่อหน่วย</th>
                  <th className="py-3 px-3.5 text-center">ดูรูปจริง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedList.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 text-center font-black text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Thumbnail Image */}
                    <td className="py-3 px-3.5">
                      {item.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: item.imageUrl!, title: `${item.brand} - ${item.itemName}`, store: item.store })}
                          className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all shadow-2xs group relative"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.itemName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center text-[10px]">
                          ไม่มีรูป
                        </div>
                      )}
                    </td>

                    {/* Store Badge */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-200/80">
                        {item.store}
                      </span>
                    </td>

                    {/* Product Brand & Item */}
                    <td className="py-3 px-3.5 max-w-[260px]">
                      <span className="font-bold text-slate-900 block truncate text-[13px]">
                        {item.brand} - {item.itemName}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {item.machanic}
                      </span>
                    </td>

                    {/* Packaging */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-semibold">
                      {item.color || '-'} {Number(item.packSize) > 1 ? `(แพ็ค ${item.packSize})` : ''}
                    </td>

                    {/* Retail Price */}
                    <td className="py-3 px-3.5 text-right text-slate-400 line-through">
                      {item.retailPrice ? `${item.retailPrice}.-` : '-'}
                    </td>

                    {/* Pro Price */}
                    <td className="py-3 px-3.5 text-right font-black text-slate-900 text-sm">
                      {item.proPrice ? `${item.proPrice}.-` : '-'}
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      {item.discPercent > 0 ? (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-600 border border-rose-200/80">
                          -{item.discPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-3.5 text-right font-black text-emerald-700 whitespace-nowrap">
                      {item.unitPrice ? `${item.unitPrice} ฿` : '-'}
                    </td>

                    {/* View Link */}
                    <td className="py-3 px-3.5 text-center">
                      {item.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: item.imageUrl!, title: `${item.brand} - ${item.itemName}`, store: item.store })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูรูป</span>
                        </button>
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
      </main>

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

            <div className="flex-1 overflow-auto p-2 bg-slate-900 flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt="Promotion preview"
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>

            <div className="p-3 bg-slate-50 text-right border-t border-slate-100">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                <span>เปิดรูปใน Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
