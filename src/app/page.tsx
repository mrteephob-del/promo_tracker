'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import ImageUploader from '@/components/ImageUploader';
import PromotionCard from '@/components/PromotionCard';
import ImageModal from '@/components/ImageModal';
import SuccessModal from '@/components/SuccessModal';
import { PromotionItem, SheetRowData } from '@/types';
import { CompressedImageResult } from '@/lib/image';
import { getBangkokTodayDMY, formatPrice } from '@/lib/calc';
import {
  ArrowLeft,
  Plus,
  Save,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCheck,
} from 'lucide-react';

export default function HomePage() {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [items, setItems] = useState<PromotionItem[]>([]);
  const [compressedImages, setCompressedImages] = useState<CompressedImageResult[]>([]);

  // Image Modal State
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Save & Status State
  const [saving, setSaving] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [saveSuccessData, setSaveSuccessData] = useState<{
    rowsAdded: number;
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
      selected: true,
      date: date || getBangkokTodayDMY(),
      store: store || '7-11',
      brand: 'เนสกาแฟ',
      itemName: '',
      color: 'แดง',
      packSize: 40,
      bonusSachets: 0,
      promotion: 'ลดราคา',
      channel: channel || 'หน้าร้าน',
      freqWeek: 1,
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

  // ตรวจสอบข้อมูลซ้ำกับ Google Sheet ผ่าน /api/check
  const checkDuplicates = async (currentItems: PromotionItem[]) => {
    if (currentItems.length === 0) return;
    setCheckingDuplicates(true);
    setErrorMessage(null);

    try {
      const sheetRows: SheetRowData[] = currentItems.map((item) => ({
        date: item.date,
        store: item.store,
        brand: item.brand,
        itemName: item.itemName,
        color: item.color,
        packSize: item.packSize,
        promotion: item.promotion,
        channel: item.channel,
        freqWeek: item.freqWeek,
        period: item.period,
        machanic: item.machanic,
        retailPrice: item.retailPrice,
        proPrice: item.proPrice,
      }));

      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: sheetRows }),
      });

      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.results)) {
        setItems((prev) =>
          prev.map((item, idx) => {
            const checkRes = data.results[idx];
            if (!checkRes) return item;
            return {
              ...item,
              freqWeek: checkRes.freqWeek || item.freqWeek,
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
  const handleAddNewRow = () => {
    const newItem: PromotionItem = {
      id: `new-${Date.now()}`,
      selected: true,
      date: getBangkokTodayDMY(),
      store: '7-11',
      brand: 'เนสกาแฟ',
      itemName: '',
      color: 'แดง',
      packSize: 40,
      bonusSachets: 0,
      promotion: 'ลดราคา',
      channel: 'หน้าร้าน',
      freqWeek: 1,
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
    setItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  // บันทึกลง Google Sheet ผ่าน /api/save
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

      // เตรียมข้อมูลแถวสำหรับ Sheet (A–N)
      const rowsPayload: SheetRowData[] = selectedItems.map((it) => ({
        date: it.date,
        store: it.store,
        brand: it.brand,
        itemName: it.itemName,
        color: it.color,
        packSize: it.packSize,
        promotion: it.promotion,
        channel: it.channel,
        freqWeek: it.freqWeek || 1,
        period: it.period,
        machanic: it.machanic,
        retailPrice: it.retailPrice !== null ? Number(formatPrice(it.retailPrice)) : null,
        proPrice: it.proPrice !== null ? Number(formatPrice(it.proPrice)) : null,
        imageId: it.imageId || (imagesPayload.length > 0 ? imagesPayload[0].id : undefined),
      }));

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rowsPayload,
          images: imagesPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'การบันทึกลง Google Sheet ล้มเหลว');
      }

      setSaveSuccessData({
        rowsAdded: data.rowsAdded || rowsPayload.length,
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

  return (
    <>
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 space-y-6">
        {step === 'upload' ? (
          /* Step 1: Uploading Images */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-amber-600/10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                Mobile-First AI Assistant
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                บันทึกโปรโมชั่นกาแฟซอง
              </h1>
              <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
                ระบบสกัดข้อมูลโปรโมชั่นของ 4 แบรนด์หลัก (เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์)
                จากรูปภาพร้าน 7-11, CJ More, Mini BigC, Lotus, Top และส่งต่อลง Google Sheet ทันที
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">
                    ตรวจสอบข้อมูล ({items.length} รายการ)
                  </h2>
                  <p className="text-xs text-slate-500">
                    เลือกบันทึกแล้ว {selectedCount} จาก {items.length} รายการ
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
                  onClick={handleAddNewRow}
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
                  className="text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
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
            {items.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">
                  ไม่มีรายการโปรโมชั่น
                </h3>
                <p className="text-xs text-slate-400">
                  กดปุ่ม &quot;เพิ่มแถว&quot; ด้านบนเพื่อกรอกข้อมูลด้วยตนเอง
                </p>
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มรายการใหม่</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <PromotionCard
                    key={item.id}
                    item={item}
                    index={index}
                    total={items.length}
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
        spreadsheetUrl={saveSuccessData?.spreadsheetUrl}
        imageUrls={saveSuccessData?.imageUrls}
        onUploadMore={handleUploadMore}
      />
    </>
  );
}

