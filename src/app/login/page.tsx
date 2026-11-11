'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง');
        setLoading(false);
        return;
      }

      // เข้าสู่ระบบสำเร็จ redirect ไปหน้าหลัก
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-amber-50 via-orange-50 to-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-amber-900/5 border border-amber-100 p-6 sm:p-8">
        {/* Brand Icon & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 mb-4 transform hover:scale-105 transition-transform">
            <Coffee className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Promo Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ระบบบันทึกโปรโมชั่นกาแฟซองลง Google Sheet อัตโนมัติ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              รหัสผ่านเข้าใช้งาน (App Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="กรอกรหัสผ่านเพื่อเข้าสู่ระบบ"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium rounded-xl shadow-lg shadow-amber-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังตรวจสอบรหัสผ่าน...</span>
              </>
            ) : (
              <>
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            ระบบภายในสำหรับทีมติดตามโปรโมชั่นกาแฟซอง
          </p>
        </div>
      </div>
    </div>
  );
}

