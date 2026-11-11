import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;
    const expectedPassword = process.env.APP_PASSWORD;

    if (!expectedPassword) {
      return NextResponse.json(
        { ok: false, error: 'ระบบยังไม่ได้ตั้งค่า APP_PASSWORD ใน Server Environment' },
        { status: 500 }
      );
    }

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { ok: false, error: 'รหัสผ่านไม่ถูกต้อง โปรดลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(expectedPassword);

    const response = NextResponse.json({ ok: true, message: 'เข้าสู่ระบบสำเร็จ' });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 วัน
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: 'ออกจากระบบสำเร็จ' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const expectedPassword = process.env.APP_PASSWORD;

  if (!expectedPassword) {
    return NextResponse.json({ authenticated: false });
  }

  const isValid = await verifySessionToken(token, expectedPassword);
  return NextResponse.json({ authenticated: isValid });
}

