# คู่มือการติดตั้ง Google Apps Script (Backend) สำหรับ Promo Tracker

ไฟล์ `Code.gs` ทำหน้าที่เป็นตัวกลางในการ:
1. รับรูปภาพ แปลงและบันทึกไปยังโฟลเดอร์ Google Drive (แยกโฟลเดอร์ย่อยตามเดือน `yyyy-mm`)
2. กำหนดสิทธิ์รูปภาพให้ทุกคนที่มีลิงก์สามารถดูได้
3. บันทึกข้อมูลโปรโมชั่นลง Google Sheet ในแท็บ `PRT` (คอลัมน์ A–N)
4. ตรวจสอบความถี่ (Freq/Week) และแจ้งเตือนข้อมูลซ้ำ (Check Duplicates)
5. ป้องกันการเขียนชนกันด้วย `LockService`

---

## ขั้นตอนการติดตั้ง (Deployment Steps)

### 1. เปิด Google Sheet ปลายทาง
1. เปิด Google Spreadsheet ที่ต้องการใช้งาน (Spreadsheet ID: `11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4`)
2. ตรวจสอบว่ามีแท็บชื่อ **`PRT`** (ถ้าไม่มี ระบบจะสร้างให้อัตโนมัติ พร้อม Header แถวที่ 1)
3. ไปที่เมนูด้านบน คลิก **ส่วนขยาย (Extensions)** > **Apps Script**

### 2. วางโค้ด Code.gs
1. ในหน้าต่าง Apps Script Editor ลบโค้ดเดิมในไฟล์ `Code.gs` ทั้งหมด
2. คัดลอกเนื้อหาทั้งหมดจากไฟล์ [`apps-script/Code.gs`](./Code.gs) ไปวาง
3. กดปุ่มบันทึก 💾 (Save project)

### 3. เตรียม Google Drive Folder
1. เข้าไปที่ [Google Drive](https://drive.google.com/)
2. สร้างโฟลเดอร์สำหรับเก็บรูป เช่น ตั้งชื่อว่า `Promo_Coffee_Images`
3. เปิดเข้าไปในโฟลเดอร์ แล้วสังเกต URL บน Browser:
   `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
   ส่วนตัวอักษรด้านหลัง `folders/` คือ **FOLDER_ID** ให้คัดลอกเก็บไว้

### 4. ตั้งค่า Script Properties (ค่าความปลอดภัย & ตัวแปร)
1. ในหน้า Apps Script Editor คลิกที่ไอคอนเฟืองด้านซ้าย **การตั้งค่าโครงการ (Project Settings)**
2. เลื่อนลงมาที่หัวข้อ **คุณสมบัติของสคริปต์ (Script Properties)**
3. คลิก **แก้ไขคุณสมบัติของสคริปต์ (Edit script properties)** แล้วกด **เพิ่มคุณสมบัติของสคริปต์ (Add script property)** โดยตั้งค่าดังนี้:

| คุณสมบัติ (Property) | ค่า (Value) | คำอธิบาย |
|---|---|---|
| `SECRET` | *(เช่น `my_super_secret_promo_key_2026`)* | รหัสลับความปลอดภัย ต้องตรงกับ `APPS_SCRIPT_SECRET` ใน `.env` |
| `FOLDER_ID` | *(Folder ID ที่ได้จากข้อ 3)* | โฟลเดอร์ใน Google Drive ที่จะใช้เก็บรูป |
| `SPREADSHEET_ID` | `11dxu9T0GHr6j3qvn2SkhpmpAPyOStQVTjVLHyuiTYy4` | รหัส Sheet ปลายทาง |
| `SHEET_NAME` | `PRT` | ชื่อแท็บใน Google Sheet |

4. กด **บันทึกคุณสมบัติของสคริปต์ (Save script properties)**

### 5. Deploy เป็น Web App
1. คลิกปุ่มสีน้ำเงินด้านขวาบน **ทำให้ใช้งานได้ (Deploy)** > **การทำให้ใช้งานได้ใหม่ (New deployment)**
2. คลิกไอคอนเฟืองข้าง "เลือกประเภท (Select type)" เลือก **เว็บแอป (Web app)**
3. ตั้งค่าการ Deploy:
   - **คำอธิบาย (Description):** `Promo Tracker Webhook v1`
   - **ดำเนินการในรูปแบบ (Execute as):** **ฉัน (Me / <อีเมลของคุณ>)**
   - **ผู้มีสิทธิ์เข้าถึง (Who has access):** **ทุกคน (Anyone)** *(สำคัญมาก เพื่อให้ Next.js สามารถยิง webhook เข้ามาได้)*
4. คลิก **ทำให้ใช้งานได้ (Deploy)**
5. หากระบบขอสิทธิ์ (Authorize Access):
   - คลิก **ตรวจสอบสิทธิ์ (Review permissions)**
   - เลือกบัญชี Google ของคุณ
   - คลิก **ขั้นสูง (Advanced)** > **ไปที่... (Go to Promo Tracker (unsafe))**
   - คลิก **อนุญาต (Allow)**
6. เมื่อ Deploy สำเร็จ ให้คัดลอก **URL เว็บแอป (Web app URL)** (รูปแบบ `https://script.google.com/macros/s/AKfycb.../exec`)

---

## 6. นำค่ามาใส่ใน Next.js (.env)

นำ Web app URL และ Secret มาใส่ในไฟล์ `.env` ของโปรเจกต์ Next.js:

```env
APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycb.../exec"
APPS_SCRIPT_SECRET="my_super_secret_promo_key_2026"
```

