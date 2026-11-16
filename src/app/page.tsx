'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import ImageUploader from '@/components/ImageUploader';
import PromotionCard from '@/components/PromotionCard';
import ImageModal from '@/components/ImageModal';
import SuccessModal from '@/components/SuccessModal';
import { PromotionItem, SheetRowData, PromoCategory, CATEGORIES } from '@/types';
import { CompressedImageResult } from '@/lib/image';
import { getBangkokTodayDMY, formatPrice } from '@/lib/calc';
import { checkDuplicatesClient, saveRowsClient } from '@/lib/client-api';
import {
  ArrowLeft,
  Plus,
  Save,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCheck,
  Info,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [items, setItems] = useState<PromotionItem[]>([]);
  const [compressedImages, setCompressedImages] = useState<CompressedImageResult[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'coffee' | 'noodle'>('all');

  // Image Modal State
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Save & Status State
  const [saving, setSaving] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [saveSuccessData, setSaveSuccessData] = useState<{
    rowsAdded: number;
    sheetName?: string;
    spreadsheetUrl?: string;
    imageUrls?: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // เมื่อ Gemini สกัดข้อมูลเสร็จ
  const handleExtracted = (extractedItems: PromotionItem[], images: CompressedImageResult[]) => {
    setItems(extractedItems);
    setCompressedImages(images);
    setStep('review');
    // ตรวจสอบความซ้ำซ้อนและ Freq/Week กับ Google Sheet ทันที
    checkDuplicates(extractedItems);
  };

  // กรณีเลือกกรอกข้อมูลเอง
  const handleManualEntry = (store: string, channel: string, date: string) => {
    const newItem: PromotionItem = {
      id: `manual-${Date.now()}`,
      category: 'noodle',
      selected: true,
      date: date || getBangkokTodayDMY(),
      store: store || '7-11',
      brand: 'มาม่า',
      itemName: '',
      color: 'ซอง',
      packSize: 1,
      bonusSachets: 0,
      promotion: 'ลดราคา',
      channel: channel || 'หน้าร้าน',
      freqWeek: 1,
      freqMonth: 1,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
      period: '',
      machanic: '',
      retailPrice: null,
      proPrice: null,
      confidence: 1.0,
      notes: 'เพิ่มด้วยตนเอง',
    };
    setItems([newItem]);
    setStep('review');
  };

  // ตรวจสอบข้อมูลซ้ำกับ Google Sheet ผ่าน checkDuplicatesClient
  const checkDuplicates = async (currentItems: PromotionItem[]) => {
    if (currentItems.length === 0) return;
    setCheckingDuplicates(true);
    setErrorMessage(null);

    try {
      const sheetRows = currentItems.map((item) => ({
        date: item.date,
        store: item.store,
        brand: item.brand,
        itemName: item.itemName,
        color: item.color,
        packSize: item.packSize,
        promotion: item.promotion,
        channel: item.channel,
        freqWeek: item.freqWeek,
        freqMonth: item.freqMonth || item.freqWeek,
        subCategory: item.subCategory,
        period: item.period,
        machanic: item.machanic,
        retailPrice: item.retailPrice,
        proPrice: item.proPrice,
        category: item.category,
      }));

      const data = await checkDuplicatesClient(sheetRows);
      if (data && data.ok && Array.isArray(data.results)) {
        setItems((prev) =>
          prev.map((item, idx) => {
            const checkRes = data.results[idx];
            if (!checkRes) return item;
            return {
              ...item,
              freqWeek: checkRes.freqWeek || item.freqWeek,
              freqMonth: checkRes.freqMonth || checkRes.freqWeek || item.freqMonth || 1,
              isDuplicate: checkRes.isDuplicate,
              duplicateReason: checkRes.duplicateReason,
            };
          })
        );
      }
    } catch (err) {
      console.warn('Check duplicates failed, continuing with client state', err);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // อัปเดตรายการ
  const handleUpdateItem = (updatedItem: PromotionItem) => {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
  };

  // ลบรายการ
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // เพิ่มแถวใหม่
  const handleAddNewRow = (forcedCategory?: PromoCategory) => {
    const targetCat = forcedCategory || (reviewFilter !== 'all' ? reviewFilter : 'noodle');
    const isCoffee = targetCat === 'coffee';
    const newItem: PromotionItem = {
      id: `new-${Date.now()}`,
      category: targetCat,
      selected: true,
      date: getBangkokTodayDMY(),
      store: '7-11',
      brand: isCoffee ? 'เนสกาแฟ' : 'มาม่า',
      itemName: '',
      color: isCoffee ? 'แดง' : 'ซอง',
      packSize: isCoffee ? 40 : 1,
      bonusSachets: 0,
      promotion: 'ลดราคา',
      channel: 'หน้าร้าน',
      freqWeek: 1,
      freqMonth: 1,
      subCategory: isCoffee ? 'กาแฟซอง' : 'บะหมี่กึ่งสำเร็จรูป',
      period: '',
      machanic: '',
      retailPrice: null,
      proPrice: null,
      confidence: 1.0,
      notes: 'เพิ่มเอง',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // เลือกทั้งหมด / ไม่เลือกทั้งหมด
  const handleToggleSelectAll = (select: boolean) => {
    setItems((prev) =>
      prev.map((it) => {
        if (reviewFilter === 'all' || it.category === reviewFilter) {
          return { ...it, selected: select };
        }
        return it;
      })
    );
  };

  // บันทึกลง Google Sheet (แยกหมวดอัตโนมัติ: กาแฟ -> PRT, บะหมี่ -> NOODLE)
  const handleSaveToSheet = async () => {
    const selectedItems = items.filter((it) => it.selected);
    if (selectedItems.length === 0) {
      setErrorMessage('กรุณาเลือกรายการที่ต้องการบันทึกอย่างน้อย 1 รายการ');
      return;
    }

    // ตรวจสอบความถูกต้องเบื้องต้น
    for (const it of selectedItems) {
      if (!it.store || !it.brand || !it.itemName) {
        setErrorMessage(
          'กรุณากรอกข้อมูล ร้านค้า, แบรนด์, และชื่อสินค้า ให้ครบถ้วนสำหรับทุกรายการที่เลือก'
        );
        return;
      }
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      // เตรียมรูปภาพ Base64
      const imagesPayload = compressedImages.map((img, idx) => ({
        id: `img-${idx}`,
        base64: img.base64,
        mimeType: img.mimeType,
        filename: `${itFileName(img.filename, selectedItems[0]?.store, selectedItems[0]?.brand, idx + 1)}`,
      }));

      // เตรียมข้อมูลแถวสำหรับ Sheet พร้อมระบุ category ของแต่ละแถว
      const rowsPayload: (SheetRowData & { category: PromoCategory })[] = selectedItems.map((it) => ({
        date: it.date,
        store: it.store,
        brand: it.brand,
        itemName: it.itemName,
        color: it.color,
        packSize: it.packSize,
        promotion: it.promotion,
        channel: it.channel,
        freqWeek: it.freqWeek || 1,
        freqMonth: it.freqMonth || it.freqWeek || 1,
        period: it.period,
        machanic: it.machanic,
        retailPrice: it.retailPrice !== null ? Number(formatPrice(it.retailPrice)) : null,
        proPrice: it.proPrice !== null ? Number(formatPrice(it.proPrice)) : null,
        subCategory: it.subCategory,
        isPredictedPeriod: it.isPredictedPeriod,
        category: it.category,
        imageId: it.imageId || (imagesPayload.length > 0 ? imagesPayload[0].id : undefined),
      }));

      const data = await saveRowsClient(rowsPayload, imagesPayload);

      if (!data || !data.ok) {
        throw new Error(data?.error || 'การบันทึกลง Google Sheet ล้มเหลว');
      }

      setSaveSuccessData({
        rowsAdded: data.rowsAdded || rowsPayload.length,
        sheetName: data.sheetName || 'PRT & NOODLE',
        spreadsheetUrl: data.spreadsheetUrl,
        imageUrls: data.imageUrls,
      });
    } catch (err) {
      console.error('Save to sheet error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล โปรดลองใหม่อีกครั้ง'
      );
    } finally {
      setSaving(false);
    }
  };

  // รีเซ็ตเพื่ออัปโหลดต่อ
  const handleUploadMore = () => {
    setSaveSuccessData(null);
    setItems([]);
    setCompressedImages([]);
    setReviewFilter('all');
    setStep('upload');
  };

  // Helper สร้างชื่อไฟล์ yyyymmdd_ร้าน_แบรนด์_ลำดับ.jpg
  const itFileName = (origName: string, store: string = 'Store', brand: string = 'Brand', seq: number) => {
    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const cleanStore = store.replace(/\s+/g, '');
    const cleanBrand = brand.replace(/\s+/g, '');
    return `${yyyymmdd}_${cleanStore}_${cleanBrand}_${seq}.jpg`;
  };

  const selectedCount = items.filter((it) => it.selected).length;
  const coffeeCount = items.filter((it) => it.category === 'coffee').length;
  const noodleCount = items.filter((it) => it.category === 'noodle').length;

  const displayedItems = reviewFilter === 'all'
    ? items
    : items.filter((it) => it.category === reviewFilter);

  return (
    <>
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 space-y-6">
        {step === 'upload' ? (
          /* Step 1: Uploading Images (Unified All-in-One Scanner) */
          <div className="space-y-6">
            <div className="text-white rounded-3xl p-6 sm:p-8 shadow-lg transition-all bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 shadow-orange-600/10">
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Smart Scanner (All-in-One)
                </span>
                <span className="text-xs bg-black/25 px-2.5 py-1 rounded-full font-medium">
                  แยกหมวด กาแฟ (PRT) และ บะหมี่/โจ๊ก (NOODLE) อัตโนมัติในรูปเดียว
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                บันทึกโปรโมชั่นสินค้าอัจฉริยะ
              </h1>
              <p className="text-white/90 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                อัปโหลดหรือถ่ายรูปใบปลิวโปรโมชั่นเพียง 1 รูป ไม่ว่าจะมีทั้งกาแฟและบะหมี่/โจ๊กปะปนกัน ระบบ AI จะช่วยตรวจจับ อ่านป้ายราคา และแยกหมวดหมู่บันทึกลง Sheet (แท็บ PRT & NOODLE) ให้อัตโนมัติ
              </p>
            </div>

            <ImageUploader
              onExtracted={handleExtracted}
              onManualEntry={handleManualEntry}
            />
          </div>
        ) : (
          /* Step 2: Review and Verification */
          <div className="space-y-6">
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm sticky top-20 z-30">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="ย้อนกลับไปหน้าอัปโหลด"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span>ตรวจสอบข้อมูล</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {items.length} รายการ
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกบันทึกแล้ว {selectedCount} จาก {items.length} รายการ (☕ กาแฟ {coffeeCount} | 🍜 บะหมี่ {noodleCount})
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => checkDuplicates(items)}
                  disabled={checkingDuplicates || saving}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  title="ตรวจสอบข้อมูลซ้ำกับใน Google Sheet"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${checkingDuplicates ? 'animate-spin text-amber-600' : ''}`}
                  />
                  <span className="hidden sm:inline">ตรวจข้อมูลซ้ำ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddNewRow()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-600" />
                  <span>เพิ่มแถว</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToSheet}
                  disabled={saving || selectedCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-medium rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกลง Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>บันทึกลง Sheet ({selectedCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Category Breakdown & Filter Chips */}
            {items.length > 0 && (
              <div className="flex items-center justify-between gap-3 bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200/60 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 px-1">กรองดู:</span>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      reviewFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>ทั้งหมด ({items.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewFilter('coffee')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      reviewFilter === 'coffee'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    <span>☕ กาแฟซอง ({coffeeCount})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">แท็บ PRT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewFilter('noodle')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      reviewFilter === 'noodle'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white text-orange-900 border border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <span>🍜 บะหมี่ / โจ๊ก ({noodleCount})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800">แท็บ NOODLE</span>
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  ระบบแยกหมวดหมู่อัตโนมัติ (สามารถกดเปลี่ยนหมวดในแต่ละการ์ดได้)
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Actions (Select All / Unselect All) */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="text-amber-700 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>เลือกทั้งหมด</span>
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(false)}
                  className="hover:underline cursor-pointer"
                >
                  ยกเลิกการเลือกทั้งหมด
                </button>
              </div>

              <span>ช่องสีเหลืองคือช่องที่ AI ไม่มั่นใจ หรือเป็นค่าว่าง</span>
            </div>

            {/* Promotion Cards List */}
            {displayedItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">
                  ไม่มีรายการโปรโมชั่นในหมวดนี้
                </h3>
                <p className="text-xs text-slate-400">
                  {reviewFilter !== 'all'
                    ? 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'
                    : 'กดปุ่ม "เพิ่มแถว" ด้านบนเพื่อกรอกข้อมูลด้วยตนเอง'}
                </p>
                <button
                  type="button"
                  onClick={() => handleAddNewRow()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มรายการใหม่</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedItems.map((item, index) => (
                  <PromotionCard
                    key={item.id}
                    item={item}
                    index={index}
                    total={displayedItems.length}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                    onViewImage={(url) => {
                      setModalImageUrl(url);
                      setIsImageModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Bottom Save Button for Mobile */}
            {items.length > 0 && (
              <div className="sm:hidden sticky bottom-4 z-20">
                <button
                  type="button"
                  onClick={handleSaveToSheet}
                  disabled={saving || selectedCount === 0}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 active:bg-emerald-700 text-white font-medium rounded-2xl shadow-xl shadow-emerald-700/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>บันทึกลง Sheet ({selectedCount} แถว)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={modalImageUrl}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={!!saveSuccessData}
        rowsAdded={saveSuccessData?.rowsAdded || 0}
        sheetName={saveSuccessData?.sheetName}
        spreadsheetUrl={saveSuccessData?.spreadsheetUrl}
        imageUrls={saveSuccessData?.imageUrls}
        onUploadMore={handleUploadMore}
      />
    </>
  );
}
