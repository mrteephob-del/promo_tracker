import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // เส้นทางที่ไม่ต้องตรวจสอบสิทธิ์
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/auth'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const expectedPassword = process.env.APP_PASSWORD || '';
  const isAuthenticated = await verifySessionToken(token, expectedPassword);

  // กรณีอยู่ที่หน้า /login
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // กรณีเข้าถึงเส้นทางอื่นโดยยังไม่ได้เข้าสู่ระบบ
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

