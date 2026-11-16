/**
 * บีบอัดและปรับขนาดรูปภาพฝั่ง Client ก่อนส่งไปยังเซิร์ฟเวอร์
 * ปรับปรุงความละเอียดสูงขึ้น (สูงสุด 2600px, คุณภาพ 0.92) เพื่อให้อ่านตัวหนังสือเล็กๆ บนโบรชัวร์ได้คมชัด
 */
export interface CompressedImageResult {
  base64: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  filename: string;
  originalDataUrl?: string; // เก็บรูปต้นฉบับเต็มขนาดไว้ เผื่อต้องการรีเซ็ตหรือครอปซ้ำ
  isCropped?: boolean; // ระบุว่ารูปนี้ผ่านการครอปเฉพาะจุดมาแล้ว
}

export async function compressImage(
  file: File,
  maxDimension: number = 2600,
  quality: number = 0.92
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // คำนวณอัตราส่วนการย่อขนาด (ด้านยาวสุดไม่เกิน maxDimension)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถสร้าง Canvas Context ได้'));
          return;
        }

        // เปิดโหมด High Smoothing เพื่อให้ฟอนต์และตัวเลขคมชัดที่สุด
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // วาดรูปพื้นหลังสีขาวกรณี PNG โปร่งใส
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // ปรับแต่ง Contrast และ Brightness อัตโนมัติ เพื่อดึงตัวเลขและตัวอักษรป้ายราคาที่เบลอหรือมีแสงสะท้อนให้เด่นชัดขึ้น
        try {
          ctx.filter = 'contrast(1.08) brightness(1.02)';
        } catch {
          // ignore if not supported
        }

        // วาดภาพที่ปรับขนาดแล้ว
        ctx.drawImage(img, 0, 0, width, height);

        try {
          ctx.filter = 'none';
        } catch {
          // ignore
        }

        // ส่งออกเป็น JPEG คุณภาพสูง
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';

        // ประมาณขนาดไฟล์หลังบีบอัด
        const compressedSize = Math.round((base64.length * 3) / 4);

        resolve({
          base64,
          dataUrl,
          mimeType: 'image/jpeg',
          width,
          height,
          originalSize: file.size,
          compressedSize,
          filename: file.name,
          originalDataUrl: dataUrl,
          isCropped: false,
        });
      };

      img.onerror = () => {
        reject(new Error('ไม่สามารถโหลดรูปภาพเพื่อบีบอัดได้'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.onerror = () => {
      reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    };

    reader.readAsDataURL(file);
  });
}

export interface CropNormalizedRect {
  x: number; // 0.0 ถึง 1.0 (อิงตามความกว้างของรูป)
  y: number; // 0.0 ถึง 1.0 (อิงตามความสูงของรูป)
  width: number; // 0.0 ถึง 1.0
  height: number; // 0.0 ถึง 1.0
}

/**
 * ตัดส่วนรูปภาพตามพิกัด Normalized (0.0 ถึง 1.0) จากรูปต้นฉบับความละเอียดสูง
 * พร้อม Upscale คมชัดระดับ HD เพื่อให้ Gemini OCR อ่านตัวหนังสือและตัวเลขได้ 100%
 */
export async function cropImageRegion(
  sourceDataUrl: string,
  rect: CropNormalizedRect,
  originalFilename: string = 'cropped-promo.jpg',
  quality: number = 0.95
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;

      // ป้องกันค่าหลุดขอบ (clamp)
      const clampedX = Math.max(0, Math.min(1, rect.x));
      const clampedY = Math.max(0, Math.min(1, rect.y));
      const clampedW = Math.max(0.01, Math.min(1 - clampedX, rect.width));
      const clampedH = Math.max(0.01, Math.min(1 - clampedY, rect.height));

      const cropX = Math.round(clampedX * naturalW);
      const cropY = Math.round(clampedY * naturalH);
      const cropW = Math.round(clampedW * naturalW);
      const cropH = Math.round(clampedH * naturalH);

      if (cropW <= 0 || cropH <= 0) {
        reject(new Error('ขนาดของกรอบที่ครอปต้องมากกว่า 0'));
        return;
      }

      // ปรับขนาดเป้าหมายให้คมชัดระดับ HD สำหรับ OCR (ด้านยาวสุดอย่างน้อย 1200px แต่ไม่เกิน 2400px)
      let targetW = cropW;
      let targetH = cropH;
      const maxDim = Math.max(targetW, targetH);
      if (maxDim < 1200) {
        const scale = 1200 / maxDim;
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      } else if (maxDim > 2400) {
        const scale = 2400 / maxDim;
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('ไม่สามารถสร้าง Canvas Context ได้'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // พื้นหลังสีขาว
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      // วาดส่วนที่ถูกครอปจากรูปความละเอียดสูง
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      const croppedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = croppedDataUrl.split(',')[1] || '';
      const compressedSize = Math.round((base64.length * 3) / 4);

      resolve({
        base64,
        dataUrl: croppedDataUrl,
        mimeType: 'image/jpeg',
        width: targetW,
        height: targetH,
        originalSize: compressedSize,
        compressedSize,
        filename: originalFilename.replace(/\.[^/.]+$/, '') + '-crop.jpg',
        originalDataUrl: sourceDataUrl,
        isCropped: true,
      });
    };

    img.onerror = () => {
      reject(new Error('ไม่สามารถโหลดรูปภาพเพื่อครอปได้'));
    };

    img.src = sourceDataUrl;
  });
}
