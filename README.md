# Promo Tracker ☕📊

**Promo Tracker** คือ Web Application ภาษาไทยแบบ Mobile-First สำหรับอ่านรูปภาพโปรโมชั่นกาแฟซอง สกัดข้อมูลด้วย AI (Google Gemini 2.5 Flash) และบันทึกลง Google Sheet พร้อมอัปโหลดรูปภาพเก็บใน Google Drive โดยอัตโนมัติ

---

## 📌 คุณสมบัติเด่น (Features)

1. **Mobile-First Experience (ภาษาไทย 100%):** ออกแบบเพื่อการใช้งานบนสมาร์ทโฟนเป็นหลัก ถ่ายรูปจากกล้องมือถือหรือเลือกจากคลังภาพได้สะดวก
2. **Client-side Image Optimization:** บีบอัดรูปภาพฝั่งเบราว์เซอร์อัตโนมัติ (ด้านยาวสุดไม่เกิน 1600px, JPEG คุณภาพ 0.85) ช่วยประหยัดเน็ตและวิเคราะห์ได้เร็ว
3. **AI Vision Extraction (Gemini 2.5 Flash):**
   - แยกข้อมูลเฉพาะ 4 แบรนด์ที่ติดตาม: **เนสกาแฟ, มอคโคน่า, เบอร์ดี้, ซุปเปอร์**
   - รองรับการตรวจจับสีซอง: **แดง, เขียว, หรือ แดง,เขียว**
   - ตรวจจับร้านค้า: 7-11, CJ More, Mini BigC, Lotus, Top
   - แปลง พ.ศ. เป็น ค.ศ. อัตโนมัติ (เช่น 2569 เป็น 2026)
   - คำนวณราคาปกติหากระบุเฉพาะ "ประหยัด X บาท"
   - Server-side Zod Schema Validation พร้อม Auto-retry 1 ครั้ง
4. **หน้าตรวจสอบและแก้ไขข้อมูล (Review & Verification):**
   - แสดงรูปต้นฉบับคู่กับการ์ดข้อมูล สามารถกดดูรูปขยาย (Zoom Modal) ได้
   - ช่องที่ AI ไม่มั่นใจ (Confidence ต่ำ) หรือว่าง จะไฮไลต์สีเหลือง
   - คำนวณส่วนลด (บาท), % ส่วนลด, และราคาต่อซอง ปกติ/โปร อัตโนมัติ
   - แจ้งเตือนสินค้าที่ไม่ใช่ 4 แบรนด์หลัก และไม่เลือกบันทึกเป็นค่าเริ่มต้น
   - ตรวจจับและแจ้งเตือน "ข้อมูลอาจซ้ำ" เทียบกับข้อมูลที่มีอยู่ใน Sheet
5. **Google Apps Script & Drive Integration:**
   - บันทึกรูปลง Google Drive แยกโฟลเดอร์ตามเดือน `yyyy-mm` พร้อมตั้งสิทธิ์ดูได้ทุกคนที่มีลิงก์
   - เขียนข้อมูลลงแท็บ `PRT` คอลัมน์ A–N ตามรูปแบบที่กำหนด
   - คอลัมน์ N สร้างเป็นสูตร `=HYPERLINK("<ลิงก์รูป Drive>","ดูรูป")`
   - ป้องกัน Concurrency Conflict ด้วย `LockService`
6. **หน้าประวัติโปรโมชั่น & Matrix สรุปรายสัปดาห์ (`/history`):**
   - ดึงข้อมูล 50 รายการล่าสุด
   - กรองตามร้านค้า, แบรนด์, หรือสัปดาห์
   - ตาราง Matrix สรุปจำนวนโปรโมชั่นในสัปดาห์ปัจจุบัน (ร้านค้า x แบรนด์)
7. **ระบบความปลอดภัย (Security):**
   - ล็อกอินด้วยรหัสผ่าน (`APP_PASSWORD`) เก็บ Session ปลอดภัยใน HTTP-Only Cookie
   - ซ่อน `GEMINI_API_KEY` และ `APPS_SCRIPT_SECRET` ไว้ที่ Server เท่านั้น

---

## 🛠️ Tech Stack

