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

        // วาดภาพที่ปรับขนาดแล้ว
        ctx.drawImage(img, 0, 0, width, height);

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
