'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  X,
  Check,
  RotateCcw,
  Plus,
  Sparkles,
  Maximize2,
  ZoomIn,
  HelpCircle,
} from 'lucide-react';
import { CompressedImageResult, CropNormalizedRect, cropImageRegion } from '@/lib/image';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: CompressedImageResult | null;
  imageIndex: number;
  onApplyCrop: (croppedImage: CompressedImageResult, mode: 'replace' | 'add') => void;
  onResetOriginal?: (index: number) => void;
}

type DragMode = 'none' | 'draw' | 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export default function ImageCropModal({
  isOpen,
  onClose,
  image,
  imageIndex,
  onApplyCrop,
  onResetOriginal,
}: ImageCropModalProps) {
  // พิกัดกรอบ Normalized (0.0 ถึง 1.0)
  const [cropRect, setCropRect] = useState<CropNormalizedRect>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialRect, setInitialRect] = useState<CropNormalizedRect | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // เมื่อเปิด modal หรือสลับรูป ให้รีเซ็ตกรอบเริ่มต้น
  useEffect(() => {
    if (isOpen && image) {
      setCropRect({
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
      });
      setDragMode('none');
      setToastMessage(null);
    }
  }, [isOpen, image]);

  // คำนวณพิกัด Normalized จาก Pointer Event
  const getNormalizedPoint = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const pt = getNormalizedPoint(e);
    setDragMode(mode);
    setDragStart(pt);
    setInitialRect({ ...cropRect });

    if (mode === 'draw') {
      setCropRect({
        x: pt.x,
        y: pt.y,
        width: 0.01,
        height: 0.01,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode === 'none' || !dragStart || !initialRect) return;
    e.preventDefault();

    const pt = getNormalizedPoint(e);
    const dx = pt.x - dragStart.x;
    const dy = pt.y - dragStart.y;

    if (dragMode === 'draw') {
      const minX = Math.min(dragStart.x, pt.x);
      const minY = Math.min(dragStart.y, pt.y);
      const w = Math.abs(pt.x - dragStart.x);
      const h = Math.abs(pt.y - dragStart.y);
      setCropRect({
        x: Math.max(0, Math.min(0.99, minX)),
        y: Math.max(0, Math.min(0.99, minY)),
        width: Math.max(0.02, Math.min(1 - minX, w)),
        height: Math.max(0.02, Math.min(1 - minY, h)),
      });
    } else if (dragMode === 'move') {
      const newX = Math.max(0, Math.min(1 - initialRect.width, initialRect.x + dx));
      const newY = Math.max(0, Math.min(1 - initialRect.height, initialRect.y + dy));
      setCropRect({
        ...initialRect,
        x: newX,
        y: newY,
      });
    } else {
      // การย่อ/ขยายตาม Handle ต่างๆ
      let { x, y, width, height } = initialRect;

      if (dragMode.includes('w')) {
        const potentialW = width - dx;
        if (potentialW > 0.05 && x + dx >= 0) {
          x += dx;
          width = potentialW;
        }
      }
      if (dragMode.includes('e')) {
        const potentialW = width + dx;
        if (potentialW > 0.05 && x + potentialW <= 1) {
          width = potentialW;
        }
      }
      if (dragMode.includes('n')) {
        const potentialH = height - dy;
        if (potentialH > 0.05 && y + dy >= 0) {
          y += dy;
          height = potentialH;
        }
      }
      if (dragMode.includes('s')) {
        const potentialH = height + dy;
        if (potentialH > 0.05 && y + potentialH <= 1) {
          height = potentialH;
        }
      }

      setCropRect({
        x: Math.max(0, Math.min(0.95, x)),
        y: Math.max(0, Math.min(0.95, y)),
        width: Math.max(0.03, Math.min(1 - x, width)),
        height: Math.max(0.03, Math.min(1 - y, height)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragMode('none');
    setDragStart(null);
    setInitialRect(null);
  };

  // ดำเนินการครอปและส่งรูป
  const handleExecuteCrop = async (mode: 'replace' | 'add') => {
    if (!image) return;
    setIsProcessing(true);
    try {
      // ใช้รูปต้นฉบับเต็มขนาดหากมี เพื่อให้ได้ความคมชัดสูงสุด
      const sourceUrl = image.originalDataUrl || image.dataUrl;
      const cropped = await cropImageRegion(sourceUrl, cropRect, image.filename);

      onApplyCrop(cropped, mode);

      if (mode === 'add') {
        setToastMessage('✅ เพิ่มสินค้าที่ตีกรอบเป็นอีกรายการแล้ว! คุณสามารถลากตีกรอบชิ้นถัดไปได้ทันที');
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Crop error:', err);
      alert('เกิดข้อผิดพลาดในการตัดรูปภาพ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (onResetOriginal) {
      onResetOriginal(imageIndex);
    }
    setCropRect({
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.9,
    });
    setToastMessage('↺ คืนค่ารูปเดิมเรียบร้อยแล้ว');
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (!isOpen || !image) return null;

  const currentDisplayUrl = image.originalDataUrl || image.dataUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <span>ตีกรอบเลือกเฉพาะสินค้า (Crop & Focus)</span>
                {image.isCropped && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    ผ่านการครอปแล้ว
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 hidden sm:block">
                ลากสี่เหลี่ยมคลุมเฉพาะสินค้าที่ต้องการ เพื่อให้ AI สแกนเฉพาะช่องนั้นด้วยความแม่นยำ 100%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Interactive Workspace */}
        <div className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center p-2 sm:p-4 select-none min-h-[300px] max-h-[62vh]">
          <div
            ref={containerRef}
            className="relative max-w-full max-h-full inline-block cursor-crosshair touch-none"
            onPointerDown={(e) => handlePointerDown(e, 'draw')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={currentDisplayUrl}
              alt="Crop target"
              draggable={false}
              className="max-h-[56vh] max-w-full object-contain pointer-events-none rounded-lg"
            />

            {/* Dark Mask Top */}
            <div
              className="absolute left-0 top-0 right-0 bg-black/60 pointer-events-none"
              style={{ height: `${cropRect.y * 100}%` }}
            />
            {/* Dark Mask Bottom */}
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none"
              style={{ height: `${(1 - (cropRect.y + cropRect.height)) * 100}%` }}
            />
            {/* Dark Mask Left */}
            <div
              className="absolute left-0 bg-black/60 pointer-events-none"
              style={{
                top: `${cropRect.y * 100}%`,
                height: `${cropRect.height * 100}%`,
                width: `${cropRect.x * 100}%`,
              }}
            />
            {/* Dark Mask Right */}
            <div
              className="absolute right-0 bg-black/60 pointer-events-none"
              style={{
                top: `${cropRect.y * 100}%`,
                height: `${cropRect.height * 100}%`,
                width: `${(1 - (cropRect.x + cropRect.width)) * 100}%`,
              }}
            />

            {/* Crop Active Box */}
            <div
              className="absolute border-2 border-amber-400 bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.7)] cursor-move"
              style={{
                left: `${cropRect.x * 100}%`,
                top: `${cropRect.y * 100}%`,
                width: `${cropRect.width * 100}%`,
                height: `${cropRect.height * 100}%`,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
            >
              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-dashed border-white/60" />
                <div className="border-r border-dashed border-white/60" />
                <div />
                <div className="border-r border-t border-dashed border-white/60" />
                <div className="border-r border-t border-dashed border-white/60" />
                <div className="border-t border-dashed border-white/60" />
                <div className="border-r border-t border-dashed border-white/60" />
                <div className="border-r border-t border-dashed border-white/60" />
                <div className="border-t border-dashed border-white/60" />
              </div>

              {/* Tag Label */}
              <div className="absolute -top-6 left-0 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 pointer-events-none whitespace-nowrap">
                <Crop className="w-2.5 h-2.5" />
                <span>โฟกัสจุดนี้</span>
              </div>

              {/* Resize Handles (Corners) */}
              <div
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-900 rounded-xs cursor-nwse-resize shadow-xs"
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
              />
              <div
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-900 rounded-xs cursor-nesw-resize shadow-xs"
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
              />
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-900 rounded-xs cursor-nesw-resize shadow-xs"
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
              />
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-900 rounded-xs cursor-nwse-resize shadow-xs"
                onPointerDown={(e) => handlePointerDown(e, 'se')}
              />

              {/* Resize Handles (Edges) */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-400 border border-slate-900 rounded-xs cursor-ns-resize"
                onPointerDown={(e) => handlePointerDown(e, 'n')}
              />
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-400 border border-slate-900 rounded-xs cursor-ns-resize"
                onPointerDown={(e) => handlePointerDown(e, 's')}
              />
              <div
                className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-400 border border-slate-900 rounded-xs cursor-ew-resize"
                onPointerDown={(e) => handlePointerDown(e, 'w')}
              />
              <div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-400 border border-slate-900 rounded-xs cursor-ew-resize"
                onPointerDown={(e) => handlePointerDown(e, 'e')}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick Helper Text */}
          <div className="flex items-center gap-2 text-xs text-slate-500 self-start sm:self-center">
            <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>ลากเมาส์หรือใช้นิ้วลากคลุมเฉพาะตัวสินค้าและป้ายราคา</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Reset to Full Button */}
            {image.isCropped && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่ารูปเต็ม</span>
              </button>
            )}

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            {/* Multi-Crop: Add As Another Product */}
            <button
              type="button"
              onClick={() => handleExecuteCrop('add')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              title="สกัดสินค้านี้เพิ่มเข้าไปในคิว แล้วเลือกสินค้าถัดไปต่อได้เลย"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ เพิ่มเป็นอีกรายการ</span>
            </button>

            {/* Primary: Replace Current Image */}
            <button
              type="button"
              onClick={() => handleExecuteCrop('replace')}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-amber-600/20 active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'กำลังตัดรูป...' : 'ใช้รูปที่ตีกรอบนี้'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
