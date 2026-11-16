'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Check, X, ExternalLink, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedKey);
      setStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setStatus('error');
      setStatusMessage('กรุณากรอก Gemini API Key');
      return;
    }

    setStatus('testing');
    setStatusMessage('กำลังทดสอบเชื่อมต่อกับ Google Gemini API...');

    try {
      // ทดสอบเรียก API สด
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const msg = errJson?.error?.message || `รหัสข้อผิดพลาด HTTP ${res.status}`;
        throw new Error(msg);
      }

      // บันทึกลง localStorage
      localStorage.setItem('gemini_api_key', trimmed);
      setStatus('success');
      setStatusMessage('เชื่อมต่อสำเร็จ! บันทึก API Key เรียบร้อยแล้ว');
      if (onKeySaved) onKeySaved(trimmed);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setStatus('error');
      setStatusMessage(
        err instanceof Error
          ? `คีย์ไม่ถูกต้อง: ${err.message}`
          : 'ไม่สามารถเชื่อมต่อได้ โปรดตรวจสอบว่าคีย์ขึ้นต้นด้วย AIzaSy...'
      );
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setStatus('idle');
    setStatusMessage('ลบคีย์ออกจากเครื่องเรียบร้อยแล้ว');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">ตั้งค่า Google Gemini API Key</h3>
            <p className="text-xs text-slate-500">สำหรับให้อ่านและถอดรหัสรูปโปรโมชั่นจริง</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ความปลอดภัยของข้อมูล</span>
            </p>
            <p>
              คีย์จะถูกบันทึกไว้ใน Browser ของคุณเท่านั้น (Local Storage) ไม่มีการส่งกลับไปบันทึกที่เซิร์ฟเวอร์ใดๆ
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Gemini API Key (ขึ้นต้นด้วย AIzaSy...)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pr-10 pl-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-900 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                status === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : status === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {status === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
              {status === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1 hover:underline"
            >
              <span>ขอรับ API Key ฟรีจาก Google</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                ลบคีย์
              </button>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={status === 'testing'}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {status === 'testing' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังทดสอบ...</span>
                </>
              ) : (
                <span>บันทึกและใช้งาน</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
