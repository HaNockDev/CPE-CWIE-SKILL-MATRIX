---
title: PSRU Exam
emoji: 📝
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# ระบบสอบออนไลน์ PSRU (วัดความพร้อมก่อนสหกิจ)

Web application สำหรับจัดสอบออนไลน์ เก็บข้อมูลด้วย **SQLite** และ deploy ได้ทั้ง **Hugging Face Spaces** และ **Vercel**
หน้าจอสร้างตามงานออกแบบใน `project/` (Claude Design handoff: `ExamStudent`, `ExamAdmin`, `SpiderChart`, `ResultCard`)

| ส่วน | URL | เนื้อหา |
|---|---|---|
| นักศึกษา | `/` | S1 เข้าสู่ระบบ → S2 ยืนยันก่อนสอบ → S3 ทำข้อสอบ (มือถือ/เดสก์ท็อป) → S4 ส่งแล้ว → S5 ผลสอบ + การ์ดผลสอบ PNG |
| ผู้ดูแล | `/admin` | A1 รอบสอบ (รหัสสอบ, นำเข้ารายชื่อ CSV/XLSX, เตรียมชุดข้อสอบ) · A2 คลังข้อสอบ (รูปภาพ, นำเข้า/ส่งออก JSON/CSV) · A3 ผลสอบ (เผยแพร่, CSV, รายละเอียดรายคน, ตรวจเลขอ้างอิง) |
| สาธารณะ | `/verify?ref=…` | หน้าตรวจเลขอ้างอิง (ปลายทางของ QR code บนการ์ดผลสอบ) |

## โครงสร้าง

```
server/   Express API + SQLite (libSQL)   app.js = routes, db.js = schema, logic.js = สุ่มข้อ/คิดคะแนน
api/      ทางเข้า serverless ของ Vercel
public/   หน้าเว็บ (Preact + htm ไม่ต้อง build)   css/app.css = design tokens จากงานออกแบบ
project/  ไฟล์ออกแบบต้นฉบับจาก Claude Design
```

- **ฐานข้อมูล**: ตาราง `groups`, `courses` (รายวิชาสำหรับติด tag), `questions` (มีคอลัมน์ `tags`), `rounds`, `roster`, `attempts`, `events`, `results`, `email_outbox`, `settings` (สร้างอัตโนมัติเมื่อเริ่มระบบ)
- **tag รายวิชา**: ติดได้หลายวิชาต่อข้อในหน้าแก้ไขข้อสอบ หรือเลือกหลายข้อแล้วติด/เอาออกพร้อมกันในคลังข้อสอบ · เพิ่ม แก้ชื่อ เรียงลำดับ ลบรายวิชาได้ที่ปุ่ม “จัดการรายวิชา” · รายวิชาเริ่มต้น 11 วิชาอยู่ใน `server/seed.js` (`DEFAULT_COURSES`) ฐานข้อมูลเดิมได้ตารางและคอลัมน์ใหม่อัตโนมัติตอนเริ่มระบบ
- **Dashboard ภาพรวมรอบสอบ** (แท็บผลสอบ → “ภาพรวม”): ข้อสังเกตสำคัญที่สรุปอัตโนมัติ, ตัวเลขสรุป, สถานะผู้สอบ, การกระจายคะแนน, ระดับรายกลุ่มวิชา, เวลาที่ใช้, การออกนอกหน้าจอ, รายวิชาที่ควรเสริม, เทียบกับรอบอื่น และ**วิเคราะห์ข้อสอบรายข้อ** (ค่าความยาก p, อำนาจจำแนก D จากกลุ่มสูง/ต่ำ 27%, ส่งออก CSV) · เกณฑ์อยู่ที่ `ITEM` ใน `server/logic.js` · ปุ่ม “ส่งออก PDF” เปิดหน้าพิมพ์รูปแบบรายงาน A4 (เลือกปลายทาง “บันทึกเป็น PDF”)
- **รายงานรายวิชา**: แท็บผลสอบ → “รายวิชา (tag)” แสดง % ตอบถูกต่อรายวิชาจากผู้ที่ส่งแล้ว (ข้อที่มีหลาย tag นับให้ทุกวิชา) และหน้ารายละเอียดรายคนมีผลรายวิชาประกอบ ไม่แสดงบนการ์ดผลสอบของนักศึกษา
- **การสุ่ม**: แต่ละคนได้ชุดข้อสอบสุ่มจากแต่ละกลุ่มวิชาตามจำนวนที่กำหนด และลำดับตัวเลือกสลับเฉพาะบุคคล
- **เวลา**: นับจากเซิร์ฟเวอร์ (`deadline = เริ่มสอบ + เวลาทำข้อสอบ` แต่ไม่เกินเวลาปิดรอบ) เกินเวลาแล้วระบบส่งให้อัตโนมัติ
- **ออกนอกหน้าจอ**: บันทึกทุกครั้ง (ชนิด + เวลา + ระยะเวลา) เกินจำนวนที่กำหนด ระบบส่งข้อสอบอัตโนมัติ
- **คะแนน**: ต่อกลุ่ม = ตอบถูก/ทั้งหมด × 5 (ทศนิยม 1 ตำแหน่ง), ระดับ 1–5 = ปัดเศษคะแนน ข้อหลายคำตอบต้องเลือกครบและไม่เกิน
  > เกณฑ์ระดับนี้เป็นตัวแทนตามไฟล์ออกแบบ หาก `SPEC.md` กำหนดเกณฑ์อื่น แก้ที่ `server/logic.js` (`score5`, `level`)

