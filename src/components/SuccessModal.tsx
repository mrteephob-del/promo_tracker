'use client';

import React from 'react';
import { CheckCircle2, ExternalLink, PlusCircle, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  rowsAdded: number;
  spreadsheetUrl?: string;
  imageUrls?: string[];
  onUploadMore: () => void;
}

export default function SuccessModal({
  isOpen,
  rowsAdded,
  spreadsheetUrl,
  imageUrls = [],
  onUploadMore,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
            บันทึกข้อมูลสำเร็จ!
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            เพิ่มข้อมูลโปรโมชั่นลง Google Sheet เรียบร้อยแล้วจำนวน{' '}
            <span className="font-bold text-emerald-600">{rowsAdded}</span> แถว
          </p>
        </div>

        {/* Links info */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheet:</span>
            </span>
            <a
              href={
                spreadsheetUrl ||
                'https://docs.google.com/spreadsheets/d/11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4/edit'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <span>เปิดดูแท็บ PRT</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {imageUrls.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>รูปที่บันทึกลง Drive:</span>
              </span>
              <span className="text-slate-700 font-medium">
                {imageUrls.filter(Boolean).length} รูป
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onUploadMore}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-2xl shadow-lg shadow-amber-600/20 transition-all cursor-pointer text-base"
          >
            <PlusCircle className="w-5 h-5" />
            <span>อัปโหลดรูปต่อ</span>
          </button>

          <a
            href={
              spreadsheetUrl ||
              'https://docs.google.com/spreadsheets/d/11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4/edit'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-2xl transition-all text-sm block"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>ไปที่ Google Sheet</span>
          </a>
        </div>
      </div>
    </div>
  );
}

