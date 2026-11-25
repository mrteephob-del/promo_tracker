'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Swords,
  Crown,
  X,
  ZoomIn,
  ArrowLeftRight,
  TrendingDown,
  Tag,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Store,
  Layers,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import StoreLogo from '@/components/StoreLogo';
import { cleanCoreProductName } from '@/lib/calc';

interface CrossStoreMatchModalProps {
  item: any | null;
  rawList: any[];
  onClose: () => void;
  onPreviewImage?: (image: { url: string; title: string; store: string }) => void;
}

export default function CrossStoreMatchModal({
  item,
  rawList,
  onClose,
  onPreviewImage,
}: CrossStoreMatchModalProps) {
  const comparisonData = useMemo(() => {
    if (!item) return null;

    const brand = item.brand || '';
    const itemName = item.itemName || '';
    const coreName = cleanCoreProductName(brand, itemName);
    const category = item.subCategory || item.category || 'สินค้าทั่วไป';

    // ดึงเฉพาะคำสำคัญของรสชาติ/ชนิดสินค้าเพื่อค้นหาข้ามห้างอย่างแม่นยำ
    const normalizedCore = coreName.toLowerCase().replace(brand.toLowerCase(), '').trim();

    // ค้นหาสินค้าของแบรนด์เดียวกันใน rawList ของทุกห้าง โดยไม่จำกัดรสชาติ
    const matchedItems = rawList.filter((r) => {
      // 1. แบรนด์ต้องตรงกัน
      const rBrand = (r.brand || '').toLowerCase().trim();
      const bBrand = brand.toLowerCase().trim();
      if (!rBrand.includes(bBrand) && !bBrand.includes(rBrand)) return false;

      // 2. หมวดหมู่สินค้าต้องตรงกัน (เช่น กาแฟ หรือ บะหมี่)
      if (item.category && r.category && item.category !== r.category) return false;

      return true;
    });

    // จัดกลุ่มตาม 4 ห้างหลัก
    const storeMap: Record<string, any[]> = {
      'CJ More': [],
      'Mini BigC': [],
      'Lotus Go Fresh': [],
      'Tops': [],
    };

    matchedItems.forEach((m) => {
      let sKey = m.store || '';
      if (sKey.includes('Lotus')) sKey = 'Lotus Go Fresh';
      else if (sKey.toLowerCase().includes('top') || sKey.includes('ท็อป')) sKey = 'Tops';
      else if (sKey.includes('CJ') || sKey.includes('ซีเจ')) sKey = 'CJ More';
      else if (sKey.includes('BigC') || sKey.includes('Big C') || sKey.includes('บิ๊กซี')) sKey = 'Mini BigC';

      if (!storeMap[sKey]) storeMap[sKey] = [];
      storeMap[sKey].push(m);
    });

    // คำนวณดีลที่ดีที่สุด (ราคาต่อหน่วยถูกสุด) ของแต่ละห้าง
    const storeBestDeals: Record<string, any> = {};
    let minUnitPrice = Infinity;
    let cheapestStore = '';

    Object.entries(storeMap).forEach(([store, deals]) => {
      if (deals.length === 0) return;

      const sorted = [...deals].sort((a, b) => {
        const uA = (parseFloat(a.proPrice) || 0) / (parseInt(a.packSize) || 1);
        const uB = (parseFloat(b.proPrice) || 0) / (parseInt(b.packSize) || 1);
        return uA - uB;
      });

      const best = sorted[0];
      const p = parseFloat(best.proPrice) || 0;
      const s = parseInt(best.packSize) || 1;
      const unit = s > 0 ? p / s : p;

      storeBestDeals[store] = {
        ...best,
        unitPrice: Number(unit.toFixed(2)),
        dealCount: deals.length,
      };

      if (unit > 0 && unit < minUnitPrice) {
        minUnitPrice = unit;
        cheapestStore = store;
      }
    });

    const prices = Object.values(storeBestDeals)
      .map((d: any) => d.unitPrice)
      .filter((p) => p > 0);

    const maxUnitPrice = prices.length > 0 ? Math.max(...prices) : minUnitPrice;
    const savingAmount = Number((maxUnitPrice - minUnitPrice).toFixed(2));
    const savingPercent = maxUnitPrice > 0 ? Number(((savingAmount / maxUnitPrice) * 100).toFixed(1)) : 0;
    const comparedCount = Object.keys(storeBestDeals).length;

    return {
      coreName,
      brand,
      category,
      storeBestDeals,
      cheapestStore,
      minUnitPrice: minUnitPrice === Infinity ? 0 : minUnitPrice,
      maxUnitPrice,
      savingAmount,
      savingPercent,
      comparedCount,
      allStores: ['CJ More', 'Mini BigC', 'Lotus Go Fresh', 'Tops'],
    };
  }, [item, rawList]);

  // คัดเลือกห้างที่จะเทียบ 2 ฝั่ง (Side A vs Side B)
  const sortedStoreEntries = useMemo(() => {
    if (!comparisonData) return [];
    return Object.entries(comparisonData.storeBestDeals).sort(
      (a: any, b: any) => a[1].unitPrice - b[1].unitPrice
    );
  }, [comparisonData]);

  // กำหนดค่าเริ่มต้นของ 2 ฝั่ง
  const [selectedSideA, setSelectedSideA] = useState<string>('');
  const [selectedSideB, setSelectedSideB] = useState<string>('');

  useEffect(() => {
    if (sortedStoreEntries.length >= 2) {
      setSelectedSideA(sortedStoreEntries[0][0]);
      setSelectedSideB(sortedStoreEntries[1][0]);
    } else if (sortedStoreEntries.length === 1) {
      setSelectedSideA(sortedStoreEntries[0][0]);
      const other = ['CJ More', 'Mini BigC', 'Lotus Go Fresh', 'Tops'].find(
        (s) => s !== sortedStoreEntries[0][0]
      );
      setSelectedSideB(other || 'Mini BigC');
    } else {
      setSelectedSideA('CJ More');
      setSelectedSideB('Mini BigC');
    }
  }, [sortedStoreEntries]);

  if (!item || !comparisonData) return null;

  const dealA = comparisonData.storeBestDeals[selectedSideA];
  const dealB = comparisonData.storeBestDeals[selectedSideB];

  const priceA = dealA?.unitPrice || 0;
  const priceB = dealB?.unitPrice || 0;

  let winnerSide: 'A' | 'B' | 'TIE' | 'NONE' = 'NONE';
  let diff = 0;
  let diffPercent = 0;

  if (dealA && dealB) {
    if (priceA < priceB) {
      winnerSide = 'A';
      diff = Number((priceB - priceA).toFixed(2));
      diffPercent = priceB > 0 ? Number(((diff / priceB) * 100).toFixed(1)) : 0;
    } else if (priceB < priceA) {
      winnerSide = 'B';
      diff = Number((priceA - priceB).toFixed(2));
      diffPercent = priceA > 0 ? Number(((diff / priceA) * 100).toFixed(1)) : 0;
    } else {
      winnerSide = 'TIE';
    }
  }

  const handleSwap = () => {
    const temp = selectedSideA;
    setSelectedSideA(selectedSideB);
    setSelectedSideB(temp);
  };

  const getDriveThumb = (url?: string) => {
    if (!url) return '';
    if (url.includes('googleusercontent.com')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    return url;
  };

  const availableStores = Object.keys(comparisonData.storeBestDeals);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden max-w-5xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#071d3a] via-[#0f2b5c] to-[#0284c7] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
              <Swords className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider shadow-2xs">
                  ตารางเปรียบเทียบราคาแยก 2 ฝั่ง
                </span>
                <span className="text-xs text-sky-200 font-medium">
                  {comparisonData.category}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white truncate mt-0.5">
                {comparisonData.coreName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
          {/* WINNER VERDICT HERO BANNER */}
          {dealA && dealB ? (
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs ${
                winnerSide !== 'TIE'
                  ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      winnerSide !== 'TIE' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                    }`}
                  >
                    <Crown className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      ผลการเปรียบเทียบความคุ้มค่า (Price Verdict)
                    </span>
                    {winnerSide === 'A' ? (
                      <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                        ซื้อที่ <span className="text-emerald-700 underline decoration-emerald-400 decoration-2">{selectedSideA}</span> ถูกกว่า! ประหยัด <span className="text-emerald-600">฿{diff.toFixed(2)} / หน่วย (-{diffPercent}%)</span>
                      </h4>
                    ) : winnerSide === 'B' ? (
                      <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                        ซื้อที่ <span className="text-emerald-700 underline decoration-emerald-400 decoration-2">{selectedSideB}</span> ถูกกว่า! ประหยัด <span className="text-emerald-600">฿{diff.toFixed(2)} / หน่วย (-{diffPercent}%)</span>
                      </h4>
                    ) : (
                      <h4 className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                        ทั้ง 2 ห้างราคาเฉลี่ยต่อหน่วยเท่ากันพอดี (฿{priceA.toFixed(2)} / หน่วย)
                      </h4>
                    )}
                  </div>
                </div>

                {winnerSide !== 'TIE' && (
                  <div className="text-right bg-white p-2.5 sm:p-3 rounded-xl border border-emerald-200/80 shadow-2xs shrink-0">
                    <span className="text-[11px] text-slate-400 font-bold block">ส่วนต่างราคาต่อหน่วย</span>
                    <span className="text-lg font-black text-emerald-700">
                      -฿{diff.toFixed(2)} <span className="text-xs font-semibold text-slate-500">({diffPercent}%)</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-sky-900">
              <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
              <span>
                พบโปรโมชั่นใน <strong>{dealA ? selectedSideA : selectedSideB}</strong> ขณะนี้อีกฝั่งยังไม่มีโปรโมชั่นของสินค้ารุ่นนี้
              </span>
            </div>
          )}

          {/* SIDE-BY-SIDE CARDS WITH LARGE IMAGES (2 ฝั่ง ซ้าย - ขวา) */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-stretch">
            {/* ===================== SIDE A (ฝั่งซ้าย) ===================== */}
            <div
              className={`md:col-span-5 rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                winnerSide === 'A'
                  ? 'bg-white border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg'
                  : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div>
                {/* Store Header & Switcher */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                      A
                    </span>
                    <span className="font-bold text-xs text-slate-500">ห้างฝั่งซ้าย:</span>
                  </div>

                  {/* Store Select Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {['CJ More', 'Mini BigC', 'Lotus Go Fresh', 'Tops'].map((st) => {
                      const hasDeal = Boolean(comparisonData.storeBestDeals[st]);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedSideA(st)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            selectedSideA === st
                              ? 'bg-slate-900 text-white shadow-xs'
                              : hasDeal
                              ? 'text-slate-700 hover:bg-white'
                              : 'text-slate-300 hover:text-slate-400'
                          }`}
                        >
                          <StoreLogo store={st} className="w-3.5 h-3.5" />
                          <span>{st === 'Lotus Go Fresh' ? 'Lotus' : st === 'Mini BigC' ? 'BigC' : st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Store Brand Title */}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <StoreLogo store={selectedSideA} className="w-7 h-7 shadow-2xs" />
                    <span className="font-black text-base text-slate-900">{selectedSideA}</span>
                  </div>
                  {winnerSide === 'A' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      <span>ถูกกว่า</span>
                    </span>
                  )}
                </div>

                {/* LARGE PRODUCT IMAGE (รูปภาพใหญ่ ชัดเจน) */}
                <div className="mt-3">
                  {dealA?.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onPreviewImage) {
                          onPreviewImage({
                            url: dealA.imageUrl,
                            title: `${dealA.brand} - ${dealA.itemName}`,
                            store: selectedSideA,
                          });
                        }
                      }}
                      className="w-full h-52 sm:h-64 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer shadow-inner flex items-center justify-center p-2"
                      title="คลิกดูภาพขยายใหญ่เต็มหน้าจอ"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getDriveThumb(dealA.imageUrl)}
                        alt={dealA.itemName}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs backdrop-blur-2xs">
                        <ZoomIn className="w-5 h-5" />
                        <span>คลิกเพื่อดูรูปภาพขนาดใหญ่</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-52 sm:h-64 rounded-2xl bg-slate-100 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Store className="w-10 h-10 opacity-30" />
                      <span className="text-xs font-bold">ไม่มีรูปภาพโปรโมชั่นในห้างนี้</span>
                    </div>
                  )}
                </div>

                {/* Product Name & Brand */}
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {dealA?.brand || comparisonData.brand}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5 line-clamp-2">
                    {dealA?.itemName || comparisonData.coreName}
                  </h4>
                </div>
              </div>

              {/* Price Banner */}
              <div
                className={`mt-4 p-3.5 rounded-2xl border transition-all ${
                  winnerSide === 'A'
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-500">ราคาเฉลี่ยต่อหน่วย</span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-black ${
                        winnerSide === 'A' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      ฿{priceA > 0 ? priceA.toFixed(2) : '-'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/หน่วย</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 mt-2 border-t border-slate-200/70">
                  <span>ราคาป้ายโปร:</span>
                  <span className="font-black text-slate-800">
                    {dealA?.proPrice ? `฿${dealA.proPrice}` : '-'}
                    {dealA?.retailPrice && (
                      <span className="text-[11px] text-slate-400 line-through ml-1.5 font-normal">
                        ฿{dealA.retailPrice}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ===================== CENTER VS BADGE ===================== */}
            <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-center gap-3 my-2 md:my-0">
              <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-lg border-2 border-white">
                VS
              </div>
              <button
                type="button"
                onClick={handleSwap}
                className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition-all cursor-pointer hover:scale-110 active:scale-95"
                title="สลับฝั่งซ้ายและขวา"
              >
                <ArrowLeftRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* ===================== SIDE B (ฝั่งขวา) ===================== */}
            <div
              className={`md:col-span-5 rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                winnerSide === 'B'
                  ? 'bg-white border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg'
                  : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div>
                {/* Store Header & Switcher */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                      B
                    </span>
                    <span className="font-bold text-xs text-slate-500">ห้างฝั่งขวา:</span>
                  </div>

                  {/* Store Select Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {['CJ More', 'Mini BigC', 'Lotus Go Fresh', 'Tops'].map((st) => {
                      const hasDeal = Boolean(comparisonData.storeBestDeals[st]);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedSideB(st)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            selectedSideB === st
                              ? 'bg-slate-900 text-white shadow-xs'
                              : hasDeal
                              ? 'text-slate-700 hover:bg-white'
                              : 'text-slate-300 hover:text-slate-400'
                          }`}
                        >
                          <StoreLogo store={st} className="w-3.5 h-3.5" />
                          <span>{st === 'Lotus Go Fresh' ? 'Lotus' : st === 'Mini BigC' ? 'BigC' : st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Store Brand Title */}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <StoreLogo store={selectedSideB} className="w-7 h-7 shadow-2xs" />
                    <span className="font-black text-base text-slate-900">{selectedSideB}</span>
                  </div>
                  {winnerSide === 'B' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      <span>ถูกกว่า</span>
                    </span>
                  )}
                </div>

                {/* LARGE PRODUCT IMAGE (รูปภาพใหญ่ ชัดเจน) */}
                <div className="mt-3">
                  {dealB?.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onPreviewImage) {
                          onPreviewImage({
                            url: dealB.imageUrl,
                            title: `${dealB.brand} - ${dealB.itemName}`,
                            store: selectedSideB,
                          });
                        }
                      }}
                      className="w-full h-52 sm:h-64 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer shadow-inner flex items-center justify-center p-2"
                      title="คลิกดูภาพขยายใหญ่เต็มหน้าจอ"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getDriveThumb(dealB.imageUrl)}
                        alt={dealB.itemName}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs backdrop-blur-2xs">
                        <ZoomIn className="w-5 h-5" />
                        <span>คลิกเพื่อดูรูปภาพขนาดใหญ่</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-52 sm:h-64 rounded-2xl bg-slate-100 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Store className="w-10 h-10 opacity-30" />
                      <span className="text-xs font-bold">ไม่มีรูปภาพโปรโมชั่นในห้างนี้</span>
                    </div>
                  )}
                </div>

                {/* Product Name & Brand */}
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {dealB?.brand || comparisonData.brand}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5 line-clamp-2">
                    {dealB?.itemName || comparisonData.coreName}
                  </h4>
                </div>
              </div>

              {/* Price Banner */}
              <div
                className={`mt-4 p-3.5 rounded-2xl border transition-all ${
                  winnerSide === 'B'
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-500">ราคาเฉลี่ยต่อหน่วย</span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-black ${
                        winnerSide === 'B' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      ฿{priceB > 0 ? priceB.toFixed(2) : '-'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/หน่วย</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 mt-2 border-t border-slate-200/70">
                  <span>ราคาป้ายโปร:</span>
                  <span className="font-black text-slate-800">
                    {dealB?.proPrice ? `฿${dealB.proPrice}` : '-'}
                    {dealB?.retailPrice && (
                      <span className="text-[11px] text-slate-400 line-through ml-1.5 font-normal">
                        ฿{dealB.retailPrice}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== ตารางเปรียบเทียบแยก 2 ฝั่งอย่างชัดเจน ===================== */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>ตารางเปรียบเทียบสเปกและราคาแยก 2 ฝั่ง (Side-by-Side Comparison Table)</span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {selectedSideA} vs {selectedSideB}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <th className="py-3 px-4 w-1/3">หัวข้อเปรียบเทียบ</th>
                    <th
                      className={`py-3 px-4 w-1/3 ${
                        winnerSide === 'A' ? 'bg-emerald-50/70 text-emerald-950 font-black' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <StoreLogo store={selectedSideA} className="w-4 h-4" />
                        <span>{selectedSideA} (ฝั่งซ้าย)</span>
                      </div>
                    </th>
                    <th
                      className={`py-3 px-4 w-1/3 ${
                        winnerSide === 'B' ? 'bg-emerald-50/70 text-emerald-950 font-black' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <StoreLogo store={selectedSideB} className="w-4 h-4" />
                        <span>{selectedSideB} (ฝั่งขวา)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Row 1: Unit Price */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      ราคาเฉลี่ยต่อหน่วย (Unit Price)
                    </td>
                    <td
                      className={`py-3.5 px-4 font-black text-sm ${
                        winnerSide === 'A'
                          ? 'bg-emerald-50/50 text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {priceA > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span>฿{priceA.toFixed(2)}</span>
                          {winnerSide === 'A' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              👑 ถูกกว่า ฿{diff.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-4 font-black text-sm ${
                        winnerSide === 'B'
                          ? 'bg-emerald-50/50 text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {priceB > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span>฿{priceB.toFixed(2)}</span>
                          {winnerSide === 'B' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              👑 ถูกกว่า ฿{diff.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                  </tr>

                  {/* Row 2: Promo Price */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-bold">ราคาโปรโมชั่นตามป้าย</td>
                    <td className={`py-3 px-4 font-black text-slate-900 ${winnerSide === 'A' ? 'bg-emerald-50/30' : ''}`}>
                      {dealA?.proPrice ? `฿${dealA.proPrice}` : '-'}
                    </td>
                    <td className={`py-3 px-4 font-black text-slate-900 ${winnerSide === 'B' ? 'bg-emerald-50/30' : ''}`}>
                      {dealB?.proPrice ? `฿${dealB.proPrice}` : '-'}
                    </td>
                  </tr>

                  {/* Row 3: Regular Price */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600">ราคาปกติก่อนลด</td>
                    <td className={`py-3 px-4 text-slate-600 ${winnerSide === 'A' ? 'bg-emerald-50/30' : ''}`}>
                      {dealA?.retailPrice ? `฿${dealA.retailPrice}` : 'ไม่ระบุ'}
                    </td>
                    <td className={`py-3 px-4 text-slate-600 ${winnerSide === 'B' ? 'bg-emerald-50/30' : ''}`}>
                      {dealB?.retailPrice ? `฿${dealB.retailPrice}` : 'ไม่ระบุ'}
                    </td>
                  </tr>

                  {/* Row 4: Pack Size */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-bold">ขนาดบรรจุ / แพ็ค</td>
                    <td className={`py-3 px-4 font-black text-slate-800 ${winnerSide === 'A' ? 'bg-emerald-50/30' : ''}`}>
                      {dealA?.packSize ? `${dealA.packSize} ชิ้น/ซอง` : '-'}
                    </td>
                    <td className={`py-3 px-4 font-black text-slate-800 ${winnerSide === 'B' ? 'bg-emerald-50/30' : ''}`}>
                      {dealB?.packSize ? `${dealB.packSize} ชิ้น/ซอง` : '-'}
                    </td>
                  </tr>

                  {/* Row 5: Promotion Mechanic */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600">กลไกโปรโมชั่น (Mechanic)</td>
                    <td className={`py-3 px-4 ${winnerSide === 'A' ? 'bg-emerald-50/30' : ''}`}>
                      {dealA?.machanic ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60 font-bold">
                          {dealA.machanic}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 ${winnerSide === 'B' ? 'bg-emerald-50/30' : ''}`}>
                      {dealB?.machanic ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60 font-bold">
                          {dealB.machanic}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>

                  {/* Row 6: Promotion Period */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600">ระยะเวลาโปรโมชั่น</td>
                    <td className={`py-3 px-4 text-slate-700 font-medium ${winnerSide === 'A' ? 'bg-emerald-50/30' : ''}`}>
                      {dealA?.period || '-'}
                    </td>
                    <td className={`py-3 px-4 text-slate-700 font-medium ${winnerSide === 'B' ? 'bg-emerald-50/30' : ''}`}>
                      {dealB?.period || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ระบบวิเคราะห์ราคาต่อหน่วยเพื่อความยุติธรรมในการเปรียบเทียบข้ามห้าง</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
