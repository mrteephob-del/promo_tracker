import { NextRequest, NextResponse } from 'next/server';
import { checkDuplicatesWithSheet } from '@/lib/sheets';
import { SheetRowData } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: SheetRowData[] = body.rows || [];
    const sheetName = body.sheetName || 'PRT';

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const result = await checkDuplicatesWithSheet(rows, sheetName);
    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/check Error:', err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลซ้ำจาก Google Sheet',
      },
      { status: 500 }
    );
  }
}
