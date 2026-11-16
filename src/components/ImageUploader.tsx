'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Edit3,
  Store,
  Calendar,
  Share2,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';
import {
  TRACKED_STORES,
  TRACKED_CHANNELS,
  TrackedStore,
  TrackedChannel,
  PromotionItem,
  PromoCategory,
  AiModelMode,
} from '@/types';
import { compressImage, CompressedImageResult } from '@/lib/image';
import { getBangkokTodayYMD, convertYMDtoDMY } from '@/lib/calc';
import { extractPromotionClient } from '@/lib/client-api';

interface ImageUploaderProps {
  category: PromoCategory;
  onExtracted: (items: PromotionItem[], images: CompressedImageResult[]) => void;
  onManualEntry: (store: string, channel: string, date: string) => void;
}

export default function ImageUploader({ category, onExtracted, onManualEntry }: ImageUploaderProps) {
  const [selectedStore, setSelectedStore] = useState<string>('auto');
  const [selectedChannel, setSelectedChannel] = useState<string>('หน้าร้าน');
  const [recordDateYMD, setRecordDateYMD] = useState<string>(getBangkokTodayYMD());
  const [modelMode, setModelMode] = useState<AiModelMode>('pro');

  const [images, setImages] = useState<CompressedImageResult[]>([]);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // จัดการการเลือกรูปภาพ
  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setError(null);
    setCompressing(true);

    try {
      const newImages: CompressedImageResult[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file, 2400, 0.90);
        newImages.push(compressed);
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ โปรดลองใหม่อีกครั้ง');
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // วิเคราะห์รูปภาพด้วย Gemini
  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError('กรุณาเลือกหรือถ่ายรูปโปรโมชั่นอย่างน้อย 1 รูป');
      return;
    }

    setAnalyzing(true);
    setError(null);

    const allItems: PromotionItem[] = [];
    const errors: string[] = [];
    const recordDateDMY = convertYMDtoDMY(recordDateYMD);

    try {
      for (let i = 0; i < images.length; i++) {
        setAnalysisProgress(`กำลังวิเคราะห์รูปที่ ${i + 1} จาก ${images.length}...`);
        const img = images[i];

        try {
          const data = await extractPromotionClient({
            imageBase64: img.base64,
            mimeType: img.mimeType,
            defaultStore: selectedStore === 'auto' ? undefined : selectedStore,
            defaultChannel: selectedChannel,
            recordDate: recordDateDMY,
            category,
            modelMode,
          });

          if (!data || !data.ok) {
            errors.push(`รูปที่ ${i + 1}: ${data?.error || 'วิเคราะห์ไม่สำเร็จ'}`);
            continue;
          }

          // แนบรูปภาพอ้างอิงให้กับแต่ละ item
          const itemsWithImage = (data.items || []).map((item: PromotionItem) => ({
            ...item,
            imageId: `img-${i}`,
            imagePreviewUrl: img.dataUrl,
          }));

          allItems.push(...itemsWithImage);
        } catch (fetchErr) {
          errors.push(
            `รูปที่ ${i + 1}: ${fetchErr instanceof Error ? fetchErr.message : 'เชื่อมต่อล้มเหลว'}`
          );
        }
      }

      if (allItems.length === 0 && errors.length > 0) {
        throw new Error(errors.join(' \n '));
      }

      if (allItems.length === 0) {
        // ถ้า AI อ่านรูปไม่ได้เลย ให้เปิดฟอร์มกรอกเองได้ (manual entry) ใช้ตารางเดียวกันตามข้อกำหนด
        for (let idx = 0; idx < images.length; idx++) {
          allItems.push({
            id: `manual-fallback-${Date.now()}-${idx}`,
            category,
            selected: true,
            date: recordDateDMY,
            store: selectedStore === 'auto' ? '7-11' : selectedStore,
            brand: category === 'noodle' ? 'มาม่า' : 'เนสกาแฟ',
            itemName: category === 'noodle' ? 'มาม่า บะหมี่กึ่งสำเร็จรูป' : '',
            color: category === 'noodle' ? 'ซอง' : 'แดง',
            packSize: category === 'noodle' ? 1 : 40,
            bonusSachets: 0,
            promotion: 'ลดราคา',
            channel: selectedChannel,
            freqWeek: 1,
            period: '',
            machanic: '',
            retailPrice: null,
            proPrice: null,
            confidence: 0,
            notes: `AI ไม่พบรายการโปรโมชั่น${category === 'noodle' ? 'บะหมี่/โจ๊ก/ข้าวต้ม' : 'กาแฟซอง'} จึงเปิดแบบฟอร์มให้กรอกข้อมูลเอง`,
            imageId: `img-${idx}`,
            imagePreviewUrl: images[idx].dataUrl,
          });
        }
      }

      onExtracted(allItems, images);
    } catch (err) {
      console.error('Extraction error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ โปรดตรวจสอบอินเทอร์เน็ตหรือลองใหม่อีกครั้ง'
      );
    } finally {
      setAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-600" />
          <span>อัปโหลดรูปภาพโปรโมชั่น</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          ถ่ายจากกล้องมือถือหรือเลือกรูปจากแกลเลอรี่ AI จะช่วยอ่านและแยกข้อมูลอัตโนมัติ
        </p>
      </div>

      {/* AI Accuracy Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80">
        <div>
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>ระดับความแม่นยำของ AI:</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {modelMode === 'pro'
              ? '🎯 โหมดแม่นยำสูง (Gemini Pro) - วิเคราะห์ภาพละเอียด อ่านป้ายตัวหนังสือเล็ก/ป้ายราคาซับซ้อนแม่นยำที่สุด'
              : '⚡ โหมดปกติ (Gemini Flash) - เน้นความเร็ว ประมวลผลไว'}
          </span>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setModelMode('pro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              modelMode === 'pro'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎯 แม่นยำสูง (Pro)</span>
          </button>
          <button
            type="button"
            onClick={() => setModelMode('flash')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              modelMode === 'flash'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚡ ปกติ (Flash)</span>
          </button>
        </div>
      </div>

      {/* Select Store, Channel, and Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-amber-50/50 p-3.5 sm:p-4 rounded-2xl border border-amber-100">
        {/* Store */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-amber-600" />
            <span>ร้านค้า</span>
          </label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="auto">✨ ให้ AI ตรวจจับจากโลโก้</option>
            {TRACKED_STORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Channel */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-amber-600" />
            <span>ช่องทาง</span>
          </label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {TRACKED_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Record Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>วันที่บันทึก</span>
          </label>
          <input
            type="date"
            value={recordDateYMD}
            onChange={(e) => setRecordDateYMD(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Scanning & Store Guidance Tip */}
      <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 p-3 rounded-2xl border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-950">
            ระบบปรับแต่ง AI ให้เข้าใจเลย์เอาต์ป้ายเฉพาะของแต่ละห้างไทย (CJ More, Mini BigC, Lotus, 7-11)
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            💡 <strong>แนะนำ:</strong> เลือกร้านค้าด้านบนก่อนถ่าย เพื่อให้ AI ถอดรหัสราคาโปรเฉพาะของห้างนั้นได้แม่นยำ 100% พร้อมระบบ Auto-Contrast ดึงตัวเลขป้ายราคาที่เบลอให้คมชัดขึ้นอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="space-y-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          accept="image/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Action Buttons: Choose File or Camera */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={compressing || analyzing}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm">ถ่ายรูปจากกล้อง</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing || analyzing}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-medium rounded-2xl transition-all cursor-pointer disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5 text-slate-600" />
            <span className="text-sm">เลือกจากคลังภาพ</span>
          </button>
        </div>

        {/* Drag & Drop Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors"
        >
          <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            แตะหรือลากรูปภาพมาวางที่นี่
          </p>
          <p className="text-xs text-slate-400 mt-1">
            รองรับ JPG, PNG (ระบบจะบีบอัดภาพความละเอียดสูง 2600px คมชัดระดับ HD)
          </p>
        </div>
      </div>

      {/* Compressing indicator */}
      {compressing && (
        <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs sm:text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>กำลังปรับขนาดและบีบอัดรูปภาพ...</span>
        </div>
      )}

      {/* Selected Images Preview Thumbnails */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              รูปภาพที่เลือก ({images.length} รูป)
            </span>
            <button
              onClick={() => setImages([])}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              ล้างทั้งหมด
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center truncate">
                  {(img.compressedSize / 1024).toFixed(0)} KB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-rose-700 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
          {error.includes('Gemini API Key') && (
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer self-start sm:self-center shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>ใส่ API Key ตรงนี้</span>
            </button>
          )}
        </div>
      )}

      {/* Action Submit Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={images.length === 0 || analyzing || compressing}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-[0.99] text-white font-medium rounded-2xl shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{analysisProgress || 'AI กำลังวิเคราะห์รูปภาพ...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>วิเคราะห์รูปภาพ ({images.length} รูป)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            const dateDMY = convertYMDtoDMY(recordDateYMD);
            onManualEntry(
              selectedStore === 'auto' ? '7-11' : selectedStore,
              selectedChannel,
              dateDMY
            );
          }}
          disabled={analyzing}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-3.5 px-5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-2xl transition-all cursor-pointer text-sm"
        >
          <Edit3 className="w-4 h-4 text-slate-500" />
          <span>กรอกข้อมูลเอง (Manual)</span>
        </button>
      </div>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />
    </div>
  );
}

