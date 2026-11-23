const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FOLDER = '/Users/teephobwirachowatin/Pictures/Promo Facebook/Mini BigC/Mini BigC';
const CROP_DIR = '/tmp/minibigc_crops';
if (!fs.existsSync(CROP_DIR)) fs.mkdirSync(CROP_DIR, { recursive: true });

const PUBLIC_CROPS_DIR = path.resolve(__dirname, '../public/crops');
if (!fs.existsSync(PUBLIC_CROPS_DIR)) fs.mkdirSync(PUBLIC_CROPS_DIR, { recursive: true });

const DRIVE_MAP_PATH = path.resolve(__dirname, '../src/data/drive_images_map.json');
const driveMap = fs.existsSync(DRIVE_MAP_PATH) ? JSON.parse(fs.readFileSync(DRIVE_MAP_PATH, 'utf8')) : {};

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwf1D341f6ehamx0RSUycAfbtgvUTsdEOgkR5ld2OLedgMdgX8-cqK-wH2JbWhXCf4-/exec';
const GAS_SECRET = 'my_super_secret_promo_key_2026';

const PROMO_DEFINITIONS = [
  // 1. LINE_ALBUM_..._1.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_1.jpg',
    overview: 'Mini BigC | "Mini BigC ถูก ครบ ได้ของไว ที่มินิ แม่ค้าเขารู้กัน!" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 480, offsetY: 1420, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ไวไว',
      itemName: 'ไวไว ปรุงสำเร็จ, ควิกแสบ บะหมี่กึ่งสำเร็จรูป 55-60 ก. (แพ็ค/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'ไวไว ปรุงสำเร็จ, ควิกแสบ 55-60 ก. (แพ็ค/10) ปกติ 62.- พิเศษ 59.-/แพ็ค (ประหยัด 3 บ.)',
      retailPrice: 62.00,
      proPrice: 59.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 2. LINE_ALBUM_..._2.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_2.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 600, cropW: 550, offsetY: 250, offsetX: 50,
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา ซองแดง 3in1 คู่กับแซนวิช',
      color: 'แดง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'เครื่องดื่ม 3in1 คู่กับแซนวิช ปกติ 31.- ซื้อคู่สุดคุ้ม 26.- (เฉลี่ยชิ้นละ 13 บ.)',
      retailPrice: 31.00,
      proPrice: 26.00,
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_2.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 500, offsetY: 800, offsetX: 600,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กคัพ 32 ก. ทุกรส คู่กับ หมึกกรุบซัมซู 50 ก.',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คนอร์โจ๊กคัพ 32 ก. คู่กับ หมึกกรุบ 50 ก. ปกติ 45.- ซื้อคู่สุดคุ้ม 39.- (ประหยัด 6 บ.)',
      retailPrice: 45.00,
      proPrice: 39.00,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_2.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 350, cropW: 250, offsetY: 1250, offsetX: 1180,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กถ้วย รสหมู, ไก่, กุ้ง 45 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คนอร์ โจ๊กถ้วย 45 ก. ปกติ 28.- เหลือ 25.-/ถ้วย (ประหยัด 3 บ.)',
      retailPrice: 28.00,
      proPrice: 25.00,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_2.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 350, cropW: 230, offsetY: 1250, offsetX: 1380,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า โจ๊กคัพ รสไข่เค็ม, หมูสับ, ต้มยำกุ้ง 45 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'มาม่า โจ๊กคัพ 45 ก. ปกติ 18.- เหลือ 16.-/ถ้วย (ประหยัด 2 บ.)',
      retailPrice: 18.00,
      proPrice: 16.00,
      subCategory: 'โจ๊ก',
    }
  },

  // 3. LINE_ALBUM_..._3.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_3.jpg',
    overview: 'Mini BigC | "Mini BigC ทุกชิ้น 33 บาท ราคาเดียว" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 550, offsetY: 500, offsetX: 950,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก ฮอทชิคเกน, เผ็ดX3, ชีส, คาโบนารา 130-140 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'ซัมยังไก่เผ็ด, เอ็กซ์ตรีมฮอตชิคเกน, ชีส, คาโบนารา 130-140 ก. ปกติ 52.- เหลือ 33.-/ซอง (ประหยัด 19 บ.)',
      retailPrice: 52.00,
      proPrice: 33.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_3.jpg',
    overview: 'Mini BigC | "Mini BigC ทุกชิ้น 33 บาท ราคาเดียว" | วันนี้ - 30 ก.ย. 2569',
    cropH: 350, cropW: 300, offsetY: 1250, offsetX: 980,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า บิ๊กแพ็ค ทุกรสชาติ 95 ก. (แพ็ค/4)',
      color: 'ซอง',
      packSize: 4,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'มาม่าบิ๊กแพ็ค 95 ก. (แพ็ค/4) ปกติ 38.- เหลือ 33.-/แพ็ค (ประหยัด 5 บ.)',
      retailPrice: 38.00,
      proPrice: 33.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 4. LINE_ALBUM_..._4.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_4.jpg',
    overview: 'Mini BigC | "ช้อป Mini BigC หยุดโลก! ลดแรง รับสิ้นเดือน" | 24 ก.ย. 2569 - 04 ต.ค. 2569',
    cropH: 400, cropW: 400, offsetY: 1150, offsetX: 1500,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ไวไว',
      itemName: 'ไวไว ปรุงสำเร็จ, ควิกแสบ 57-60 ก. ทุกรสชาติ (แพ็ค/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '24/09/2026 - 04/10/2026',
      machanic: 'ไวไว ปรุงสำเร็จ, ควิกแสบ 57-60 ก. (แพ็ค/10) ปกติ 62.- เหลือ 56.-/แพ็ค (ประหยัด 6 บ.)',
      retailPrice: 62.00,
      proPrice: 56.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 5. LINE_ALBUM_..._5.jpg (แยกแบรนด์เดี่ยวตามโปรโมชั่นคละได้ 3 เทียร์)
  // --- Tier 1: 2 ชิ้น 12.- ปกติ 7.- เฉลี่ยชิ้นละ 6.- ---
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 480, offsetY: 1080, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง, หมูสับ, เส้นเล็กต้มยำ 55/60 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, รสดี, ควิก, ซือดะ ปกติ 7.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-)',
      retailPrice: 7.00,
      proPrice: 6.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 480, offsetY: 1080, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ไวไว',
      itemName: 'ไวไว บะหมี่กึ่งสำเร็จรูป รสปรุงสำเร็จ 55 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, รสดี, ควิก, ซือดะ ปกติ 7.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-)',
      retailPrice: 7.00,
      proPrice: 6.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 480, offsetY: 1080, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ควิก',
      itemName: 'ควิกแสบ บะหมี่กึ่งสำเร็จรูป รสต้มโคล้ง 60 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, รสดี, ควิก, ซือดะ ปกติ 7.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-)',
      retailPrice: 7.00,
      proPrice: 6.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 480, offsetY: 1080, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'รสดี',
      itemName: 'รสดี บะหมี่กึ่งสำเร็จรูป รสต้มยำหมูมะนาว 60 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, รสดี, ควิก, ซือดะ ปกติ 7.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-)',
      retailPrice: 7.00,
      proPrice: 6.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 480, offsetY: 1080, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ซือดะ',
      itemName: 'ซือดะ บะหมี่กึ่งสำเร็จรูป รสต้มโคล้ง 60 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, รสดี, ควิก, ซือดะ ปกติ 7.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 12.- (เฉลี่ยชิ้นละ 6.-)',
      retailPrice: 7.00,
      proPrice: 6.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // --- Tier 2: 2 ชิ้น 18.- ปกติ 10.- เฉลี่ยชิ้นละ 9.- ---
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 560,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า บิ๊กแพ็ค บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 90/95 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่าบิ๊กแพ็ค, ยำยำสูตรเด็ด, ไวไว WOW, นิสชิน ปกติ 10.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 18.- (เฉลี่ยชิ้นละ 9.-)',
      retailPrice: 10.00,
      proPrice: 9.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 560,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ยำยำ',
      itemName: 'ยำยำ สูตรเด็ด บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 75/80 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่าบิ๊กแพ็ค, ยำยำสูตรเด็ด, ไวไว WOW, นิสชิน ปกติ 10.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 18.- (เฉลี่ยชิ้นละ 9.-)',
      retailPrice: 10.00,
      proPrice: 9.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 560,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ไวไว',
      itemName: 'ไวไว WOW บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 75 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่าบิ๊กแพ็ค, ยำยำสูตรเด็ด, ไวไว WOW, นิสชิน ปกติ 10.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 18.- (เฉลี่ยชิ้นละ 9.-)',
      retailPrice: 10.00,
      proPrice: 9.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 560,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'นิสชิน',
      itemName: 'นิสชิน บะหมี่กึ่งสำเร็จรูป รสไก่เผ็ดเกาหลี 60/75 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่าบิ๊กแพ็ค, ยำยำสูตรเด็ด, ไวไว WOW, นิสชิน ปกติ 10.- ยิ่งซื้อยิ่งถูก 2 ชิ้น 18.- (เฉลี่ยชิ้นละ 9.-)',
      retailPrice: 10.00,
      proPrice: 9.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // --- Tier 3: 2 ถ้วย 25.- ปกติ 14.- เฉลี่ยถ้วยละ 12.50.- ---
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 1080,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า คัพ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, ยำยำ, ควิก คัพ ปกติ 14.- ยิ่งซื้อยิ่งถูก 2 ถ้วย 25.- (เฉลี่ยถ้วยละ 12.50.-)',
      retailPrice: 14.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 1080,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ไวไว',
      itemName: 'ไวไว คัพ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, ยำยำ, ควิก คัพ ปกติ 14.- ยิ่งซื้อยิ่งถูก 2 ถ้วย 25.- (เฉลี่ยถ้วยละ 12.50.-)',
      retailPrice: 14.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 1080,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ยำยำ',
      itemName: 'ยำยำ คัพ บะหมี่กึ่งสำเร็จรูป ทุกรสชาติ 60 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, ยำยำ, ควิก คัพ ปกติ 14.- ยิ่งซื้อยิ่งถูก 2 ถ้วย 25.- (เฉลี่ยถ้วยละ 12.50.-)',
      retailPrice: 14.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_5.jpg',
    overview: 'Mini BigC | "Mix สนุก คละได้ 10 บาท ก็ซื้อได้ ต้องที่ Mini BigC" | วันนี้ - 30 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 1080, offsetX: 1080,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ควิก',
      itemName: 'ควิกแสบ บะหมี่กึ่งสำเร็จรูป คัพ รสต้มโคล้ง 60 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'คละได้ มาม่า, ไวไว, ยำยำ, ควิก คัพ ปกติ 14.- ยิ่งซื้อยิ่งถูก 2 ถ้วย 25.- (เฉลี่ยถ้วยละ 12.50.-)',
      retailPrice: 14.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 6. LINE_ALBUM_..._6.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_6.jpg',
    overview: 'Mini BigC | "Mini BigC โปรเด็ด ประจำสัปดาห์" | 24 ก.ย. 2569 - 30 ก.ย. 2569',
    cropH: 300, cropW: 400, offsetY: 1100, offsetX: 600,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ซีพี',
      itemName: 'ซีพี เส้นมันเกี๊ยวกุ้งหม่าล่า 250 ก., บะหมี่เกี๊ยวกุ้งฮ่องกง, ต้มยำ 235 ก. (แพ็ค)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '24/09/2026 - 30/09/2026',
      machanic: 'ซีพี เส้นมันเกี๊ยวกุ้งหม่าล่า, บะหมี่เกี๊ยวกุ้ง 235-250 ก. ปกติ 69.- เหลือ 59.-/แพ็ค (ประหยัด 10 บ.)',
      retailPrice: 69.00,
      proPrice: 59.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 7. LINE_ALBUM_..._7.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_7.jpg',
    overview: 'Mini BigC | "HELLO พุธ สุดเด็ด ที่ Mini BigC" | 23 ก.ย. 2569',
    cropH: 400, cropW: 450, offsetY: 580, offsetX: 1100,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ไวไว',
      itemName: 'ไวไว ปรุงสำเร็จ บะหมี่กึ่งสำเร็จรูป 57 ก. (แพ็ค/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '23/09/2026',
      machanic: 'ไวไว ปรุงสำเร็จ 57 ก. (แพ็ค/10) ปกติ 62.- พิเศษ 56.-/แพ็ค (ประหยัด 6 บ.)',
      retailPrice: 62.00,
      proPrice: 56.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 8. LINE_ALBUM_..._9.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_9.jpg',
    overview: 'Mini BigC | "Mini BigC I\'M คุ้มเว่อ" | 17 ก.ย. 2569 - 23 ก.ย. 2569',
    cropH: 450, cropW: 450, offsetY: 450, offsetX: 560,
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์ แอนด์ บรู ริชอโรมา แพ็ค 27, โรบัสต้า แพ็ค 30',
      color: 'แดง,เขียว',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '17/09/2026 - 23/09/2026',
      machanic: 'เนสกาแฟ เบลนด์แอนด์บรู ริชอโรมา แพ็ค 27, โรบัสต้า แพ็ค 30 ปกติ 126.- พิเศษ 111.-/แพ็ค (ประหยัด 15 บ.)',
      retailPrice: 126.00,
      proPrice: 111.00,
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_9.jpg',
    overview: 'Mini BigC | "Mini BigC I\'M คุ้มเว่อ" | 17 ก.ย. 2569 - 23 ก.ย. 2569',
    cropH: 300, cropW: 300, offsetY: 1000, offsetX: 880,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ลิตเติ้ลกุ๊ก',
      itemName: 'ลิตเติ้ลกุ๊กเชฟ บะหมี่กึ่งสำเร็จรูป 70-78 ก. ทุกรส (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '17/09/2026 - 23/09/2026',
      machanic: 'ลิตเติ้ลกุ๊ก 70-78 ก. ทุกรส ปกติ 25.- พิเศษ 17.-/ถ้วย (ประหยัด 8 บ.)',
      retailPrice: 25.00,
      proPrice: 17.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_9.jpg',
    overview: 'Mini BigC | "Mini BigC I\'M คุ้มเว่อ" | 17 ก.ย. 2569 - 23 ก.ย. 2569',
    cropH: 350, cropW: 400, offsetY: 1450, offsetX: 1100,
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์ กาแฟ 3in1 ซื้อ 2 แพ็ค ฟรี น้ำตาลมิตรผล 1 กก.',
      color: 'แดง',
      packSize: 27,
      promotion: 'ของแถม',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '17/09/2026 - 23/09/2026',
      machanic: 'ฟรี น้ำตาลมิตรผล 1 กก. มูลค่า 27 บาท เมื่อซื้อกาแฟ 3 in 1 ปรุงสำเร็จรูป 2 แพ็ค',
      retailPrice: 126.00,
      proPrice: 126.00,
    }
  },

  // 9. LINE_ALBUM_..._10.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_10.jpg',
    overview: 'Mini BigC | "Mini BigC คู่ครัว ตัวจริง สะดวกใกล้คุณ" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 400, offsetY: 1500, offsetX: 50,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า ก๋วยเตี๋ยว ทุกรสชาติ 73-79 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'สินค้าใหม่! มาม่า ก๋วยเตี๋ยว 73-79 ก. ปกติ 30.- พิเศษ 28.-/ถ้วย (ประหยัด 2 บ.)',
      retailPrice: 30.00,
      proPrice: 28.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_10.jpg',
    overview: 'Mini BigC | "Mini BigC คู่ครัว ตัวจริง สะดวกใกล้คุณ" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 400, offsetY: 1500, offsetX: 460,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง สวีท บูลดัก สไปซี่ราเมง 130 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'สินค้าใหม่! ซัมยัง สวีท บูลดัก ราเมง 130 ก. ปกติ 58.- พิเศษ 45.-/ซอง (ประหยัด 13 บ.)',
      retailPrice: 58.00,
      proPrice: 45.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_10.jpg',
    overview: 'Mini BigC | "Mini BigC คู่ครัว ตัวจริง สะดวกใกล้คุณ" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 400, offsetY: 1500, offsetX: 860,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ยำยำ',
      itemName: 'ยำยำ เส้นบุกคัพ รสไก่เผ็ด, หม่าล่า 90 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'สินค้าใหม่! ยำยำ เส้นบุกคัพไก่เผ็ด, หม่าล่า 90 ก. ปกติ 20.- พิเศษ 15.-/ถ้วย (ประหยัด 5 บ.)',
      retailPrice: 20.00,
      proPrice: 15.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_10.jpg',
    overview: 'Mini BigC | "Mini BigC คู่ครัว ตัวจริง สะดวกใกล้คุณ" | วันนี้ - 30 ก.ย. 2569',
    cropH: 450, cropW: 400, offsetY: 1500, offsetX: 1260,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ยำยำ',
      itemName: 'ยำยำ SD คัพ สไปซี่ปูซอสโรเซ 75 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 30/09/2026',
      machanic: 'สินค้าใหม่! ยำยำ SD คัพสไปซี่ปูซอสโรเซ 75 ก. ปกติ 25.- พิเศษ 22.-/ถ้วย (ประหยัด 3 บ.)',
      retailPrice: 25.00,
      proPrice: 22.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 10. LINE_ALBUM_..._11.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_11.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | 10 ก.ย. 2569 - 16 ก.ย. 2569',
    cropH: 600, cropW: 550, offsetY: 250, offsetX: 50,
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์ แอนด์ บรู ริช อโรมา ซองแดง 3in1 คู่กับแซนวิช',
      color: 'แดง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '10/09/2026 - 16/09/2026',
      machanic: 'เครื่องดื่ม 3in1 คู่กับแซนวิช ปกติ 31.- ซื้อคู่สุดคุ้ม 26.- (ประหยัด 5 บ.)',
      retailPrice: 31.00,
      proPrice: 26.00,
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_11.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | 10 ก.ย. 2569 - 16 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 800, offsetX: 580,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กถ้วย รสหมู, ไก่, กุ้ง 45 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '10/09/2026 - 16/09/2026',
      machanic: 'คนอร์ โจ๊กถ้วย 45 ก. ปกติ 28.- พิเศษ 25.-/ถ้วย (ประหยัด 3 บ.)',
      retailPrice: 28.00,
      proPrice: 25.00,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_11.jpg',
    overview: 'Mini BigC | "พร้อมลุย ทุกเช้า อร่อยครบจบ ต้องที่ Mini BigC" | 10 ก.ย. 2569 - 16 ก.ย. 2569',
    cropH: 400, cropW: 500, offsetY: 800, offsetX: 1100,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า โจ๊กคัพ รสไข่เค็ม, หมูสับ, ต้มยำกุ้ง 45 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '10/09/2026 - 16/09/2026',
      machanic: 'มาม่า โจ๊กคัพ 45 ก. ปกติ 18.- พิเศษ 16.-/ถ้วย (ประหยัด 2 บ.)',
      retailPrice: 18.00,
      proPrice: 16.00,
      subCategory: 'โจ๊ก',
    }
  },

  // 11. LINE_ALBUM_..._12.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_12.jpg',
    overview: 'Mini BigC | "Mini BigC ดึงราคา ช้อปหยุดโลก แรงจัด! รับสิ้นเดือน" | วันนี้ - 06 ก.ย. 2569',
    cropH: 400, cropW: 450, offsetY: 1100, offsetX: 360,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้งน้ำข้น, หมูสับต้มยำ 60 ก. (แพ็ค/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 06/09/2026',
      machanic: 'มาม่า หมูสับ, ต้มยำกุ้งน้ำข้น, หมูสับต้มยำ 60 ก. (แพ็ค/10) ปกติ 65.- พิเศษ 61.-/แพ็ค (ประหยัด 4 บ.)',
      retailPrice: 65.00,
      proPrice: 61.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_12.jpg',
    overview: 'Mini BigC | "Mini BigC ดึงราคา ช้อปหยุดโลก แรงจัด! รับสิ้นเดือน" | วันนี้ - 06 ก.ย. 2569',
    cropH: 400, cropW: 400, offsetY: 1450, offsetX: 1200,
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'เบอร์ดี้',
      itemName: 'เบอร์ดี้ 3in1 โรบัสต้า, เอสเปรสโซ 15.5-16.5 ก. (แพ็ค/40)',
      color: 'แดง',
      packSize: 40,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: 'วันนี้ - 06/09/2026',
      machanic: 'เบอร์ดี้ 3in1 โรบัสต้า, เอสเปรสโซ แพ็ค 40 ปกติ 150.- พิเศษ 140.-/แพ็ค (ประหยัด 10 บ.)',
      retailPrice: 150.00,
      proPrice: 140.00,
    }
  },

  // 12. LINE_ALBUM_..._13.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_13.jpg',
    overview: 'Mini BigC | "Mini BigC มหกรรม สินค้า ซื้อ 1 แถม 1" | 03 ก.ย. 2569 - 16 ก.ย. 2569',
    cropH: 450, cropW: 350, offsetY: 900, offsetX: 1300,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง เม็พ ราเมง รสเผ็ด 80 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อ 1 แถม 1',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '03/09/2026 - 16/09/2026',
      machanic: 'ซัมยังเม็พ 80 ก. ซื้อ 1 แถม 1 25.- (เฉลี่ยซองละ 12.50 บ.)',
      retailPrice: 25.00,
      proPrice: 12.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 13. LINE_ALBUM_..._14.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_14.jpg',
    overview: 'Mini BigC | "Mini BigC แลกซื้อ สุดคุ้ม เมื่อซื้อสินค้าที่บิ๊กซีมินิ ครบ 79 บาทขึ้นไป" | 27 ส.ค. 2569 - 02 ก.ย. 2569',
    cropH: 350, cropW: 380, offsetY: 1080, offsetX: 820,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กถ้วย ทุกรสชาติ 45 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '27/08/2026 - 02/09/2026',
      machanic: 'คนอร์ โจ๊กถ้วย 45 ก. แลกซื้อ 20.-/ถ้วย ปกติ 28.- (ประหยัด 8 บ.)',
      retailPrice: 28.00,
      proPrice: 20.00,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_14.jpg',
    overview: 'Mini BigC | "Mini BigC แลกซื้อ สุดคุ้ม เมื่อซื้อสินค้าที่บิ๊กซีมินิ ครบ 79 บาทขึ้นไป" | 27 ส.ค. 2569 - 02 ก.ย. 2569',
    cropH: 350, cropW: 380, offsetY: 1350, offsetX: 1220,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง ราเม็ง รสไก่เผ็ด, ไก่เผ็ด X2 140 ก. (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '27/08/2026 - 02/09/2026',
      machanic: 'ซัมยัง ราเม็ง ไก่เผ็ด, ไก่เผ็ด X2 140 ก. แลกซื้อ 33.-/ห่อ ปกติ 52.- (ประหยัด 19 บ.)',
      retailPrice: 52.00,
      proPrice: 33.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 14. LINE_ALBUM_..._15.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาโปรโมชั่นสินค้า mini BigC 07  07  2569_261112_15.jpg',
    overview: 'Mini BigC | "HELLO ศุกร์ เสาร์ อาทิตย์ วันสุดคุ้ม ที่ Mini BigC" | 21 ส.ค. 2569 - 23 ส.ค. 2569',
    cropH: 400, cropW: 450, offsetY: 500, offsetX: 500,
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Mini BigC',
      brand: 'กุ๊งกิ๊ง',
      itemName: 'กุ๊งกิ๊ง วุ้นเส้นน้ำตก, ยำวุ้นเส้นคัพ 52-65 ก. (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อ 1 แถม 1',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/08/2026 - 23/08/2026',
      machanic: 'กุ๊งกิ๊ง วุ้นเส้นน้ำตก, ยำวุ้นเส้นคัพ 52-65 ก. ซื้อ 1 แถม 1 39.- (เฉลี่ยถ้วยละ 19.50 บ.)',
      retailPrice: 39.00,
      proPrice: 19.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  }
];

