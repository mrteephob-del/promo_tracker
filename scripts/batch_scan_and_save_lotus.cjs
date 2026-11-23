const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const FOLDER = '/Users/teephobwirachowatin/Pictures/Promo Facebook/Lotus Go Fresh/Lotus Go Fresh';
const PUBLIC_CROPS_DIR = path.resolve(__dirname, '../public/crops');
if (!fs.existsSync(PUBLIC_CROPS_DIR)) fs.mkdirSync(PUBLIC_CROPS_DIR, { recursive: true });

const DRIVE_MAP_PATH = path.resolve(__dirname, '../src/data/drive_images_map.json');
const driveMap = fs.existsSync(DRIVE_MAP_PATH) ? JSON.parse(fs.readFileSync(DRIVE_MAP_PATH, 'utf8')) : {};

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwf1D341f6ehamx0RSUycAfbtgvUTsdEOgkR5ld2OLedgMdgX8-cqK-wH2JbWhXCf4-/exec';
const GAS_SECRET = 'my_super_secret_promo_key_2026';

const PROMO_DEFINITIONS = [
  // --- 1. Campaign: 02/07/2026 - 08/07/2026 (ไทยช่วยไทย พลัส+ ซื้อเยอะ ราคาขายส่ง) ---
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_1.jpg',
    overview: 'Lotus Go Fresh | "ไทยช่วยไทย พลัส+ ซื้อเยอะ ราคาขายส่ง เพื่อผู้ประกอบการ สินค้ายกแพ็ก" | 02/07/2026 - 08/07/2026',
    crop: { left: 50, top: 570, width: 250, height: 260 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง ราเมง บูลดัก เผ็ดX2, ออริจินัล 140 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ซัมยัง ราเมง 140 กรัม (แพ็ก/5) ปกติ 239.- พิเศษ 199.-/แพ็ค (ประหยัด 40 บ.)',
      retailPrice: 239.00,
      proPrice: 199.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_1.jpg',
    overview: 'Lotus Go Fresh | "ไทยช่วยไทย พลัส+ ซื้อเยอะ ราคาขายส่ง เพื่อผู้ประกอบการ สินค้ายกแพ็ก" | 02/07/2026 - 08/07/2026',
    crop: { left: 470, top: 550, width: 270, height: 250 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ กาแฟ 3in1 แพ็ก 12, 20, 27 ซอง (รสที่ร่วมรายการ)',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ราคาสมาชิก',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'มอคโคน่า ทรีโอ ราคาทั่วไป 161.- พิเศษราคาสมาชิก 118.-/แพ็ค (ประหยัด 43 บ.)',
      retailPrice: 161.00,
      proPrice: 118.00,
    }
  },

  // 2. LINE_ALBUM_..._2.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_2.jpg',
    overview: 'Lotus Go Fresh | "ไทยช่วยไทย พลัส+ ซื้อเยอะ ราคาขายส่ง" | 02/07/2026 - 08/07/2026',
    crop: { left: 50, top: 570, width: 250, height: 260 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก สไปซี่ ราเมง 140 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ซัมยัง บูลดัก สไปซี่ 140 กรัม (แพ็ก/5) ปกติ 239.- พิเศษ 199.-/แพ็ค',
      retailPrice: 239.00,
      proPrice: 199.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_2.jpg',
    overview: 'Lotus Go Fresh | "ไทยช่วยไทย พลัส+ ซื้อเยอะ ราคาขายส่ง" | 02/07/2026 - 08/07/2026',
    crop: { left: 470, top: 550, width: 270, height: 250 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ 3in1 กาแฟปรุงสำเร็จ 12, 20, 27 ซอง',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ราคาสมาชิก',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'มอคโคน่า ทรีโอ ปกติ 161.- ราคาสมาชิก 118.-/แพ็ค',
      retailPrice: 161.00,
      proPrice: 118.00,
    }
  },

  // 3. LINE_ALBUM_..._3.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_3.jpg',
    overview: 'Lotus Go Fresh | "ไทยช่วยไทย พลัส+ สินค้ายกแพ็ก" | 02/07/2026 - 08/07/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย บะหมี่กึ่งสำเร็จรูป รสข้าวโพด 20 กรัม (แพ็ก/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ยำยำ ช้างน้อย รสข้าวโพด 20 กรัม (แพ็ก/12) ปกติ 35.- พิเศษ 32.-/แพ็ค',
      retailPrice: 35.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 4. LINE_ALBUM_..._4.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_4.jpg',
    overview: 'Lotus Go Fresh | "ไทยช่วยไทย พลัส+ ซื้อคู่สุดคุ้ม" | 02/07/2026 - 08/07/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก ราเมง บะหมี่นำเข้าเกาหลี 130-145 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ซัมยัง บูลดัก ราเมง ปกติ 55.- ยิ่งซื้อยิ่งคุ้ม 2 ชิ้น 75.- (เฉลี่ยชิ้นละ 37.50 บ.)',
      retailPrice: 55.00,
      proPrice: 37.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 5. LINE_ALBUM_..._5.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_5.jpg',
    overview: 'Lotus Go Fresh | "แลกซื้อสุดคุ้ม ที่ โลตัส โก เฟรช" | 02/07/2026 - 08/07/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'คนอร์',
      itemName: 'คนอร์ คัพโจ๊ก รสหมู, ข้าวโพดชีส 28-32 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'คนอร์ คัพโจ๊ก 28-32 กรัม ปกติ 20.- แลกซื้อเพียง 15.-/ถ้วย (ประหยัด 5 บ.)',
      retailPrice: 20.00,
      proPrice: 15.00,
      subCategory: 'โจ๊ก',
    }
  },

  // 6. LINE_ALBUM_..._6.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_6.jpg',
    overview: 'Lotus Go Fresh | "สินค้ายกแพ็ก ลดราคาพิเศษ" | 02/07/2026 - 08/07/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ไวไว',
      itemName: 'ไวไว บะหมี่กึ่งสำเร็จรูป รสหมูสับต้มยำ 60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ไวไว หมูสับต้มยำ 60 กรัม (แพ็ก/10) ปกติ 62.- ลดเหลือ 59.-/แพ็ค',
      retailPrice: 62.00,
      proPrice: 59.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 7. LINE_ALBUM_..._7.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_7.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ตรึงราคาสินค้า ช่วยเหลือคนไทย" | 02/07/2026 - 08/07/2026',
    crop: { left: 260, top: 220, width: 140, height: 160 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก สไปซี่ ราเมน 130-145 กรัม (ทุกรสชาติ)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ซัมยัง บูลดัก ปกติ 49.- ซื้อ 2 ชิ้น 75.- (ตกชิ้นละ 37.50 บ.)',
      retailPrice: 49.00,
      proPrice: 37.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_7.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ตรึงราคาสินค้า ช่วยเหลือคนไทย" | 02/07/2026 - 08/07/2026',
    crop: { left: 90, top: 480, width: 120, height: 150 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์ แอนด์ บรู กาแฟปรุงสำเร็จ 16 กรัม (แพ็ก/27)',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'เนสกาแฟ เบลนด์ แอนด์ บรู 27 ซอง ปกติ 126.- พิเศษ 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // 8. LINE_ALBUM_..._8.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_8.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 02/07/2026 - 08/07/2026',
    crop: { left: 260, top: 220, width: 140, height: 160 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า คัพ รสหมูสับ, ต้มยำกุ้ง, ต้มยำกุ้งน้ำข้น, เป็ดพะโล้ 60 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'มาม่า คัพ ปกติ 26.- ซื้อ 2 ชิ้น 46.- (เฉลี่ยถ้วยละ 23 บ.)',
      retailPrice: 26.00,
      proPrice: 23.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_8.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 02/07/2026 - 08/07/2026',
    crop: { left: 90, top: 480, width: 120, height: 150 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์แอนด์บรู ริชอโรมา, เอสเปรสโซโรสต์ 27 ซอง',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'เนสกาแฟ เบลนด์แอนด์บรู 27 ซอง ปกติ 126.- พิเศษ 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // 9. LINE_ALBUM_..._9.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_9.jpg',
    overview: 'Lotus Go Fresh | "ซื้อ 2 ชิ้นสุดคุ้ม" | 02/07/2026 - 08/07/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก คาโบนาร่า ราเมง 130 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '02/07/2026 - 08/07/2026',
      machanic: 'ซัมยัง บูลดัก คาโบนาร่า ปกติ 55.- ซื้อ 2 ชิ้น 75.- (เฉลี่ยชิ้นละ 37.50 บ.)',
      retailPrice: 55.00,
      proPrice: 37.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // --- 2. Campaign: 21/05/2026 - 24/06/2026 (โรลแบ็ค ตรึงราคาสินค้า ช่วยเหลือคนไทย) ---
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_10.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ตรึงราคาสินค้า ช่วยเหลือคนไทย" | 21/05/2026 - 24/06/2026',
    crop: { left: 280, top: 220, width: 140, height: 160 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก ราเมน (รสที่ร่วมรายการ) 130-145 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 24/06/2026',
      machanic: 'ซัมยัง บูลดัก ปกติ 55.- ซื้อ 2 ชิ้น 75.- (เฉลี่ยชิ้นละ 37.50 บ.)',
      retailPrice: 55.00,
      proPrice: 37.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_10.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ตรึงราคาสินค้า ช่วยเหลือคนไทย" | 21/05/2026 - 24/06/2026',
    crop: { left: 90, top: 480, width: 120, height: 150 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์แอนด์บรู กาแฟปรุงสำเร็จชนิดซอง 27 ซอง',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 24/06/2026',
      machanic: 'เนสกาแฟ เบลนด์แอนด์บรู ปกติ 126.- พิเศษ 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // 11. LINE_ALBUM_..._11.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_11.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ตรึงราคาสินค้า" | 21/05/2026 - 24/06/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก ราเมน บะหมี่นำเข้าจากเกาหลี 130-145 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 24/06/2026',
      machanic: 'ซัมยัง บูลดัก ปกติ 55.-/ชิ้น พิเศษ 2 ชิ้น 75.- (เฉลี่ยชิ้นละ 37.50 บ.)',
      retailPrice: 55.00,
      proPrice: 37.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 12. LINE_ALBUM_..._12.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_12.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ตรึงราคาสินค้า" | 21/05/2026 - 24/06/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ไวไว',
      itemName: 'ไวไว บะหมี่กึ่งสำเร็จรูป รสหมูสับต้มยำ 60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 24/06/2026',
      machanic: 'ไวไว หมูสับต้มยำ 60 ก. (แพ็ก/10) ปกติ 63.- เหลือ 59.-/แพ็ค (ประหยัด 4 บ.)',
      retailPrice: 63.00,
      proPrice: 59.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 14. LINE_ALBUM_..._14.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_14.jpg',
    overview: 'Lotus Go Fresh | "สินค้าประจำสัปดาห์" | 21/05/2026 - 27/05/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ไวไว',
      itemName: 'ไวไว บะหมี่กึ่งสำเร็จรูป รสหมูสับต้มยำ 60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 27/05/2026',
      machanic: 'ไวไว หมูสับต้มยำ 60 กรัม (แพ็ก/10) ปกติ 62.- เหลือ 59.-/แพ็ค',
      retailPrice: 62.00,
      proPrice: 59.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 16. LINE_ALBUM_..._16.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_16.jpg',
    overview: 'Lotus Go Fresh | "แลกซื้อสุดคุ้ม" | 21/05/2026 - 24/06/2026',
    crop: { left: 40, top: 180, width: 560, height: 420 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ คัพเต็มๆ บะหมี่กึ่งสำเร็จรูป 60 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 24/06/2026',
      machanic: 'ยำยำ คัพเต็มๆ 60 กรัม ปกติ 16.- แลกซื้อเพียง 12.-/ถ้วย (ประหยัด 4 บ.)',
      retailPrice: 16.00,
      proPrice: 12.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 18. LINE_ALBUM_..._18.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_18.jpg',
    overview: 'Lotus Go Fresh | "ลดราคาป้ายเหลือง" | 21/05/2026 - 27/05/2026',
    crop: { left: 40, top: 150, width: 560, height: 450 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ไวไว',
      itemName: 'ไวไว บะหมี่กึ่งสำเร็จรูป รสปรุงสำเร็จ 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 27/05/2026',
      machanic: 'ไวไว บะหมี่ปรุงสำเร็จ 55 กรัม (แพ็ก/10) ปกติ 62.- พิเศษ 58.-/แพ็ค',
      retailPrice: 62.00,
      proPrice: 58.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 19. LINE_ALBUM_..._19.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_19.jpg',
    overview: 'Lotus Go Fresh | "ลดราคาป้ายเหลือง" | 21/05/2026 - 27/05/2026',
    crop: { left: 50, top: 180, width: 250, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กกึ่งสำเร็จรูป รสหมู 32-35 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 27/05/2026',
      machanic: 'คนอร์ โจ๊กกึ่งสำเร็จรูป รสหมู 35 กรัม ปกติ 30.- ลดเหลือ 28.-',
      retailPrice: 30.00,
      proPrice: 28.00,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_19.jpg',
    overview: 'Lotus Go Fresh | "ลดราคาป้ายเหลือง" | 21/05/2026 - 27/05/2026',
    crop: { left: 340, top: 180, width: 250, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า คัพ บะหมี่กึ่งสำเร็จรูป 60 กรัม (แพ็ก/3)',
      color: 'ถ้วย/คัพ',
      packSize: 3,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '21/05/2026 - 27/05/2026',
      machanic: 'มาม่า คัพ 60 กรัม (แพ็ก/3 ถ้วย) ปกติ 51.- ลดเหลือ 48.-/แพ็ค',
      retailPrice: 51.00,
      proPrice: 48.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // --- 3. Campaign: 26/02/2026 - 25/03/2026 (คุ้มทุกวัน SALE) ---
  // 20. LINE_ALBUM_..._20.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_20.jpg',
    overview: 'Lotus Go Fresh | "สวัสดีวันพุธ รับส่วนลดสูงสุด 10%" | 26/02/2026 - 25/03/2026',
    crop: { left: 600, top: 400, width: 400, height: 500 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ คัพ บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้งน้ำข้น 60 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'ยำยำ คัพ ปกติ 43.- ซื้อ 2 ชิ้น 77.- (เฉลี่ยชิ้นละ 38.50 บ.)',
      retailPrice: 43.00,
      proPrice: 38.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 21. LINE_ALBUM_..._21.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_21.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 40, top: 150, width: 560, height: 450 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย รสข้าวโพด 20 กรัม (แพ็ก/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'ยำยำ ช้างน้อย ปกติ 35.-/แพ็ค ซื้อ 2 ชิ้น 65.- (เฉลี่ยแพ็คละ 32.50 บ.)',
      retailPrice: 35.00,
      proPrice: 32.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 22. LINE_ALBUM_..._22.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_22.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ สูตรเด็ด สไปซี่ล็อบสเตอร์ 75 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'ยำยำ สูตรเด็ด สไปซี่ล็อบสเตอร์ ปกติ 51.- พิเศษ 48.-/แพ็ค (ประหยัด 3 บ.)',
      retailPrice: 51.00,
      proPrice: 48.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 23. LINE_ALBUM_..._23.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_23.jpg',
    overview: 'Lotus Go Fresh | "แลกซื้อราคาพิเศษ" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'คนอร์',
      itemName: 'คนอร์ คัพโจ๊ก รสข้าวโพดชีส, หมู, กุ้ง-ปูอัด 28-32 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'คนอร์ คัพโจ๊ก ปกติ 20.- แลกซื้อเพียง 15.-/ถ้วย (ประหยัด 5 บ.)',
      retailPrice: 20.00,
      proPrice: 15.00,
      subCategory: 'โจ๊ก',
    }
  },

  // 24. LINE_ALBUM_..._24.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_24.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 400, top: 400, width: 380, height: 400 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ คัพเต็มอิ่ม บะหมี่กึ่งสำเร็จรูป 60 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'ยำยำ คัพเต็มอิ่ม ปกติ 16.- พิเศษ 2 ชิ้น 27.- (ตกชิ้นละ 13.50 บ.)',
      retailPrice: 16.00,
      proPrice: 13.50,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_24.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 40, top: 800, width: 400, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์แอนด์บรู อเมริกาโน่ ไม่มีน้ำตาล 27 ซอง, อเมริกาโน่ 25 ซอง',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'เนสกาแฟ อเมริกาโน่ 25-27 ซอง ปกติ 126.- พิเศษ 116.-/ถุง',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // 25. LINE_ALBUM_..._25.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_25.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ จัมโบ้ รสหมูสับ 60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'ยำยำ จัมโบ้ รสหมูสับ 60 กรัม (แพ็ก/10) ปกติ 60.- พิเศษ 57.-/แพ็ค',
      retailPrice: 60.00,
      proPrice: 57.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 26. LINE_ALBUM_..._26.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_26.jpg',
    overview: 'Lotus Go Fresh | "แลกซื้อสุดคุ้ม" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'คนอร์',
      itemName: 'คนอร์ คัพโจ๊ก ทุกรสชาติ 28-32 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'คนอร์ คัพโจ๊ก ปกติ 20.- แลกซื้อเพียง 15.-/ถ้วย',
      retailPrice: 20.00,
      proPrice: 15.00,
      subCategory: 'โจ๊ก',
    }
  },

  // 27. LINE_ALBUM_..._27.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_27.jpg',
    overview: 'Lotus Go Fresh | "แลกซื้อสุดคุ้ม" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'คนอร์',
      itemName: 'คนอร์ คัพโจ๊ก รสหมู 28-32 กรัม (ถ้วย)',
      color: 'ถ้วย/คัพ',
      packSize: 1,
      promotion: 'แลกซื้อราคาพิเศษ',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'คนอร์ คัพโจ๊ก ปกติ 20.- แลกซื้อ 15.-/ถ้วย',
      retailPrice: 20.00,
      proPrice: 15.00,
      subCategory: 'โจ๊ก',
    }
  },

  // 28. LINE_ALBUM_..._28.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_28.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้ง 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'มาม่า บะหมี่ 55 กรัม (แพ็ก/10) ปกติ 65.- พิเศษ 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 29. LINE_ALBUM_..._29.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_29.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน SALE" | 26/02/2026 - 25/03/2026',
    crop: { left: 80, top: 300, width: 900, height: 700 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้ง 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '26/02/2026 - 25/03/2026',
      machanic: 'มาม่า 55 กรัม (แพ็ก/10) ปกติ 65.- พิเศษ 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // --- 4. Campaign: 29/01/2026 - 25/02/2026 (ลดหนัก ประหยัดจริง) ---
  // 31. LINE_ALBUM_..._31.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_31.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้ง 55-60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มาม่า บะหมี่ 55-60 กรัม (แพ็ก/10) ปกติ 65.- พิเศษ 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 32. LINE_ALBUM_..._32.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_32.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 60, top: 300, width: 840, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย รสข้าวโพด, บาร์บีคิว 20 กรัม (แพ็ก/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ ช้างน้อย ปกติ 35.- พิเศษ 2 ชิ้น 64.- (เฉลี่ยแพ็คละ 32 บ.)',
      retailPrice: 35.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 33. LINE_ALBUM_..._33.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_33.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ สูตรเด็ด สไปซี่ล็อบสเตอร์ 75 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ สูตรเด็ด 75 กรัม (แพ็ก/5) ปกติ 51.- พิเศษ 48.-/แพ็ค',
      retailPrice: 51.00,
      proPrice: 48.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 34. LINE_ALBUM_..._34.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_34.jpg',
    overview: 'Lotus Go Fresh | "เปิดศักราชใหม่ ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 500, top: 400, width: 350, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มาม่า บะหมี่ 55 กรัม (แพ็ก/10) ปกติ 65.- พิเศษ 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_34.jpg',
    overview: 'Lotus Go Fresh | "เปิดศักราชใหม่ ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 830, top: 400, width: 340, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ กาแฟ 3in1 ริชแอนด์สมูท, เอสเปรสโซ่ 15.8 กรัม (แพ็ก/20)',
      color: 'ซอง',
      packSize: 20,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มอคโคน่า ทรีโอ 20 ซอง ปกติ 161.- พิเศษ 143.-/แพ็ค',
      retailPrice: 161.00,
      proPrice: 143.00,
    }
  },

  // 35. LINE_ALBUM_..._35.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_35.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย รสข้าวโพด 20 กรัม (แพ็ก/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ ช้างน้อย ปกติ 35.- ซื้อ 2 ชิ้น 64.- (เฉลี่ยแพ็คละ 32 บ.)',
      retailPrice: 35.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 36. LINE_ALBUM_..._36.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_36.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 450, top: 350, width: 350, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ สูตรเด็ด สไปซี่ล็อบสเตอร์ 75 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ สูตรเด็ด ปกติ 51.- พิเศษ 48.-/แพ็ค',
      retailPrice: 51.00,
      proPrice: 48.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_36.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 820, top: 350, width: 350, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ จัมโบ้ รสหมูสับ 60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ จัมโบ้ 60 กรัม (แพ็ก/10) ปกติ 60.- พิเศษ 57.-/แพ็ค',
      retailPrice: 60.00,
      proPrice: 57.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 37. LINE_ALBUM_..._37.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_37.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 80, top: 300, width: 900, height: 700 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ไวไว',
      itemName: 'ไวไว บะหมี่กึ่งสำเร็จรูป รสปรุงสำเร็จ 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ไวไว บะหมี่ปรุงสำเร็จ 55 กรัม ปกติ 62.- พิเศษ 58.-/แพ็ค',
      retailPrice: 62.00,
      proPrice: 58.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 38. LINE_ALBUM_..._38.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_38.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 450, top: 400, width: 350, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า โอเค บะหมี่กึ่งสำเร็จรูป 85 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มาม่า โอเค 85 กรัม ปกติ 15.- ซื้อ 2 ชิ้น 26.- (เฉลี่ยชิ้นละ 13 บ.)',
      retailPrice: 15.00,
      proPrice: 13.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_38.jpg',
    overview: 'Lotus Go Fresh | "ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 830, top: 400, width: 340, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ กาแฟ 3in1 แพ็ก 20 ซอง',
      color: 'ซอง',
      packSize: 20,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มอคโคน่า ทรีโอ ปกติ 161.- พิเศษ 143.-/แพ็ค',
      retailPrice: 161.00,
      proPrice: 143.00,
    }
  },

  // 39. LINE_ALBUM_..._39.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_39.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 29/01/2026 - 25/02/2026',
    crop: { left: 1240, top: 220, width: 310, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'คนอร์',
      itemName: 'คนอร์ โจ๊กกึ่งสำเร็จรูป 32 กรัม (แพ็ก/4)',
      color: 'ซอง',
      packSize: 4,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'คนอร์ คัพโจ๊ก 32 กรัม (แพ็ก/4) ปกติ 45.- พิเศษ 2 ชิ้น 75.- (เฉลี่ยแพ็คละ 37.50 บ.)',
      retailPrice: 45.00,
      proPrice: 37.50,
      subCategory: 'โจ๊ก',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_39.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 29/01/2026 - 25/02/2026',
    crop: { left: 30, top: 580, width: 320, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย รสข้าวโพด, สาหร่าย, บาร์บีคิว 20 กรัม (แพ็ก/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ ช้างน้อย 20 กรัม (แพ็ก/12) ปกติ 35.- พิเศษ 2 ชิ้น 64.- (เฉลี่ยแพ็คละ 32 บ.)',
      retailPrice: 35.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_39.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 29/01/2026 - 25/02/2026',
    crop: { left: 770, top: 920, width: 380, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ โรบัสต้า กาแฟปรุงสำเร็จ 13 กรัม (แพ็ก/30)',
      color: 'ซอง',
      packSize: 30,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'เนสกาแฟ โรบัสต้า 30 ซอง ปกติ 126.- พิเศษ 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // 40. LINE_ALBUM_..._40.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_40.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 770, top: 700, width: 230, height: 260 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสหมูสับ, ต้มยำกุ้งน้ำข้น 55-60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มาม่า 55-60 กรัม (แพ็ก/10) ปกติ 65.- พิเศษเพียง 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_40.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 1250, top: 700, width: 250, height: 260 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ ริชแอนด์สมูท, เอสเปรสโซ่ 15.8 กรัม (แพ็ก/27)',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มอคโคน่า ทรีโอ ปกติ 161.- พิเศษ 2 ชิ้น 254.- (เฉลี่ยชิ้นละ 127 บ.)',
      retailPrice: 161.00,
      proPrice: 127.00,
    }
  },

  // 41. LINE_ALBUM_..._41.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_41.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 29/01/2026 - 25/02/2026',
    crop: { left: 630, top: 220, width: 300, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ ช้างน้อย รสข้าวโพด, บาร์บีคิว 20 กรัม (แพ็ก/12)',
      color: 'ซอง',
      packSize: 12,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ ช้างน้อย ปกติ 35.- พิเศษ 2 ชิ้น 64.- (เฉลี่ยแพ็คละ 32 บ.)',
      retailPrice: 35.00,
      proPrice: 32.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_41.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 29/01/2026 - 25/02/2026',
    crop: { left: 50, top: 580, width: 300, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ โรบัสต้า กาแฟปรุงสำเร็จ 13 กรัม (แพ็ก/30)',
      color: 'ซอง',
      packSize: 30,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'เนสกาแฟ โรบัสต้า 30 ซอง ปกติ 126.- พิเศษเพียง 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // 42. LINE_ALBUM_..._42.jpg
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_42.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 29/01/2026 - 25/02/2026',
    crop: { left: 80, top: 300, width: 1040, height: 800 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ยำยำ',
      itemName: 'ยำยำ จัมโบ้ รสหมูสับ 60 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'ยำยำ จัมโบ้ รสหมูสับ 60 ก. (แพ็ก/10) ปกติ 60.- พิเศษเพียง 57.-/แพ็ค',
      retailPrice: 60.00,
      proPrice: 57.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },

  // 43. LINE_ALBUM_..._43.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_43.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 1100, top: 880, width: 350, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'มาม่า ต้มยำกุ้ง 55 กรัม (แพ็ก/10) ปกติ 65.- พิเศษ 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_43.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ลดหนัก ประหยัดจริง" | 29/01/2026 - 25/02/2026',
    crop: { left: 350, top: 1250, width: 300, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์แอนด์บรู เอสเปรสโซ่ 17 กรัม (แพ็ก/27)',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '29/01/2026 - 25/02/2026',
      machanic: 'เนสกาแฟ เอสเปรสโซ่ 27 ซอง ปกติ 126.- พิเศษ 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  },

  // --- 5. Campaign: 08/01/2026 - 28/01/2026 (เปิดศักราชใหม่ ลดหนัก ประหยัดจริง) ---
  // 44. LINE_ALBUM_..._44.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_44.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 08/01/2026 - 28/01/2026',
    crop: { left: 1240, top: 220, width: 300, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'ซัมยัง',
      itemName: 'ซัมยัง บูลดัก ราเมง สไปซี่, ชีส, ฮอตชิคเก้น 140 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'ซัมยัง บูลดัก 140 กรัม (แพ็ก/5) ปกติ 239.- พิเศษเพียง 189.-/แพ็ค (ประหยัด 50 บ.)',
      retailPrice: 239.00,
      proPrice: 189.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_44.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 08/01/2026 - 28/01/2026',
    crop: { left: 50, top: 580, width: 300, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'นิสชิน',
      itemName: 'นิสชิน บะหมี่กึ่งสำเร็จรูป 60-73 กรัม (แพ็ก/5)',
      color: 'ซอง',
      packSize: 5,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'นิสชิน บะหมี่กึ่งสำเร็จรูป 60-73 กรัม ปกติ 50.- พิเศษเพียง 43.-/แพ็ค',
      retailPrice: 50.00,
      proPrice: 43.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_44.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 08/01/2026 - 28/01/2026',
    crop: { left: 930, top: 920, width: 300, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ กาแฟ 3in1 12-17 กรัม (แพ็ก/20)',
      color: 'ซอง',
      packSize: 20,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'มอคโคน่า กาแฟ 3in1 20 ซอง ปกติ 161.- พิเศษเพียง 143.-/แพ็ค',
      retailPrice: 161.00,
      proPrice: 143.00,
    }
  },

  // 45. LINE_ALBUM_..._45.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_45.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 08/01/2026 - 28/01/2026',
    crop: { left: 630, top: 220, width: 300, height: 350 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า โอเค บะหมี่กึ่งสำเร็จรูป 85 กรัม (ซอง)',
      color: 'ซอง',
      packSize: 1,
      promotion: 'ซื้อคู่ / 2 ชิ้น',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'มาม่า โอเค 85 กรัม ปกติ 15.- พิเศษ 2 ชิ้น 26.- (เฉลี่ยชิ้นละ 13 บ.)',
      retailPrice: 15.00,
      proPrice: 13.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_45.jpg',
    overview: 'Lotus Go Fresh | "คุ้มทุกวัน ประหยัดทุกวัน" | 08/01/2026 - 28/01/2026',
    crop: { left: 1240, top: 220, width: 300, height: 350 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มอคโคน่า',
      itemName: 'มอคโคน่า ทรีโอ กาแฟ 3in1 เอสเปรสโซ, ริชแอนด์สมูท 15.8 กรัม (แพ็ก/20)',
      color: 'ซอง',
      packSize: 20,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'มอคโคน่า ทรีโอ 20 ซอง ปกติ 161.- พิเศษเพียง 143.-/แพ็ค',
      retailPrice: 161.00,
      proPrice: 143.00,
    }
  },

  // 46. LINE_ALBUM_..._46.jpg (Catalog page)
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_46.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ลดหนัก ประหยัดจริง" | 08/01/2026 - 28/01/2026',
    crop: { left: 540, top: 700, width: 230, height: 260 },
    categoryTab: 'NOODLE',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'มาม่า',
      itemName: 'มาม่า บะหมี่กึ่งสำเร็จรูป 55 กรัม (แพ็ก/10)',
      color: 'ซอง',
      packSize: 10,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'มาม่า บะหมี่ 55 กรัม (แพ็ก/10) ปกติ 65.- พิเศษเพียง 62.-/แพ็ค',
      retailPrice: 65.00,
      proPrice: 62.00,
      subCategory: 'บะหมี่กึ่งสำเร็จรูป',
    }
  },
  {
    sourceFile: 'LINE_ALBUM_สำรวจราคาสินค้า Lotus go fresh 07  07 2569_261112_46.jpg',
    overview: 'Lotus Go Fresh | "โรลแบ็ค ลดหนัก ประหยัดจริง" | 08/01/2026 - 28/01/2026',
    crop: { left: 1000, top: 700, width: 250, height: 260 },
    categoryTab: 'PRT',
    item: {
      date: '23/11/2026',
      store: 'Lotus Go Fresh',
      brand: 'เนสกาแฟ',
      itemName: 'เนสกาแฟ เบลนด์แอนด์บรู, อเมริกาโน่, ลาเต้ ชนิดซอง (แพ็ก/27)',
      color: 'ซอง',
      packSize: 27,
      promotion: 'ลดราคา',
      channel: 'Facebook',
      freqWeek: 1,
      freqMonth: 1,
      period: '08/01/2026 - 28/01/2026',
      machanic: 'เนสกาแฟ เบลนด์แอนด์บรู 27 ซอง ปกติ 126.- พิเศษเพียง 116.-/แพ็ค',
      retailPrice: 126.00,
      proPrice: 116.00,
    }
  }
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 เริ่มการประมวลผลโปรโมชั่น Lotus Go Fresh (${PROMO_DEFINITIONS.length} รายการ)`);
  console.log(`======================================================\n`);

  const noodleRowsToSave = [];
  const coffeeRowsToSave = [];

  for (let i = 0; i < PROMO_DEFINITIONS.length; i++) {
    const def = PROMO_DEFINITIONS[i];
    const srcPath = path.join(FOLDER, def.sourceFile);
    const driveInfo = driveMap[def.sourceFile];
    const driveViewUrl = driveInfo ? driveInfo.view_url : '';

    console.log(`[${i + 1}/${PROMO_DEFINITIONS.length}] 📷 ${def.sourceFile} (${def.categoryTab})`);
    console.log(`  🔍 ภาพรวม: ${def.overview}`);
    console.log(`  🏷️ สินค้า: [${def.item.brand}] ${def.item.itemName}`);
    console.log(`  💰 ราคา: ปกติ ${def.item.retailPrice}.- -> โปร ${def.item.proPrice}.- (${def.item.promotion})`);

    // Crop Image
    const cropFilename = `crop_lotus_${i + 1}_${def.item.brand}_${path.basename(def.sourceFile)}`;
    const cropPublicPath = path.join(PUBLIC_CROPS_DIR, cropFilename);

    if (fs.existsSync(srcPath)) {
      try {
        await sharp(srcPath)
          .extract({
            left: Math.max(0, def.crop.left),
            top: Math.max(0, def.crop.top),
            width: def.crop.width,
            height: def.crop.height
          })
          .jpeg({ quality: 90 })
          .toFile(cropPublicPath);
        console.log(`  ✂️ ตีกรอบสินค้าสำเร็จ: ${cropFilename}`);
      } catch (err) {
        console.error(`  ⚠️ การตีกรอบด้วย sharp ล้มเหลว: ${err.message}, ลอง sips...`);
        try {
          execSync(`sips -c ${def.crop.height} ${def.crop.width} "${srcPath}" --out "${cropPublicPath}" > /dev/null 2>&1`);
        } catch (e2) {}
      }
    }

    const rowObj = {
      ...def.item,
      imageId: `crop-lotus-${i + 1}`,
      imageUrl: driveViewUrl
    };

    if (def.categoryTab === 'PRT') {
      coffeeRowsToSave.push(rowObj);
    } else {
      noodleRowsToSave.push(rowObj);
    }

    console.log(`  ✅ บันทึกเสร็จสมบูรณ์\n`);
  }

  // 1. ส่งข้อมูล NOODLE ไปยัง Google Apps Script
  if (noodleRowsToSave.length > 0) {
    console.log(`\nกำลังส่งข้อมูลบะหมี่/โจ๊ก Lotus Go Fresh ${noodleRowsToSave.length} แถว พร้อมลิงก์รูปภาพ ไปยัง Google Apps Script (NOODLE)...`);
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
    console.log(`\nกำลังส่งข้อมูลกาแฟ Lotus Go Fresh ${coffeeRowsToSave.length} แถว พร้อมลิงก์รูปภาพ ไปยัง Google Apps Script (PRT)...`);
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

    if (!Array.isArray(cached.noodle)) cached.noodle = [];
    noodleRowsToSave.forEach((r) => {
      const def = PROMO_DEFINITIONS.find(d => d.item.itemName === r.itemName && d.categoryTab === 'NOODLE' && d.item.period === r.period);
      const dInfo = def ? driveMap[def.sourceFile] : null;
      cached.noodle.push({
        ...r,
        imageUrl: r.imageUrl || (dInfo ? dInfo.view_url : ''),
        thumbUrl: dInfo ? dInfo.thumb_url : '',
        cropUrl: def ? `/promo_tracker/crops/crop_lotus_${PROMO_DEFINITIONS.indexOf(def) + 1}_${def.item.brand}_${path.basename(def.sourceFile)}` : ''
      });
    });

    if (!Array.isArray(cached.prt)) cached.prt = [];
    coffeeRowsToSave.forEach((r) => {
      const def = PROMO_DEFINITIONS.find(d => d.item.itemName === r.itemName && d.categoryTab === 'PRT' && d.item.period === r.period);
      const dInfo = def ? driveMap[def.sourceFile] : null;
      cached.prt.push({
        ...r,
        imageUrl: r.imageUrl || (dInfo ? dInfo.view_url : ''),
        thumbUrl: dInfo ? dInfo.thumb_url : '',
        cropUrl: def ? `/promo_tracker/crops/crop_lotus_${PROMO_DEFINITIONS.indexOf(def) + 1}_${def.item.brand}_${path.basename(def.sourceFile)}` : ''
      });
    });

    cached.timestamp = new Date().toISOString();
    fs.writeFileSync(cachedPath, JSON.stringify(cached, null, 2), 'utf8');
    console.log(`\n✅ อัปเดต cached_sheet_data.json สำเร็จ (NOODLE รวม ${cached.noodle.length} รายการ, PRT รวม ${cached.prt.length} รายการ)`);
  }
}

main().catch(console.error);