## รันบนเครื่อง

```bash
npm install
npm start            # http://localhost:3000   (ADMIN_PASSWORD ค่าเริ่มต้น = admin1234)
npm test
```

ฐานข้อมูลใหม่จะมีข้อสอบตัวอย่าง 9 ข้อ และ **รอบทดลอง** รหัสสอบ `K7PQ-3MXA`
ผู้สอบตัวอย่าง: อีเมล `6512345678@psru.ac.th` รหัส `6512345678` (ปิดได้ด้วย `SEED_DEMO=0`)

## Deploy บน Hugging Face Spaces (แนะนำสำหรับ SQLite ไฟล์)

1. สร้าง Space ใหม่ เลือก **SDK: Docker** (ไฟล์ `README.md` นี้มี front-matter `sdk: docker`, `app_port: 7860` แล้ว)
2. push โค้ดนี้ขึ้น Space repo
3. **Settings → Persistent storage** เปิดใช้งาน (ระบบจะเก็บฐานข้อมูลที่ `/data/exam.db` อัตโนมัติ ถ้าไม่เปิด ข้อมูลหายเมื่อ Space รีสตาร์ต)
4. **Settings → Variables and secrets** ตั้ง `ADMIN_PASSWORD`, `APP_SECRET` (และ `SMTP_*` ถ้าต้องการส่งอีเมล)

## Deploy บน Vercel

Vercel เป็น serverless ไฟล์ระบบเขียนถาวรไม่ได้ จึงใช้ **Turso** (libSQL ซึ่งเป็น SQLite บนคลาวด์ ใช้ SQL ชุดเดียวกัน)

1. สร้างฐานข้อมูล: `turso db create psru-exam` → `turso db show psru-exam --url` และ `turso db tokens create psru-exam`
2. Import repo นี้ใน Vercel (Framework preset: **Other**) — `vercel.json` ตั้งค่า output = `public/` และ API = `api/index.js` ไว้แล้ว
3. ตั้ง Environment Variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`, `APP_SECRET`
4. ข้อจำกัด: request body ของ Vercel ไม่เกิน ~4.5 MB (นำเข้า JSON ที่มีรูปจำนวนมากให้แบ่งไฟล์)

ถ้าไม่ตั้ง Turso ระบบจะใช้ `/tmp/exam.db` ชั่วคราวและแสดงคำเตือนในหน้าผู้ดูแล

## สำรองฐานข้อมูล (Backup)

- **อัตโนมัติทุกวัน 02:07 น.** ด้วย GitHub Actions (`.github/workflows/backup-db.yml`) ไฟล์ถูกบีบอัดและ**เข้ารหัส AES-256** แล้วเก็บเป็น artifact 30 วัน
  ตั้ง Secrets ใน GitHub → Settings → Secrets and variables → Actions: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BACKUP_PASSPHRASE`
- **สำรองเอง**: `TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run backup > backup.sql`
- **ถอดรหัสไฟล์จาก Actions**:
  `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in psru-exam-XXXX.sql.gz.enc -out backup.sql.gz` แล้ว `gunzip backup.sql.gz`
- **กู้คืนลงฐานข้อมูลใหม่**: `turso db create psru-exam-restore` → `turso db shell psru-exam-restore < backup.sql` แล้วเปลี่ยน `TURSO_DATABASE_URL` ใน Vercel ไปที่ฐานใหม่

## ตัวแปรสภาพแวดล้อม

ดู `.env.example` — สำคัญที่สุดคือ `ADMIN_PASSWORD` และ `APP_SECRET` (ถ้าไม่ตั้ง `APP_SECRET` ระบบสุ่มเก็บไว้ในฐานข้อมูลให้)
การส่งอีเมลสรุปผล: ตั้ง `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` ถ้าไม่ตั้ง คำขอจะถูกเก็บในตาราง `email_outbox` และแจ้งนักศึกษาตามจริง

## สิ่งที่ยังเป็นตัวแทน / ทำเพิ่มได้

- โลโก้มหาวิทยาลัย: ตอนนี้เป็นกล่อง “PSRU” ตามงานออกแบบ (แก้ `UNI` ใน `public/js/common.js`)
- เข้าสู่ระบบด้วย Google SSO (@psru.ac.th) ยังไม่ได้ทำ ใช้อีเมล + รหัสนักศึกษา + รหัสการสอบ ตามหน้าจอ S1 ในงานออกแบบ
- ผู้ดูแลใช้รหัสผ่านร่วมชุดเดียว (`ADMIN_PASSWORD`) ยังไม่มีบัญชีรายบุคคล
- ระบบนี้ตรวจจับการออกนอกหน้าจอเท่าที่เบราว์เซอร์อนุญาต ไม่ใช่ระบบคุมสอบแบบล็อกเครื่อง
