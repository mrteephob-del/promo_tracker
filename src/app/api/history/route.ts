import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentSheetRows } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const result = await fetchRecentSheetRows(limit);
    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/history Error:', err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการดึงประวัติโปรโมชั่นจาก Google Sheet',
      },
      { status: 500 }
    );
  }
}

