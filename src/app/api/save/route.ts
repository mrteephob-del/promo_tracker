import { NextRequest, NextResponse } from 'next/server';
import { saveRowsAndImagesToSheet } from '@/lib/sheets';
import { SheetRowData } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: SheetRowData[] = body.rows || [];
    const images = body.images || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'ไม่พบรายการข้อมูลที่จะบันทึก' },
        { status: 400 }
      );
    }

    const result = await saveRowsAndImagesToSheet(rows, images);
    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/save Error:', err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Google Sheet โปรดลองใหม่อีกครั้ง',
      },
      { status: 500 }
    );
  }
}

