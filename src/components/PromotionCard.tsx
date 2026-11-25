'use client';

import React from 'react';
import {
  Trash2,
  AlertTriangle,
  ZoomIn,
  TrendingDown,
  Info,
  DollarSign,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  PromotionItem,
  TRACKED_BRANDS,
  COMMON_NOODLE_BRANDS,
  NOODLE_PACKAGE_TYPES,
  TRACKED_STORES,
  TRACKED_CHANNELS,
  PROMO_COLORS,
  PROMOTION_TYPES,
} from '@/types';
import {
  calculateDiscount,
  calculatePricePerSachet,
  isTrackedBrand,
} from '@/lib/calc';

interface PromotionCardProps {
  item: PromotionItem;
  index: number;
  total: number;
  onUpdate: (updatedItem: PromotionItem) => void;
  onDelete: (id: string) => void;
  onViewImage: (url: string) => void;
}

export default function PromotionCard({
  item,
  index,
  total,
  onUpdate,
  onDelete,
  onViewImage,
}: PromotionCardProps) {
  // คำนวณส่วนลดและราคาต่อซองแบบ Real-time
  const discount = calculateDiscount(item.retailPrice, item.proPrice);
  const unitRetail = calculatePricePerSachet(item.retailPrice, item.packSize);
  const unitPro = calculatePricePerSachet(item.proPrice, item.packSize);

  const isCoffee = item.category !== 'noodle';
  const isLowConfidence = item.confidence < 0.7;
  const isUntracked = isCoffee && !isTrackedBrand(item.brand);

  const handleSwitchCategory = (newCat: 'coffee' | 'noodle') => {
    if (item.category === newCat) return;
    const isNowCoffee = newCat === 'coffee';
    const updated: PromotionItem = {
      ...item,
      category: newCat,
      isUntrackedBrand: isNowCoffee ? !isTrackedBrand(item.brand) : false,
      color: isNowCoffee ? 'แดง' : 'ซอง',
      packSize: isNowCoffee ? (item.packSize === 1 ? 40 : item.packSize) : (item.packSize === 40 ? 1 : item.packSize),
      subCategory: isNowCoffee ? 'กาแฟซอง' : (item.subCategory === 'กาแฟซอง' ? 'บะหมี่กึ่งสำเร็จรูป' : (item.subCategory || 'บะหมี่กึ่งสำเร็จรูป')),
    };
    onUpdate(updated);
  };

  const handleChange = (field: keyof PromotionItem, value: any) => {
    const updated = { ...item, [field]: value };
    // ตรวจสอบแบรนด์ใหม่กรณีผู้ใช้แก้ไข
    if (field === 'brand' && isCoffee) {
      updated.isUntrackedBrand = !isTrackedBrand(value);
    }
    onUpdate(updated);
  };

  // สไตล์สำหรับฟิลด์ที่ต้องการเน้นสีเหลือง (ความมั่นใจต่ำหรือว่าง)
  const getFieldClass = (val: any) => {
    const isEmpty = val === null || val === undefined || val === '';
    if (isEmpty || isLowConfidence) {
      return 'bg-amber-50/70 border-amber-300 text-slate-800 focus:ring-amber-500 focus:bg-white';
    }
    return 'bg-white border-slate-200 text-slate-800 focus:ring-amber-500';
  };

  return (
    <div
      className={`rounded-3xl border transition-all shadow-md ${
        item.selected
          ? 'border-blue-300 bg-white ring-1 ring-sky-300/60'
          : 'border-slate-200 bg-slate-50/60 opacity-80'
      }`}
    >
      {/* Card Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        {/* Selection Checkbox & Index */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(e) => handleChange('selected', e.target.checked)}
            className="w-5 h-5 text-sky-600 rounded-lg border-slate-300 focus:ring-sky-500 cursor-pointer"
            id={`select-${item.id}`}
          />
          <label
            htmlFor={`select-${item.id}`}
            className="font-black text-sm sm:text-base text-[#0f2b5c] cursor-pointer flex items-center gap-2"
          >
            <span>รายการที่ {index + 1} จาก {total}</span>
            {item.confidence < 0.7 && (
              <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-700" />
                ความมั่นใจ {(item.confidence * 100).toFixed(0)}%
              </span>
            )}
          </label>

          {/* Category Pill Switcher (บันทึกลงชีต PRT หรือ NOODLE) */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSwitchCategory('coffee')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isCoffee
                  ? 'bg-[#0f2b5c] text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
              }`}
              title="บันทึกข้อมูลนี้ลงชีต PRT (กาแฟซอง)"
            >
              <span>☕ กาแฟ</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                isCoffee ? 'bg-sky-500/30 text-sky-200' : 'bg-slate-200 text-slate-600'
              }`}>PRT</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchCategory('noodle')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isCoffee
                  ? 'bg-[#0f2b5c] text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
              }`}
              title="บันทึกข้อมูลนี้ลงชีต NOODLE (บะหมี่/โจ๊ก/อื่นๆ)"
            >
              <span>🍜 บะหมี่/อาหาร</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                !isCoffee ? 'bg-sky-500/30 text-sky-200' : 'bg-slate-200 text-slate-600'
              }`}>NOODLE</span>
            </button>
          </div>
        </div>

        {/* Thumbnail and Delete button */}
        <div className="flex items-center gap-2">
          {(item.imagePreviewUrl || item.imageUrl) && (
            <button
              type="button"
              onClick={() => onViewImage((item.imagePreviewUrl || item.imageUrl)!)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl transition-colors cursor-pointer"
              title="ดูรูปภาพต้นฉบับ"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดูรูป</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="ลบรายการนี้"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Warnings & Alerts */}
      <div className="px-3.5 sm:px-4 pt-3 space-y-2">
        {/* Untracked Brand Alert */}
        {isUntracked && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">แบรนด์นี้ไม่อยู่ใน 4 แบรนด์ที่ติดตาม:</span>{' '}
              แบรนด์ &quot;{item.brand || 'ไม่ระบุ'}&quot; ไม่ใช่ เนสกาแฟ, มอคโคน่า, เบอร์ดี้ หรือ ซุปเปอร์ (ระบบยกเลิกการเลือกเป็นค่าเริ่มต้น)
            </div>
          </div>
        )}

        {/* Duplicate Alert */}
        {item.isDuplicate && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">⚠️ ตรวจพบข้อมูลอาจซ้ำ:</span>{' '}
              {item.duplicateReason || 'มีโปรโมชั่นของ ร้าน + แบรนด์ + สี + ช่วงเวลา + ราคาโปร นี้ในชีตแล้ว'}
            </div>
          </div>
        )}

        {/* AI Notes */}
        {item.notes && (
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-blue-800 text-xs">
            <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>{item.notes}</span>
          </div>
        )}
      </div>

      {/* Calculated Badges (Helper for checking) */}
      <div className="px-3.5 sm:px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 text-xs">
          {/* Discount amount */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ส่วนลด</span>
              <span className="font-bold text-emerald-600">
                {discount.amount !== null ? `${discount.amount.toFixed(2)} บ.` : '-'}
                {discount.percent !== null && ` (${discount.percent}%)`}
              </span>
            </div>
          </div>

          {/* Unit price normal */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ราคา/ซอง (ปกติ)</span>
              <span className="font-medium text-slate-700">
                {unitRetail !== null ? `${unitRetail.toFixed(2)} บ.` : '-'}
              </span>
            </div>
          </div>

          {/* Unit price promo */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 text-sky-800 rounded-lg border border-sky-200">
              <Package className="w-4 h-4 text-sky-700" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-medium">ราคา/หน่วย (โปร)</span>
              <span className="font-black text-sky-800">
                {unitPro !== null ? `${unitPro.toFixed(2)} บ.` : '-'}
              </span>
            </div>
          </div>

          {/* Freq/Month */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-[#0f2b5c] rounded-lg border border-blue-200">
              <Layers className="w-4 h-4 text-blue-800" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-medium">ความถี่ในรอบเดือน</span>
              <span className="font-black text-[#0f2b5c]">
                ครั้งที่ {item.freqMonth || item.freqWeek || 1} ของเดือน
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="p-3.5 sm:p-4 pt-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
        {/* Brand */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            แบรนด์ <span className="text-rose-500">*</span>
          </label>
          <select
            value={item.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            className={`w-full rounded-xl px-3 py-2 border text-sm font-medium focus:outline-none focus:ring-2 ${getFieldClass(
              item.brand
            )}`}
          >
            {(isCoffee ? TRACKED_BRANDS : COMMON_NOODLE_BRANDS).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            {item.brand &&
              !(isCoffee ? (TRACKED_BRANDS as readonly string[]) : (COMMON_NOODLE_BRANDS as readonly string[])).includes(
                item.brand
              ) && <option value={item.brand}>{item.brand}</option>}
          </select>
        </div>

        {/* Store */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ร้านค้า <span className="text-rose-500">*</span>
          </label>
          <select
            value={item.store}
            onChange={(e) => handleChange('store', e.target.value)}
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.store
            )}`}
          >
            {TRACKED_STORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {!(TRACKED_STORES as readonly string[]).includes(item.store) && item.store && (
              <option value={item.store}>{item.store}</option>
            )}
          </select>
        </div>

        {/* Color / Package Type */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            {isCoffee ? 'สีซอง' : 'บรรจุภัณฑ์'} <span className="text-rose-500">*</span>
          </label>
          <select
            value={item.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.color
            )}`}
          >
            {isCoffee ? (
              <>
                <option value="แดง">แดง</option>
                <option value="เขียว">เขียว</option>
                <option value="แดง,เขียว">แดง,เขียว</option>
              </>
            ) : (
              <>
                <option value="ซอง">ซอง</option>
                <option value="ถ้วย/คัพ">ถ้วย/คัพ</option>
                <option value="ชาม">ชาม</option>
                <option value="แพ็ค">แพ็ค</option>
              </>
            )}
          </select>
        </div>

        {/* Sub-Category (For Noodle/Congee/Porridge/Mashed Potato) */}
        {!isCoffee && (
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              หมวดหมู่อาหาร <span className="text-orange-500">*</span>
            </label>
            <select
              value={item.subCategory || 'บะหมี่กึ่งสำเร็จรูป'}
              onChange={(e) => handleChange('subCategory', e.target.value)}
              className="w-full rounded-xl px-3 py-2 border text-sm font-bold bg-orange-50/60 text-orange-950 border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="บะหมี่กึ่งสำเร็จรูป">🍜 บะหมี่กึ่งสำเร็จรูป</option>
              <option value="โจ๊ก">🥣 โจ๊ก</option>
              <option value="ข้าวต้ม">🍲 ข้าวต้ม</option>
              <option value="มันบด">🥔 มันบด</option>
            </select>
          </div>
        )}

        {/* Promotion Type */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ประเภทโปรโมชั่น
          </label>
          <select
            value={item.promotion}
            onChange={(e) => handleChange('promotion', e.target.value)}
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.promotion
            )}`}
          >
            {PROMOTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Item Name (Span 2 cols on tablet/desktop) */}
        <div className="sm:col-span-2">
          <label className="block text-slate-600 font-semibold mb-1">
            ชื่อสินค้าเต็มตามรูป <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={item.itemName}
            onChange={(e) => handleChange('itemName', e.target.value)}
            placeholder="เช่น เนสกาแฟ เบลนด์ แอนด์ บรู กาแฟปรุงสำเร็จ"
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.itemName
            )}`}
          />
        </div>

        {/* Pack Size & Bonus Sachets */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ขนาดแพ็ค (ซอง) / ซองแถม
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={item.packSize ?? ''}
              onChange={(e) =>
                handleChange(
                  'packSize',
                  e.target.value === '' ? null : parseInt(e.target.value, 10)
                )
              }
              placeholder="40"
              className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
                item.packSize
              )}`}
            />
            <span className="text-slate-400 font-bold">+</span>
            <input
              type="number"
              value={item.bonusSachets ?? ''}
              onChange={(e) =>
                handleChange(
                  'bonusSachets',
                  e.target.value === '' ? null : parseInt(e.target.value, 10)
                )
              }
              placeholder="2"
              className="w-16 rounded-xl px-2 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
            />
          </div>
        </div>

        {/* Period */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ช่วงโปร (dd/mm/yyyy - dd/mm/yyyy)
          </label>
          <input
            type="text"
            value={item.period}
            onChange={(e) => handleChange('period', e.target.value)}
            placeholder="06/11/2026 - 08/11/2026"
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.period
            )}`}
          />
        </div>

        {/* Retail Price */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ราคาปกติ (บาท)
          </label>
          <input
            type="number"
            step="0.01"
            value={item.retailPrice ?? ''}
            onChange={(e) =>
              handleChange(
                'retailPrice',
                e.target.value === '' ? null : parseFloat(e.target.value)
              )
            }
            placeholder="176.00"
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.retailPrice
            )}`}
          />
        </div>

        {/* Pro Price */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ราคาโปร (บาท) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={item.proPrice ?? ''}
            onChange={(e) =>
              handleChange(
                'proPrice',
                e.target.value === '' ? null : parseFloat(e.target.value)
              )
            }
            placeholder="155.00"
            className={`w-full rounded-xl px-3 py-2 border text-sm font-semibold focus:outline-none focus:ring-2 ${getFieldClass(
              item.proPrice
            )}`}
          />
        </div>

        {/* Channel */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            ช่องทาง
          </label>
          <select
            value={item.channel}
            onChange={(e) => handleChange('channel', e.target.value)}
            className="w-full rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            {TRACKED_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Date Recorded */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            วันที่บันทึก (dd/mm/yyyy)
          </label>
          <input
            type="text"
            value={item.date}
            onChange={(e) => handleChange('date', e.target.value)}
            placeholder="09/11/2026"
            className="w-full rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          />
        </div>

        {/* Mechanic (Full width) */}
        <div className="sm:col-span-2 md:col-span-4">
          <label className="block text-slate-600 font-semibold mb-1">
            รายละเอียดกลไกโปรโมชั่น (Machanic) <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={item.machanic}
            onChange={(e) => handleChange('machanic', e.target.value)}
            placeholder="เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา 40+2 ซอง ปกติ 176 บาท 155/แพ็ค ประหยัด 21 บาท ซื้อ 2 แพ็ค ฟรี 1 ซอง"
            className={`w-full rounded-xl px-3 py-2 border text-sm focus:outline-none focus:ring-2 ${getFieldClass(
              item.machanic
            )}`}
          />
        </div>
      </div>
    </div>
  );
}