async function main() {
  console.log('=== เริ่มกระบวนการสแกนภาพรวม ตีกรอบ และบันทึกข้อมูล Mini BigC ===\n');

  const noodleRowsToSave = [];
  const coffeeRowsToSave = [];

  for (let i = 0; i < PROMO_DEFINITIONS.length; i++) {
    const def = PROMO_DEFINITIONS[i];
    const srcPath = path.join(FOLDER, def.sourceFile);
    const publicCropFileName = `crop_bigc_${i + 1}_${def.item.brand}_${path.basename(def.sourceFile)}`;
    const cropOutPath = path.join(CROP_DIR, publicCropFileName);
    const publicCropPath = path.join(PUBLIC_CROPS_DIR, publicCropFileName);

    console.log(`[รายการที่ ${i + 1}/${PROMO_DEFINITIONS.length}] ไฟล์: ${def.sourceFile}`);
    console.log(`  🔍 ภาพรวม: ${def.overview}`);
    console.log(`  ✂️ ตีกรอบสินค้า: H=${def.cropH}px, W=${def.cropW}px, Y=${def.offsetY}px, X=${def.offsetX}px`);
    console.log(`  📦 สินค้า: [${def.categoryTab}] ${def.item.brand} | ${def.item.itemName}`);
    console.log(`  💰 ราคา: ปกติ ${def.item.retailPrice} บ. -> โปร ${def.item.proPrice} บ. (${def.item.promotion})`);

    // ครอปรูปภาพ
    try {
      execSync(`sips --cropToHeightWidth ${def.cropH} ${def.cropW} --cropOffset ${def.offsetY} ${def.offsetX} "${srcPath}" --out "${cropOutPath}" > /dev/null 2>&1`);
      if (fs.existsSync(cropOutPath)) {
        fs.copyFileSync(cropOutPath, publicCropPath);
      }
    } catch (cropErr) {
      console.warn(`  ⚠️ ครอปรูปผิดพลาด:`, cropErr.message);
    }

    const driveInfo = driveMap[def.sourceFile];
    const driveViewUrl = driveInfo ? driveInfo.view_url : '';
    console.log(`  🔗 Google Drive Image URL: ${driveViewUrl || '(ไม่มี)'}`);

    const rowObj = {
      ...def.item,
      imageId: `crop-bigc-${i + 1}`,
      imageUrl: driveViewUrl
    };

    if (def.categoryTab === 'PRT') {
      coffeeRowsToSave.push(rowObj);
    } else {
      noodleRowsToSave.push(rowObj);
    }

    console.log(`  ✅ ตีกรอบและเตรียมแถวข้อมูลเสร็จสิ้น\n`);
  }

  // 1. ส่งข้อมูล NOODLE ไปยัง Google Apps Script
  if (noodleRowsToSave.length > 0) {
    console.log(`\nกำลังส่งข้อมูลบะหมี่/โจ๊ก ${noodleRowsToSave.length} แถว พร้อมลิงก์รูปภาพ ไปยัง Google Apps Script (NOODLE)...`);
    const payloadNoodle = {
      action: 'save',
      sheetName: 'NOODLE',
      secret: GAS_SECRET,
      rows: noodleRowsToSave
    };

    const resNoodle = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payloadNoodle),
      redirect: 'follow'
    });
    const resNoodleJson = await resNoodle.json();
    console.log('ผลการบันทึกแท็บ NOODLE:', JSON.stringify(resNoodleJson, null, 2));
  }

  // 2. ส่งข้อมูล PRT (กาแฟ) ไปยัง Google Apps Script
  if (coffeeRowsToSave.length > 0) {
    console.log(`\nกำลังส่งข้อมูลกาแฟ ${coffeeRowsToSave.length} แถว พร้อมลิงก์รูปภาพ ไปยัง Google Apps Script (PRT)...`);
    const payloadCoffee = {
      action: 'save',
      sheetName: 'PRT',
      secret: GAS_SECRET,
      rows: coffeeRowsToSave
    };

    const resCoffee = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payloadCoffee),
      redirect: 'follow'
    });
    const resCoffeeJson = await resCoffee.json();
    console.log('ผลการบันทึกแท็บ PRT:', JSON.stringify(resCoffeeJson, null, 2));
  }

  // 3. อัปเดตแคชในเครื่อง
  const cachedPath = path.resolve(__dirname, '../src/data/cached_sheet_data.json');
  if (fs.existsSync(cachedPath)) {
    const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));

    // เพิ่มบะหมี่ลงใน cached.noodle
    if (!Array.isArray(cached.noodle)) cached.noodle = [];
    noodleRowsToSave.forEach((r, idx) => {
      const def = PROMO_DEFINITIONS.find(d => d.item.itemName === r.itemName && d.categoryTab === 'NOODLE');
      const dInfo = def ? driveMap[def.sourceFile] : null;
      cached.noodle.push({
        ...r,
        imageUrl: r.imageUrl || (dInfo ? dInfo.view_url : ''),
        thumbUrl: dInfo ? dInfo.thumb_url : '',
        cropUrl: def ? `/promo_tracker/crops/crop_bigc_${PROMO_DEFINITIONS.indexOf(def) + 1}_${def.item.brand}_${path.basename(def.sourceFile)}` : ''
      });
    });

    // เพิ่มกาแฟลงใน cached.prt
    if (!Array.isArray(cached.prt)) cached.prt = [];
    coffeeRowsToSave.forEach((r, idx) => {
      const def = PROMO_DEFINITIONS.find(d => d.item.itemName === r.itemName && d.categoryTab === 'PRT');
      const dInfo = def ? driveMap[def.sourceFile] : null;
      cached.prt.push({
        ...r,
        imageUrl: r.imageUrl || (dInfo ? dInfo.view_url : ''),
        thumbUrl: dInfo ? dInfo.thumb_url : '',
        cropUrl: def ? `/promo_tracker/crops/crop_bigc_${PROMO_DEFINITIONS.indexOf(def) + 1}_${def.item.brand}_${path.basename(def.sourceFile)}` : ''
      });
    });

    cached.timestamp = new Date().toISOString();
    fs.writeFileSync(cachedPath, JSON.stringify(cached, null, 2), 'utf8');
    console.log(`\n✅ อัปเดต cached_sheet_data.json สำเร็จ (NOODLE รวม ${cached.noodle.length} รายการ, PRT รวม ${cached.prt.length} รายการ)`);
  }
}

main().catch(console.error);
