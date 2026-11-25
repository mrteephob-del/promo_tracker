'use client';

import React, { useMemo } from 'react';
import {
  Swords,
  Crown,
  X,
  ZoomIn,
  TrendingDown,
  Tag,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Store,
  Layers,
} from 'lucide-react';
import StoreLogo from '@/components/StoreLogo';
import { cleanCoreProductName } from '@/lib/calc';

interface CrossStoreMatchModalProps {
  item: any | null;
  rawList: any[];
  onClose: () => void;
  onSendToArena?: (storeA: string, itemAId: string, storeB: string, itemBId: string) => void;
  onPreviewImage?: (image: { url: string; title: string; store: string }) => void;
}

export default function CrossStoreMatchModal({
  item,
  rawList,
  onClose,
  onSendToArena,
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

    // ค้นหาสินค้าที่ตรงกันหรือใกล้เคียงกันที่สุดใน rawList
    const matchedItems = rawList.filter((r) => {
      // 1. แบรนด์ต้องตรงกัน
      const rBrand = (r.brand || '').toLowerCase();
      const bBrand = brand.toLowerCase();
      if (!rBrand.includes(bBrand) && !bBrand.includes(rBrand)) return false;

      // 2. หมวดหมู่ย่อยควรสอดคล้องกัน (เช่น กาแฟเหมือนกัน หรือ บะหมี่เหมือนกัน)
      if (item.category && r.category && item.category !== r.category) return false;

      // 3. ชื่อหลักตรงกัน หรือมีคำสำคัญของสินค้า
      const rCore = cleanCoreProductName(r.brand, r.itemName).toLowerCase();
      if (rCore === coreName.toLowerCase()) return true;

      // เช็กคีย์เวิร์ดรสชาติเด่น (เช่น ต้มยำกุ้ง, ริชอโรมา, เอสเปรสโซ, หมูสับ, เป็ดพะโล้)
      if (normalizedCore.length >= 3) {
        const rName = (r.itemName || '').toLowerCase();
        if (rName.includes(normalizedCore) || normalizedCore.includes(rName)) return true;
      }

      return false;
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

  if (!item || !comparisonData) return null;

  // จัดอันดับห้างเพื่อส่งเข้าสนามประลอง (อันดับ 1 vs อันดับ 2)
  const sortedStoreEntries = Object.entries(comparisonData.storeBestDeals).sort(
    (a: any, b: any) => a[1].unitPrice - b[1].unitPrice
  );
  const storeAEntry = sortedStoreEntries[0];
  const storeBEntry = sortedStoreEntries[1];

  const handleSendToArena = () => {
    if (onSendToArena && storeAEntry && storeBEntry) {
      onSendToArena(
        storeAEntry[0],
        storeAEntry[1].id || '',
        storeBEntry[0],
        storeBEntry[1].id || ''
      );
      onClose();
    }
  };

  const getDriveThumb = (url?: string) => {
    if (!url) return '';
    if (url.includes('googleusercontent.com')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
    }
    return url;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0f2b5c] via-[#163a75] to-[#0f2b5c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-sky-200 uppercase tracking-wider">
                  Cross-Store Radar
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {comparisonData.category}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
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

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Winner Banner / Summary */}
          {comparisonData.comparedCount >= 2 ? (
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Crown className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800">
                      แชมป์ราคาถูกที่สุดรอบนี้
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                      {comparisonData.cheapestStore}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                    เฉลี่ยเพียง <span className="text-emerald-700">฿{comparisonData.minUnitPrice.toFixed(2)}</span> / หน่วย
                  </p>
                </div>
              </div>

              {comparisonData.savingAmount > 0 && (
                <div className="sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-emerald-200/60">
                  <span className="text-xs text-slate-500 font-semibold block">
                    ประหยัดได้สูงสุด
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-700">
                    ฿{comparisonData.savingAmount.toFixed(2)} / หน่วย ({comparisonData.savingPercent}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-sky-900">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                พบโปรโมชั่นใน <strong>{item.store}</strong> ขณะนี้ยังไม่มีห้างอื่นจัดโปรโมชั่นสินค้ารุ่นนี้ชนกันโดยตรงในรอบปัจจุบัน
              </span>
            </div>
          )}

          {/* 4 Stores Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {comparisonData.allStores.map((st) => {
              const deal = comparisonData.storeBestDeals[st];
              const isWinner = deal && st === comparisonData.cheapestStore && comparisonData.comparedCount >= 2;

              if (deal) {
                const imgThumb = getDriveThumb(deal.imageUrl);
                return (
                  <div
                    key={st}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between relative ${
                      isWinner
                        ? 'bg-gradient-to-b from-emerald-50/80 to-white border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
                        : 'bg-white hover:bg-slate-50/50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    {isWinner && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-300" />
                        <span>ถูกที่สุด</span>
                      </span>
                    )}

                    <div className="space-y-3">
                      {/* Store Header */}
                      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 truncate">
                          <StoreLogo store={st} className="w-7 h-7 shrink-0 shadow-2xs" />
                          <span className="font-black text-xs text-slate-800 truncate">{st}</span>
                        </div>
                        {deal.dealCount > 1 && (
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">
                            {deal.dealCount} ดีล
                          </span>
                        )}
                      </div>

                      {/* Product Thumbnail + Name */}
                      <div className="flex items-center gap-2.5">
                        {imgThumb ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onPreviewImage && deal.imageUrl) {
                                onPreviewImage({
                                  url: deal.imageUrl,
                                  title: `${deal.brand} - ${deal.itemName}`,
                                  store: st,
                                });
                              }
                            }}
                            className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 group relative hover:ring-2 hover:ring-sky-500 cursor-pointer shadow-2xs"
                            title="คลิกดูภาพขยาย"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgThumb}
                              alt={deal.itemName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                            <Tag className="w-5 h-5 opacity-40" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 font-bold block truncate">
                            {deal.brand}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                            {deal.itemName}
                          </h4>
                        </div>
                      </div>

                      {/* Prices */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-500 font-bold">ราคาป้าย</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-black text-slate-900">
                              ฿{deal.proPrice}
                            </span>
                            {deal.retailPrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ฿{deal.retailPrice}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] font-black text-slate-600">เฉลี่ย/หน่วย</span>
                          <span className={`text-sm font-black ${
                            isWinner ? 'text-emerald-700 font-black' : 'text-slate-800'
                          }`}>
                            ฿{deal.unitPrice.toFixed(2)}
                            <span className="text-[10px] text-slate-500 font-normal ml-0.5">
                              /{item.category === 'coffee' ? 'ซอง' : 'หน่วย'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Details & Specs */}
                      <div className="text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>ขนาดแพ็ค:</span>
                          <span className="font-bold text-slate-700">{deal.packSize} ชิ้น/ซอง</span>
                        </div>
                        {deal.period && (
                          <div className="flex items-center justify-between truncate">
                            <span>ระยะเวลา:</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[120px]" title={deal.period}>
                              {deal.period}
                            </span>
                          </div>
                        )}
                        {deal.machanic && (
                          <div className="pt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60 text-[10px] font-bold line-clamp-1">
                              {deal.machanic}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // No deal for this store
              return (
                <div
                  key={st}
                  className="rounded-2xl p-4 border border-dashed border-slate-200 bg-slate-50/50 flex flex-col justify-between text-center min-h-[200px]"
                >
                  <div className="flex items-center gap-2 justify-center pb-2 border-b border-slate-200/60">
                    <StoreLogo store={st} className="w-6 h-6 shrink-0 opacity-60" />
                    <span className="font-bold text-xs text-slate-500">{st}</span>
                  </div>

                  <div className="py-8 space-y-1 text-slate-400">
                    <Store className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-xs font-bold text-slate-500">ไม่มีโปรโมชั่น</p>
                    <p className="text-[10px] text-slate-400">
                      ไม่พบดีลสินค้ารุ่นนี้ในรอบปัจจุบัน
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/40 font-medium">
                    รอบโปรโมชั่นถัดไปอาจมีรายการ
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            💡 ระบบจับคู่สินค้าด้วย AI โดยเปรียบเทียบจากชื่อแบรนด์ รุ่นสินค้า และราคาต่อหน่วยสุทธิ
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
            {comparisonData.comparedCount >= 2 && onSendToArena && storeAEntry && storeBEntry && (
              <button
                type="button"
                onClick={handleSendToArena}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
              >
                <Swords className="w-4 h-4 text-amber-400" />
                <span>ส่ง {storeAEntry[0]} vs {storeBEntry[0]} เข้าสนามประลอง</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
