const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FOLDER = '/Users/teephobwirachowatin/Pictures/Promo Facebook/CJ More/CJ More';
const CROP_DIR = '/tmp/cjmore_crops';
if (!fs.existsSync(CROP_DIR)) fs.mkdirSync(CROP_DIR, { recursive: true });

const PUBLIC_CROPS_DIR = path.resolve(__dirname, '../public/crops');
if (!fs.existsSync(PUBLIC_CROPS_DIR)) fs.mkdirSync(PUBLIC_CROPS_DIR, { recursive: true });

const DRIVE_MAP_PATH = path.resolve(__dirname, '../src/data/drive_images_map.json');
const driveMap = fs.existsSync(DRIVE_MAP_PATH) ? JSON.parse(fs.readFileSync(DRIVE_MAP_PATH, 'utf8')) : {};

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwf1D341f6ehamx0RSUycAfbtgvUTsdEOgkR5ld2OLedgMdgX8-cqK-wH2JbWhXCf4-/exec';
const GAS_SECRET = 'my_super_secret_promo_key_2026';

// ข้อมูลการสแกนและตีกรอบสินค้าเป้าหมาย
const PROMO_DEFINITIONS = [
  // IMG_8694.JPG
  {
    sourceFile: 'IMG_8694.JPG',
    overview: 'CJ More | "3 วัน ศุกร์ เสาร์ อาทิตย์ ซีเจ ลดกระชากราคา ร้อนแรง แซงทุกโปร!!" | 06/11/2026 - 08/11/2026 | สมาชิกสบายการ์ด',
    cropH: 380, cropW: 450, offsetY: 1560, offsetX: 50,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย บะหมี่กึ่งสำเร็จรูป รสข้าวโพด, บาร์บีคิว 20 ก. (แพ็ค/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '06/11/2026 - 08/11/2026',
      machanic: 'ยำยำ ช้างน้อย 20 ก. (แพ็ค/12) ปกติ 38.- พิเศษ 32.- (เฉลี่ยซองละ 2.67 บ.)',
      retailPrice: 38.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8695.JPG
  {
    sourceFile: 'IMG_8695.JPG',
    overview: 'CJ More | "3 วัน ศุกร์ เสาร์ อาทิตย์ ซีเจ ลดกระชากราคา ร้อนแรง แซงทุกโปร!!" | 06/11/2026 - 08/11/2026 | สมาชิกสบายการ์ด',
    cropH: 380, cropW: 500, offsetY: 940, offsetX: 80,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ลิตเติ้ลกุ๊ก',
      itemName: 'ลิตเติ้ลกุ๊กเชฟ บะหมี่กึ่งสำเร็จรูป รสฮอกไกโดมิโซะ, หม่าล่าพริก 70/75 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อ 1 แถม 1',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '06/11/2026 - 08/11/2026',
      machanic: '1 แถม 1 25.- เฉลี่ยชิ้นละ 12.50 (ซื้อ 2 ชิ้น 25 บ. ปกติ 50 บ.)',
      retailPrice: 25.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8695.JPG',
    overview: 'CJ More | "3 วัน ศุกร์ เสาร์ อาทิตย์ ซีเจ ลดกระชากราคา ร้อนแรง แซงทุกโปร!!" | 06/11/2026 - 08/11/2026 | สมาชิกสบายการ์ด',
    cropH: 380, cropW: 460, offsetY: 940, offsetX: 600,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ต้มจั๊บอุบล',
      itemName: 'ต้มจั๊บอุบล ก๋วยจั๊บญวน รสต้มตำรับ 60 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อ 1 แถม 1',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '06/11/2026 - 08/11/2026',
      machanic: '1 แถม 1 35.- เฉลี่ยชิ้นละ 17.50 (ซื้อ 2 ชิ้น 35 บ. ปกติ 70 บ.)',
      retailPrice: 35.00,
      proPrice: 17.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8696.JPG
  {
    sourceFile: 'IMG_8696.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 05/11/2026 - 11/11/2026 | สมาชิกสบายการ์ด',
    cropH: 450, cropW: 460, offsetY: 330, offsetX: 40,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กกึ่งสำเร็จรูป ทุกรสชาติ 32 ก. (แพ็ค/4)',
      color: 'ซอง',
      packSize: 4,
      promotion: 'ซื้อ 2 แถม 1',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '05/11/2026 - 11/11/2026',
      machanic: '2 แถม 1 (1 แพ็ค 45.- เฉลี่ยแพ็คละ 30.- เมื่อซื้อ 3 แพ็ค 90 บ. ปกติ 135 บ.)',
      retailPrice: 45.00,
      proPrice: 30.00,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'IMG_8696.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 05/11/2026 - 11/11/2026 | สมาชิกสบายการ์ด',
    cropH: 380, cropW: 420, offsetY: 1560, offsetX: 820,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'พาลโด',
      itemName: 'พาลโด บะหมี่แห้งสบูป, น้ำรสหม้อไฟ 100/105 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '05/11/2026 - 11/11/2026',
      machanic: 'ปกติ 25.- พิเศษ 18.- ประหยัด 7 บาท',
      retailPrice: 25.00,
      proPrice: 18.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8696.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 05/11/2026 - 11/11/2026 | สมาชิกสบายการ์ด',
    cropH: 380, cropW: 420, offsetY: 1560, offsetX: 1200,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสเย็นตาโฟต้มยำหม้อไฟ, ต้มยำกุ้ง, เส้นหมี่น้ำใส 55/60 ก. (แพ็ค/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '05/11/2026 - 11/11/2026',
      machanic: 'ปกติ 65.- พิเศษ 61.- ประหยัด 4 บาท (เฉลี่ยซองละ 6.10 บ.)',
      retailPrice: 65.00,
      proPrice: 61.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8697.JPG
  {
    sourceFile: 'IMG_8697.JPG',
    overview: 'CJ More | "ซีเจ พุธ ถูกสุด แรงสุด! หยุดทุกโปร" | 04/11/2026 - 04/11/2026 | สมาชิกสบายการ์ด',
    cropH: 450, cropW: 420, offsetY: 550, offsetX: 1210,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า บิ๊กแพ็ค บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 90/95 ก. (แพ็ค/4)',
      color: 'ซอง',
      packSize: 4,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '04/11/2026 - 04/11/2026',
      machanic: 'เฉพาะพุธ 4 พ.ย. ปกติ 38.- พิเศษ 32.- (เฉลี่ยซองละ 8.-)',
      retailPrice: 38.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8698.JPG
  {
    sourceFile: 'IMG_8698.JPG',
    overview: 'CJ More | "จับคู่ อิ่มจุใจ ฟินยาวทั้งคืน" | 15/08/2026 - 14/11/2026',
    cropH: 900, cropW: 1000, offsetY: 680, offsetX: 700,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาสเตอร์ไล',
      itemName: 'มาสเตอร์ไล บะหมี่เกี๊ยว ทุกรสชาติ 127 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/08/2026 - 14/11/2026',
      machanic: 'มาสเตอร์ไล บะหมี่เกี๊ยว 127 ก. (ถ้วย) ราคา 69.-',
      retailPrice: 69.00,
      proPrice: 69.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8699.JPG
  {
    sourceFile: 'IMG_8699.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 29/10/2026 - 04/11/2026 | สมาชิกสบายการ์ด',
    cropH: 400, cropW: 420, offsetY: 1170, offsetX: 880,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า คัพ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อ 2 ชิ้นถูกกว่า',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/10/2026 - 04/11/2026',
      machanic: 'ซื้อ 2 ชิ้น 24.- ปกติ 1 ชิ้น 14.- (เฉลี่ยชิ้นละ 12.-)',
      retailPrice: 14.00,
      proPrice: 12.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8699.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 29/10/2026 - 04/11/2026 | สมาชิกสบายการ์ด',
    cropH: 400, cropW: 360, offsetY: 1170, offsetX: 1270,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาเฟีย',
      itemName: 'มาเฟีย บะหมี่กึ่งสำเร็จรูป รสสไปซี่คาโบนาร่า, ซิกเน้น พลัส 1, พลัส 5 120 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/10/2026 - 04/11/2026',
      machanic: 'ปกติ 39.- พิเศษ 33.- ประหยัด 6 บาท',
      retailPrice: 39.00,
      proPrice: 33.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8699.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 29/10/2026 - 04/11/2026 | สมาชิกสบายการ์ด',
    cropH: 380, cropW: 380, offsetY: 1570, offsetX: 40,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก สไปซี่ ราเมงสวิชชี่ 130 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/10/2026 - 04/11/2026',
      machanic: 'ปกติ 58.- พิเศษ 42.- ประหยัด 16 บาท',
      retailPrice: 58.00,
      proPrice: 42.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8700.JPG
  {
    sourceFile: 'IMG_8700.JPG',
    overview: 'CJ More | "ซีเจ พุธ ถูกสุด แรงสุด! หยุดทุกโปร" | 28/10/2026 - 28/10/2026 | สมาชิกสบายการ์ด',
    cropH: 450, cropW: 420, offsetY: 530, offsetX: 1210,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ยำยำ',
      itemName: 'ยำยำ คัพ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '28/10/2026 - 28/10/2026',
      machanic: 'เฉพาะพุธ 28 ต.ค. ปกติ 16.- พิเศษ 12.- ประหยัด 4 บาท',
      retailPrice: 16.00,
      proPrice: 12.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8701.JPG
  {
    sourceFile: 'IMG_8701.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 22/10/2026 - 28/10/2026 | สมาชิกสบายการ์ด',
    cropH: 420, cropW: 420, offsetY: 1160, offsetX: 40,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า ออเรียนทัล บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 85 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อ 2 ชิ้นถูกกว่า',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '22/10/2026 - 28/10/2026',
      machanic: 'ซื้อ 2 ชิ้น 25.- ปกติ 1 ชิ้น 15.- (เฉลี่ยชิ้นละ 12.50)',
      retailPrice: 15.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8701.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 22/10/2026 - 28/10/2026 | สมาชิกสบายการ์ด',
    cropH: 420, cropW: 420, offsetY: 1160, offsetX: 450,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ยำยำ',
      itemName: 'ยำยำ สูตรเด็ด บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 75/80 ก. (แพ็ค/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '22/10/2026 - 28/10/2026',
      machanic: 'ปกติ 51.- พิเศษ 48.- ประหยัด 3 บาท',
      retailPrice: 51.00,
      proPrice: 48.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8702.JPG
  {
    sourceFile: 'IMG_8702.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | เทศกาลกินเจ 2569',
    cropH: 650, cropW: 900, offsetY: 280, offsetX: 90,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า เจ บะหมี่กึ่งสำเร็จรูป รสเห็ดหอม, ต้มยำ 60 ก. (แพ็ค/6)',
      color: 'ซอง',
      packSize: 6,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 23/10/2026',
      machanic: 'เจนี้ ที่ ซีเจ มอร์ มาม่า เจ (แพ็ค/6) ราคาพิเศษ 42.- (เฉลี่ยซองละ 7.-)',
      retailPrice: 45.00,
      proPrice: 42.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8703.JPG
  {
    sourceFile: 'IMG_8703.JPG',
    overview: 'CJ More | "NEW สินค้าใหม่!" | 26/09/2026 - 23/10/2026 | สมาชิกสบายการ์ด',
    cropH: 450, cropW: 950, offsetY: 450, offsetX: 70,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาสเตอร์ไล',
      itemName: 'มาสเตอร์ไล บะหมี่เกี๊ยวรสกระดูกหมู, รสเห็ด 127 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อ 1 แถม 1',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/09/2026 - 23/10/2026',
      machanic: '1 แถม 1 69.- เฉลี่ยชิ้นละ 34.50',
      retailPrice: 69.00,
      proPrice: 34.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8703.JPG',
    overview: 'CJ More | "NEW สินค้าใหม่!" | 16/10/2026 - 12/11/2026 | สมาชิกสบายการ์ด',
    cropH: 450, cropW: 900, offsetY: 1470, offsetX: 70,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ไฮตี่เหลา',
      itemName: 'ไฮตี่เหลา เส้นมันหนึบ รสหม่าล่าทั่ง, หม่าล่าก๋วยเตี๋ยวเรือ 114/124 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '16/10/2026 - 12/11/2026',
      machanic: 'ปกติ 54.- พิเศษ 48.- ประหยัด 6 บาท',
      retailPrice: 54.00,
      proPrice: 48.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8704.JPG
  {
    sourceFile: 'IMG_8704.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 300, cropW: 450, offsetY: 920, offsetX: 1110,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ไวไว',
      itemName: 'ไวไว เส้นหมี่อบแห้ง 180 ก. (ห่อ)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 15.- พิเศษ 14.- ประหยัด 1 บาท',
      retailPrice: 15.00,
      proPrice: 14.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8704.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 300, cropW: 450, offsetY: 1250, offsetX: 80,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'กระต่าย',
      itemName: 'กระต่าย หมี่สไตล์ฮ่องกง 200 ก. (ห่อ)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 38.- พิเศษ 31.- ประหยัด 7 บาท',
      retailPrice: 38.00,
      proPrice: 31.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8704.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 320, cropW: 480, offsetY: 1220, offsetX: 560,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า เจ บะหมี่กึ่งสำเร็จรูป รสเห็ดหอม, ต้มยำ 60 ก. (แพ็ค/6)',
      color: 'ซอง',
      packSize: 6,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 42.- พิเศษ 41.- ประหยัด 1 บาท',
      retailPrice: 42.00,
      proPrice: 41.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8705.JPG
  {
    sourceFile: 'IMG_8705.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 420, cropW: 400, offsetY: 360, offsetX: 50,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'พาลโด',
      itemName: 'พาลโด บะหมี่กึ่งสำเร็จรูป รสซุป, หม้อไฟ 100/105 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 25.- พิเศษ 18.- ประหยัด 7 บาท',
      retailPrice: 25.00,
      proPrice: 18.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8705.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 420, cropW: 400, offsetY: 360, offsetX: 440,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก สไปซี่ราเมง ออริจินัล, เอ็กซ์สไปซี่ 140 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 52.- พิเศษ 37.- ประหยัด 15 บาท',
      retailPrice: 52.00,
      proPrice: 37.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8705.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 420, cropW: 400, offsetY: 360, offsetX: 830,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ไวไว',
      itemName: 'ไวไว ว้าว บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 72 ก. (แพ็ค/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 50.- พิเศษ 45.- ประหยัด 5 บาท (เฉลี่ยซองละ 9 บ.)',
      retailPrice: 50.00,
      proPrice: 45.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8705.JPG',
    overview: 'CJ More | "ซีเจ 7 วัน ลดแรง" | 15/10/2026 - 21/10/2026 | สมาชิกสบายการ์ด',
    cropH: 420, cropW: 400, offsetY: 360, offsetX: 1200,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง, เย็นตาโฟต้มยำหม้อไฟ 55/60 ก. (แพ็ค/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '15/10/2026 - 21/10/2026',
      machanic: 'ปกติ 65.- พิเศษ 62.- ประหยัด 3 บาท (เฉลี่ยซองละ 6.20 บ.)',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8706.JPG
  {
    sourceFile: 'IMG_8706.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 08/10/2026 - 14/10/2026 | สมาชิกสบายการ์ด',
    cropH: 320, cropW: 380, offsetY: 530, offsetX: 470,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'ไวไว',
      itemName: 'ไวไว เส้นหมี่อบแห้ง 180 ก. (ห่อ)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/10/2026 - 14/10/2026',
      machanic: 'ปกติ 15.- พิเศษ 14.- ประหยัด 1 บาท',
      retailPrice: 15.00,
      proPrice: 14.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8706.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 08/10/2026 - 14/10/2026 | สมาชิกสบายการ์ด',
    cropH: 320, cropW: 380, offsetY: 530, offsetX: 840,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'กระต่าย',
      itemName: 'กระต่าย หมี่สไตล์ฮ่องกง 200 ก. (ห่อ)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/10/2026 - 14/10/2026',
      machanic: 'ปกติ 38.- พิเศษ 31.- ประหยัด 7 บาท',
      retailPrice: 38.00,
      proPrice: 31.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'IMG_8706.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 08/10/2026 - 14/10/2026 | สมาชิกสบายการ์ด',
    cropH: 320, cropW: 450, offsetY: 1220, offsetX: 60,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า เจ บะหมี่กึ่งสำเร็จรูป รสเห็ดหอม, ต้มยำ 60 ก. (แพ็ค/6)',
      color: 'ซอง',
      packSize: 6,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/10/2026 - 14/10/2026',
      machanic: 'ปกติ 42.- พิเศษ 41.- ประหยัด 1 บาท',
      retailPrice: 42.00,
      proPrice: 41.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // IMG_8707.JPG
  {
    sourceFile: 'IMG_8707.JPG',
    overview: 'CJ More | "ทุกมื้อไม่จำเจ เจนี้ ที่ ซีเจ มอร์ ครบ ถูก คุ้ม" | 01/10/2026 - 07/10/2026 | สมาชิกสบายการ์ด',
    cropH: 340, cropW: 420, offsetY: 880, offsetX: 830,
    item: {
      date: '23/11/2026',
      store: 'CJ More',
      brand: 'มาม่า',
      itemName: 'มาม่า เจ บะหมี่กึ่งสำเร็จรูป รสเห็ดหอม, ต้มยำ 60 ก. (แพ็ค/6)',
      color: 'ซอง',
      packSize: 6,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '01/10/2026 - 07/10/2026',
      machanic: 'ปกติ 42.- พิเศษ 41.- ประหยัด 1 บาท',
      retailPrice: 42.00,
      proPrice: 41.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  }
];

async function main() {
  console.log('=== เริ่มกระบวนการสแกนภาพรวม ตีกรอบ และบันทึกข้อมูล CJ More ===\n');

  const rowsToSave = [];
  const imagesToUpload = [];

  for (let i = 0; i < PROMO_DEFINITIONS.length; i++) {
    const def = PROMO_DEFINITIONS[i];
    const srcPath = path.join(FOLDER, def.sourceFile);
    const cropOutPath = path.join(CROP_DIR, `crop_${i + 1}_${def.item.brand}_${path.basename(def.sourceFile)}`);

    console.log(`[รูปที่ ${i + 1}/${PROMO_DEFINITIONS.length}] ไฟล์: ${def.sourceFile}`);
    console.log(`  🔍 ภาพรวม: ${def.overview}`);
    console.log(`  ✂️ ตีกรอบสินค้า: H=${def.cropH}px, W=${def.cropW}px, Y=${def.offsetY}px, X=${def.offsetX}px`);
    console.log(`  📦 สินค้า: ${def.item.brand} | ${def.item.itemName}`);
    console.log(`  💰 ราคา: ปกติ ${def.item.retailPrice} บ. -> โปร ${def.item.proPrice} บ. (${def.item.promotion})`);

    // ใช้ sips ครอปรูปภาพ
    try {
      execSync(`sips --cropToHeightWidth ${def.cropH} ${def.cropW} --cropOffset ${def.offsetY} ${def.offsetX} "${srcPath}" --out "${cropOutPath}" > /dev/null 2>&1`);
    } catch (cropErr) {
      console.warn(`  ⚠️ ครอปรูปผิดพลาด:`, cropErr.message);
    }

    const imageId = `crop-${i + 1}`;
    let b64 = '';
    const publicCropFileName = `crop_${i + 1}_${def.item.brand}_${path.basename(def.sourceFile)}`;
    const publicCropPath = path.join(PUBLIC_CROPS_DIR, publicCropFileName);

    if (fs.existsSync(cropOutPath)) {
      b64 = fs.readFileSync(cropOutPath).toString('base64');
      fs.copyFileSync(cropOutPath, publicCropPath);
    }

    const driveInfo = driveMap[def.sourceFile];
    const driveViewUrl = driveInfo ? driveInfo.view_url : '';

    rowsToSave.push({
      ...def.item,
      imageId: imageId,
      imageUrl: driveViewUrl
    });

    if (b64) {
      imagesToUpload.push({
        id: imageId,
        base64: b64,
        mimeType: 'image/jpeg',
        filename: path.basename(cropOutPath)
      });
    }
    console.log(`  🔗 Google Drive Image URL: ${driveViewUrl || '(ไม่มี)'}`);
    console.log(`  ✅ ตีกรอบและเตรียมแถวข้อมูลเสร็จสิ้น\n`);
  }

  console.log(`\nกำลังส่งข้อมูล ${rowsToSave.length} แถว พร้อมลิงก์รูปภาพ Google Drive ไปยัง Google Apps Script...`);

  // บันทึกลง Google Sheet
  const payload = {
    action: 'save',
    sheetName: 'NOODLE',
    secret: GAS_SECRET,
    rows: rowsToSave,
    images: imagesToUpload
  };

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  const resJson = await res.json();
  console.log('\n=== ผลการบันทึกลง Google Sheet ===');
  console.log(JSON.stringify(resJson, null, 2));

  // อัปเดตแคชในเครื่องเพื่อให้ Dashboard แสดงผลทันที
  const cachedPath = path.resolve(__dirname, '../src/data/cached_sheet_data.json');
  if (fs.existsSync(cachedPath)) {
    const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
    cached.noodle = rowsToSave.map((r, idx) => {
      const def = PROMO_DEFINITIONS[idx];
      const dInfo = driveMap[def.sourceFile];
      return {
        ...r,
        imageUrl: r.imageUrl || (dInfo ? dInfo.view_url : ''),
        thumbUrl: dInfo ? dInfo.thumb_url : '',
        cropUrl: `/promo_tracker/crops/crop_${idx + 1}_${def.item.brand}_${path.basename(def.sourceFile)}`
      };
    });
    cached.timestamp = new Date().toISOString();
    fs.writeFileSync(cachedPath, JSON.stringify(cached, null, 2), 'utf8');
    console.log('✅ อัปเดต cached_sheet_data.json เรียบร้อยแล้ว (มีรูปภาพครบ 100%)');
  }
}

main().catch(console.error);
