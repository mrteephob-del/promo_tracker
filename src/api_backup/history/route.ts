import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentSheetRows } from '@/lib/sheets';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const sheetName = searchParams.get('sheetName') || 'PRT';

  try {
    const result = await fetchRecentSheetRows(limit, sheetName);
    return NextResponse.json(result);
  } catch (err) {
    console.warn('API /api/history live fetch failed, using local cache fallback:', err);
    try {
      const cachePath = path.resolve(process.cwd(), 'src/data/cached_sheet_data.json');
      if (fs.existsSync(cachePath)) {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed = JSON.parse(raw);
        const rows = sheetName === 'NOODLE' ? (parsed.noodle || []) : (parsed.prt || []);
        return NextResponse.json({
          ok: true,
          sheetName,
          rows: limit ? rows.slice(0, limit) : rows,
          fromCache: true,
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

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