- **Frontend & Fullstack:** Next.js (App Router) + TypeScript + Tailwind CSS
- **AI Vision:** Google Gemini API (`gemini-2.5-flash`) ผ่าน `@google/genai`
- **Validation:** Zod
- **Backend Bridge:** Google Apps Script Web App (`Code.gs`)
- **Storage & Database:** Google Drive + Google Sheet (แท็บ `PRT`)
- **Testing:** Vitest

---

## 📋 คอลัมน์ Google Sheet (แท็บ PRT)

| คอลัมน์ | ชื่อคอลัมน์ | รายละเอียด |
|---|---|---|
| A | Date | วันที่บันทึก รูปแบบ `dd/mm/yyyy` (ปี ค.ศ.) |
| B | Store | ร้านค้า (7-11, CJ More, Mini BigC, Lotus, Top) |
| C | Brand | เนสกาแฟ / มอคโคน่า / เบอร์ดี้ / ซุปเปอร์ |
| D | Item Name | ชื่อสินค้าเต็มตามที่เห็นในรูป |
| E | Color | แดง / เขียว / แดง,เขียว |
| F | Pack Size | จำนวนซองต่อแพ็ค (ตัวเลขอย่างเดียว เช่น 40 ไม่รวมซองแถม) |
| G | Promotion | ประเภทโปรโมชั่น (ลดราคา, ซื้อ X แถม Y, ของแถม, ฯลฯ) |
| H | Channel | ช่องทาง (Facebook, LINE OA, TikTok, หน้าร้าน, อื่นๆ) |
| I | Freq/Week | ความถี่โปรโมชั่นของ ร้านเดียวกัน + แบรนด์เดียวกัน ในสัปดาห์นั้น |
| J | Period | ช่วงโปร รูปแบบ `dd/mm/yyyy - dd/mm/yyyy` |
| K | Machanic | รายละเอียดกลไกโปรแบบเต็ม ภาษาไทย |
| L | Retail Price | ราคาปกติ ทศนิยม 2 ตำแหน่ง (เช่น 176.00) |
| M | Pro Price | ราคาโปร ทศนิยม 2 ตำแหน่ง (เช่น 155.00) |
| N | Image | สูตร `=HYPERLINK("<url>","ดูรูป")` |

---

## 🚀 เริ่มต้นใช้งานในเครื่อง (Local Setup)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env.local`:
```bash
cp .env.example .env.local
```

กรอกค่าตัวแปรใน `.env.local`:
```env
GEMINI_API_KEY="your-gemini-api-key"
APPS_SCRIPT_URL="https://script.google.com/macros/s/your-deployment-id/exec"
APPS_SCRIPT_SECRET="your-apps-script-secret-key"
APP_PASSWORD="your-secure-password"
```

### 3. รัน Unit Tests
```bash
npm test
```

### 4. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## ☁️ การติดตั้ง Google Apps Script

ดูคู่มือและขั้นตอนการ Deploy อย่างละเอียดที่ [apps-script/README.md](./apps-script/README.md)

สรุปขั้นตอน:
1. เปิด Google Sheet (Spreadsheet ID: `11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4`)
2. ไปที่ **ส่วนขยาย (Extensions)** > **Apps Script**
3. วางโค้ดจาก [`apps-script/Code.gs`](./apps-script/Code.gs)
4. ตั้งค่า **Script Properties**: `SECRET`, `FOLDER_ID`, `SPREADSHEET_ID`, `SHEET_NAME`
5. กด **Deploy > New deployment** เลือก Web App (Execute as: **Me**, Who has access: **Anyone**)
6. คัดลอก URL ที่ได้มาใส่ใน `APPS_SCRIPT_URL`

---

## 🌐 การ Deploy บน Vercel

1. Push โค้ดขึ้น GitHub / GitLab
2. Import โปรเจกต์เข้า [Vercel](https://vercel.com/)
3. ในหน้าตั้งค่า Environment Variables ให้เพิ่มค่า:
   - `GEMINI_API_KEY`
   - `APPS_SCRIPT_URL`
   - `APPS_SCRIPT_SECRET`
   - `APP_PASSWORD`
4. กด **Deploy** แล้วเริ่มใช้งานได้ทันที

