import { NextRequest, NextResponse } from 'next/server';
import { extractPromotionFromImage } from '@/lib/gemini';
import { PromotionItem } from '@/types';
import { isTrackedBrand, getBangkokTodayDMY } from '@/lib/calc';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', defaultStore, defaultChannel, recordDate } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { ok: false, error: 'กรุณาส่งรูปภาพ base64 เพื่อทำการวิเคราะห์' },
        { status: 400 }
      );
    }

    // เรียก Gemini 2.5 Flash
    const extractedList = await extractPromotionFromImage(imageBase64, mimeType);

    const formattedDate = recordDate || getBangkokTodayDMY();

    // แปลงผลลัพธ์จาก Gemini เป็น PromotionItem[] สำหรับ UI
    const items: PromotionItem[] = extractedList.map((item, index) => {
      // เลือกร้าน: ถ้าผู้ใช้เลือก defaultStore มาให้ใช้ค่านั้น ถ้าไม่เลือกให้ใช้ค่าที่ AI เดา
      const store = defaultStore && defaultStore !== 'auto' ? defaultStore : item.store_guess || '';
      const channel = defaultChannel || 'หน้าร้าน';

      // จัดฟอร์แมตช่วงโปร: "dd/mm/yyyy - dd/mm/yyyy"
      let period = '';
      if (item.period_start && item.period_end) {
        period = `${item.period_start} - ${item.period_end}`;
      } else if (item.period_start) {
        period = item.period_start;
      } else if (item.period_end) {
        period = item.period_end;
      }

      const isUntracked = !isTrackedBrand(item.brand);

      return {
        id: `extracted-${Date.now()}-${index}`,
        selected: !isUntracked, // ถ้าเป็นแบรนด์นอก 4 แบรนด์ ไม่เลือกบันทึกเป็นค่าเริ่มต้น
        date: formattedDate,
        store: store,
        brand: item.brand,
        itemName: item.item_name,
        color: item.color || 'แดง',
        packSize: item.pack_size,
        bonusSachets: item.bonus_sachets,
        promotion: item.promotion_type || 'ลดราคา',
        channel: channel,
        freqWeek: 1, // จะถูกอัปเดตเมื่อตรวจกับ Sheet
        period: period,
        machanic: item.mechanic,
        retailPrice: item.retail_price,
        proPrice: item.pro_price,
        confidence: item.confidence,
        notes: item.notes,
        isUntrackedBrand: isUntracked,
      };
    });

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
    });
  } catch (err) {
    console.error('API /api/extract Error:', err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพด้วย AI โปรดลองใหม่อีกครั้ง',
      },
      { status: 500 }
    );
  }
}

