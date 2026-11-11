'use client';

import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, title = 'รูปภาพต้นฉบับ' }: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-4xl w-full max-h-[92vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
}

