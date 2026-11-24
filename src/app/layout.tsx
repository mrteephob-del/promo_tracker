import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ระบบติดตามและวิเคราะห์ราคาโปรโมชั่นสินค้า | e-Price Intelligence',
  description: 'ระบบสารสนเทศภาครัฐเพื่อการติดตาม ตรวจสอบ และวิเคราะห์ราคาโปรโมชั่นสินค้าอุปโภคบริโภค',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230f2b5c"/><path d="M50 18 L82 34 L82 66 L50 82 L18 66 L18 34 Z" fill="none" stroke="%2338bdf8" stroke-width="6"/><circle cx="50" cy="50" r="14" fill="%23f59e0b"/></svg>',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-[#f4f7fb] text-slate-900 flex flex-col font-sans selection:bg-sky-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}

