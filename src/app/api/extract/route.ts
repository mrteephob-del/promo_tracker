import { NextRequest, NextResponse } from 'next/server';
import { extractPromotionFromImage } from '@/lib/gemini';
import { PromotionItem, PromoCategory, AiModelMode } from '@/types';
import { isTrackedBrand, getBangkokTodayDMY } from '@/lib/calc';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      defaultStore,
      defaultChannel,
      recordDate,
      category = 'coffee',
      modelMode = 'pro',
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { ok: false, error: 'กรุณาส่งรูปภาพ base64 เพื่อทำการวิเคราะห์' },
        { status: 400 }
      );
    }

    const currentCategory: PromoCategory = category === 'noodle' ? 'noodle' : 'coffee';
    const currentModelMode: AiModelMode = modelMode === 'flash' ? 'flash' : 'pro';

    // เรียก Gemini (Gemini 2.5 Pro หรือ Flash ตามที่เลือก)
    const extractedList = await extractPromotionFromImage(
      imageBase64,
      mimeType,
      currentCategory,
      currentModelMode
    );

    const formattedDate = recordDate || getBangkokTodayDMY();

    // แปลงผลลัพธ์จาก Gemini เป็น PromotionItem[] สำหรับ UI
    const items: PromotionItem[] = extractedList.map((item, index) => {
      const store = defaultStore && defaultStore !== 'auto' ? defaultStore : item.store_guess || '';
      const channel = defaultChannel || 'หน้าร้าน';

      let period = '';
      if (item.period_start && item.period_end) {
        period = `${item.period_start} - ${item.period_end}`;
      } else if (item.period_start) {
        period = item.period_start;
      } else if (item.period_end) {
        period = item.period_end;
      }

      // ตรวจสอบแบรนด์: สำหรับกาแฟเช็ค 4 แบรนด์หลัก, สำหรับบะหมี่รับทุกแบรนด์
      const isUntracked = currentCategory === 'coffee' ? !isTrackedBrand(item.brand) : false;

      return {
        id: `extracted-${Date.now()}-${index}`,
        category: currentCategory,
        selected: !isUntracked,
        date: formattedDate,
        store: store,
        brand: item.brand,
        itemName: item.item_name,
        color: item.color || (currentCategory === 'noodle' ? 'ซอง' : 'แดง'),
        packSize: item.pack_size ?? (currentCategory === 'noodle' ? 1 : 40),
        bonusSachets: item.bonus_sachets,
        promotion: item.promotion_type || 'ลดราคา',
        channel: channel,
        freqWeek: 1,
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
      category: currentCategory,
      modelMode: currentModelMode,
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
