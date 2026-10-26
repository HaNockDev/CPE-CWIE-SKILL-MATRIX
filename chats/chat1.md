# Exam screen design Desktop

_Started 2026-10-25 07:34 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "# DESIGN BRIEF: ระบบสอบออนไลน์ PSRU (วัดความพร้อมก่อนสหกิจ)??เอกสารนี้ใช้สั่งงาน"
Current date is now October 25, 2026
</system-info>

<attached aesthetic_system_instructions>
A design system or theme is attached to this project. That attachment already answers the visual-style question: apply it. Do NOT ask the user which visual style to use — no questions about vibe, colors or palette directions (including color-swatch svg-options questions), typography, mood, or art direction, and skip the "divergent visuals" question from the question-asking tips; offer divergent visual directions only if the user themselves asks for alternatives. This rule bans asking the user to pre-pick a style in the abstract — swatches, mood words, palette pickers. It does not ban asking them to choose among candidates you have already built: putting built candidates on a file-options board for the user to pick from is encouraged. Treat the attachment as the confirmed starting point and product context — the "confirm the starting point" tip is already satisfied, so do not ask the user to confirm or re-pick it. Spend your questions on everything else you need: audience, purpose, content, structure, scope, interactions, tone of copy.
</attached aesthetic_system_instructions>

<pasted_text name="Pasted text (129 lines)">
# DESIGN BRIEF: ระบบสอบออนไลน์ PSRU (วัดความพร้อมก่อนสหกิจ)

เอกสารนี้ใช้สั่งงานขั้นออกแบบหน้าจอ (UI/UX) เท่านั้น ยังไม่ต้องเขียนระบบหลังบ้าน
ผลงานที่ได้จะส่งต่อให้ Claude Code นำไปสร้างระบบจริงตาม `SPEC.md`

ต้นแบบอ้างอิง (ใช้ดูพฤติกรรมและเนื้อหา ปรับหน้าตาให้ดีขึ้นได้อิสระ):
`exam-system.html` (ระบบสอบ) และ `exam-bank.html` (คลังข้อสอบ)

## 1. ผู้ใช้และบริบท
- **นักศึกษา** สอบบนมือถือเป็นหลัก (จอแคบ ~360–430px) และคอมพิวเตอร์บางส่วน อยู่ในห้องสอบหรือที่บ้าน เวลาจำกัด ความกังวลสูง
  → หน้าสอบต้องเรียบ อ่านง่าย ไม่มีสิ่งรบกวน ปุ่มกดง่ายด้วยนิ้วโป้ง
- **อาจารย์ (Admin)** ใช้คอมพิวเตอร์เป็นหลัก จัดการข้อมูลจำนวนมาก (รายชื่อหลายร้อยคน ข้อสอบหลายร้อยข้อ)
  → เน้นตารางที่อ่านง่าย ค้นหา/กรองเร็ว ขั้นตอนชัดเจน
- ภาษาหลักคือ **ภาษาไทย** ฟอนต์ Noto Sans Thai (ข้อความยาวและตัวเลข อ่านชัดทั้งขนาดเล็กและใหญ่)
- รองรับธีมสว่างและธีมมืด

## 2. แนวทางภาพรวม
- โทนสุภาพ เป็นทางการแบบมหาวิทยาลัย แต่ไม่แข็งทื่อ ใช้สีหลักเดียวเป็นจุดเน้น (ต้นแบบใช้น้ำเงิน `#2b59d9`) สีเส้นเทียบค่าเฉลี่ยใช้ส้ม `#e07b00`
- มีพื้นที่ว่างเพียงพอ ตัวอักษรเนื้อหาข้อสอบไม่เล็กกว่า 16px
- สีสถานะ: เขียว = ตอบแล้ว/สำเร็จ, แดง = เตือน/หมดเวลาใกล้, เหลือง = ข้อควรระวัง ห้ามใช้สีอย่างเดียวบอกความหมาย ให้มีไอคอนหรือข้อความประกอบ
- ตรงตามหลักการเข้าถึง: คอนทราสต์ตัวอักษรไม่ต่ำกว่า WCAG AA, ปุ่มกดขนาดไม่ต่ำกว่า 44px, โฟกัสแป้นพิมพ์เห็นชัด
- ใส่โลโก้และสีประจำมหาวิทยาลัยได้ (ผู้ว่าจ้างจะส่งไฟล์ให้ ระหว่างนี้ใช้ตัวแทน)

## 3. หน้าจอฝั่งนักศึกษา (ออกแบบเรียงตามลำดับการใช้งาน)

### S1 หน้าเข้าสู่ระบบ
- ปุ่ม **“เข้าสู่ระบบด้วย Google (@psru.ac.th)”** (ถ้าระบบใช้ SSO) หรือช่องกรอกอีเมล
- ช่องกรอก: รหัสนักศึกษา, **รหัสการสอบ** (รูปแบบ `XXXX-XXXX` ตัวพิมพ์ใหญ่อัตโนมัติ, อาจารย์แจ้งในวันสอบ)
- สถานะ: ปกติ / กำลังตรวจสอบ / ผิดพลาด (ข้อความเฉพาะเจาะจง: รหัสสอบไม่ถูกต้อง, ยังไม่ถึงเวลาสอบ พร้อมเวลาเริ่ม, ปิดรับแล้ว, ไม่พบในรายชื่อ, อีเมลไม่ใช่ @psru.ac.th)
- ข้อความช่วยเหลือสั้นๆ ว่าจะขอรหัสสอบจากใคร

### S2 หน้ายืนยันก่อนสอบ
- ทักทายด้วยชื่อ-สกุลจากรายชื่อ และรหัสนักศึกษา เพื่อให้ยืนยันว่าเป็นตัวเอง
- ข้อมูลรอบ: ชื่อรอบ ช่วงเวลาเปิด–ปิด เวลาทำข้อสอบ (นาที) จำนวนข้อ
- กล่อง **ข้อปฏิบัติระหว่างสอบ** (เต็มจออัตโนมัติ, การออกนอกหน้าจอถูกบันทึก, เกินจำนวนที่กำหนดระบบส่งอัตโนมัติ, ตัวเลือกสลับลำดับเฉพาะบุคคล)
- ปุ่มหลักใหญ่ **“เริ่มทำข้อสอบ”** (กรณีกลับมาสอบต่อ เปลี่ยนเป็น “กลับเข้าสอบต่อ”) และปุ่มรอง “ย้อนกลับ”

### S3 หน้าทำข้อสอบ (สำคัญที่สุด)
- **แสดงหน้าละ 1 ข้อเท่านั้น**
- แถบบนติดหน้าจอ: “ข้อ 3 / 40”, จำนวนที่ตอบแล้ว, สถานะบันทึก (“กำลังบันทึก… / บันทึกแล้ว ✓ / บันทึกไม่สำเร็จ กำลังลองใหม่”), **ตัวนับเวลาถอยหลัง** (mm:ss, เปลี่ยนเป็นสีแดงเมื่อเหลือน้อยกว่า 5 นาที), ปุ่มเปิดภาพรวม
- แถบความคืบหน้าบางๆ ใต้แถบบน
- พื้นที่โจทย์: ข้อความ (ขึ้นบรรทัดใหม่ได้) และรูปภาพ (ไม่ล้นจอ, แตะดูขยายได้)
- คำบอกชนิด “เลือก 1 ข้อ” หรือ “เลือกได้มากกว่า 1 ข้อ” ชัดเจน
- ตัวเลือก: การ์ดกดได้ทั้งแผ่น มีตัวอักษร A, B, C… เป็นวงกลม ตัวเลือกที่เลือกต้องเห็นชัดทันที (radio สำหรับข้อเดียว, checkbox สำหรับหลายข้อ) รองรับรูปภาพในตัวเลือก
- แถบล่างติดหน้าจอ: “← ก่อนหน้า” และ “ถัดไป →” (ข้อสุดท้ายเปลี่ยนเป็น “ส่งข้อสอบ”)
- **หน้าภาพรวม** (ลิ้นชัก/modal): ตารางเลขข้อ สีเขียวคือตอบแล้ว ข้อปัจจุบันมีกรอบ แตะเพื่อกระโดดไปข้อนั้น
- **หน้าต่างยืนยันส่งข้อสอบ:** แจ้งจำนวนข้อที่ยังไม่ได้ตอบ และเตือนว่าส่งแล้วแก้ไม่ได้
- **หน้าจอบล็อกเต็มจอ 3 แบบ** (พื้นหลังเข้ม ข้อความใหญ่ กลางจอ):
  1. ออกจากโหมดเต็มหน้าจอ → ปุ่ม “กลับเข้าโหมดเต็มหน้าจอเพื่อสอบต่อ”
  2. ตรวจพบการสลับหน้าจอ → ปุ่ม “รับทราบ กลับไปสอบต่อ”
  3. กำลังส่งข้อสอบ
  สองแบบแรกแสดงจำนวนครั้งที่ตรวจพบ และจำนวนครั้งที่เหลือก่อนระบบส่งอัตโนมัติ
- ข้อความเตือนเมื่อเบราว์เซอร์ไม่รองรับเต็มหน้าจอ (เช่น iPhone) แบบไม่ตกใจเกินไป
- หน้านี้ต้องไม่มีเมนู ลิงก์ หรือโลโก้ใหญ่ที่ดึงสายตา

### S4 หน้าส่งข้อสอบเรียบร้อย / รอผล
- ไอคอนยืนยัน ชื่อรอบ เวลาที่ส่ง
- กรณีรอประกาศผล: อธิบายว่ากลับมาดูผลได้ด้วยรหัสสอบเดิม
- ปุ่ม “ออกจากระบบสอบ”

### S5 หน้าแสดงผลการสอบ
- ส่วนหัว: ชื่อรอบ ชื่อ-รหัส **เลขอ้างอิง** (แสดงชัด คัดลอกได้)
- **Spider chart** (รายละเอียดหัวข้อ 5)
- คำอธิบายสัญลักษณ์: เส้นทึบ = คะแนนของคุณ, เส้นประส้ม = ค่าเฉลี่ยผู้สอบทั้งรอบ (พร้อมจำนวนคน)
- ตารางต่อกลุ่มวิชา: ตอบถูก/ทั้งหมด, ระดับ (1–5), คะแนน (เต็ม 5), ค่าเฉลี่ย
- คะแนนรวม เช่น “32 / 40 (80.0%)”
- ปุ่ม **“ดาวน์โหลดการ์ดผลสอบ”** และ **“ส่งสรุปเข้าอีเมล”**
- มองเห็นได้ว่าระดับของแต่ละกลุ่มเป็น “ต่ำ–สูง” เช่น แถบระดับ 5 ช่อง แทนตัวเลขล้วน

## 4. หน้าจอฝั่ง Admin (เน้นเดสก์ท็อป รองรับแท็บเล็ต)
เมนูหลัก 3 แท็บ: **รอบสอบ / คลังข้อสอบ / ผลสอบ**

### A1 รอบสอบ
- รายการการ์ดรอบสอบ: ชื่อ ช่วงเวลา เวลาทำข้อสอบ แถบสถานะ (ยังไม่ถึงเวลา / เปิดสอบอยู่ / ปิดแล้ว) จำนวนข้อต่อกลุ่ม จำนวนรายชื่อ ความพร้อมของชุดข้อสอบ สถานะเผยแพร่ผล
- ปุ่มต่อรอบ: นำเข้ารายชื่อ, เตรียมชุดข้อสอบ, **รหัสสอบ**, ดูผล, แก้ไข, ลบ (ลบต้องยืนยัน)
- ฟอร์มสร้าง/แก้ไขรอบ: ชื่อ เวลาเปิด–ปิด เวลาทำข้อสอบ จำนวนครั้งออกนอกหน้าจอที่ยอมได้ **จำนวนข้อที่สุ่มจากแต่ละกลุ่มวิชา 4 ช่อง** (แสดงจำนวนข้อที่มีในคลังประกอบ) และสรุปรวมจำนวนข้อ
- **หน้าแสดงรหัสสอบ:** ตัวอักษรใหญ่มาก อ่านได้จากหลังห้อง (สำหรับฉายขึ้นจอ) ปุ่มคัดลอก และปุ่มสร้างรหัสใหม่ (ต้องยืนยัน เตือนว่ารหัสเดิมจะใช้ไม่ได้)
- ขั้นตอนนำเข้ารายชื่อ: วางข้อความ/เลือกไฟล์ CSV-XLSX, ตัวอย่างรูปแบบ, ตัวอย่างข้อมูลที่อ่านได้ก่อนยืนยัน, ตัวเลือกแทนที่/เพิ่ม, แสดงผลสรุป (สำเร็จกี่คน ข้ามกี่แถวเพราะอะไร)
- แถบความคืบหน้าสำหรับงานที่ใช้เวลา (เตรียมชุดข้อสอบ, เผยแพร่ผล)

### A2 คลังข้อสอบ
- สรุปจำนวนข้อต่อกลุ่มวิชา (4 กลุ่ม) เป็นแท็บหรือชิป
- ตารางรายการ: กลุ่ม, ประเภท (ข้อเดียว/หลายข้อ), โจทย์ย่อ, ไอคอนรูป, ปุ่มดู/แก้ไข/คัดลอก/ลบ พร้อมค้นหา
- ฟอร์มเพิ่ม/แก้ไขข้อสอบ: กลุ่มวิชา, โจทย์, รูปประกอบ, ตัวเลือก 2–10 ข้อ (ติ๊ก “ถูก” ได้หลายข้อ, เพิ่มรูป, เลื่อนขึ้นลง, ลบ), เฉลยอธิบาย, ระดับความยาก, คะแนน และส่วนดูตัวอย่างโจทย์แบบที่นักศึกษาเห็น
- ขั้นตอนนำเข้า/ส่งออก JSON พร้อมสรุปผล

### A3 ผลสอบ
- เลือกรอบ → ชิปสรุป (ส่งแล้ว / กำลังสอบ / ยังไม่เริ่ม / เผยแพร่ผลแล้ว)
- ตารางผล: รหัส ชื่อ สถานะ จำนวนข้อที่ตอบ จำนวนครั้งออกนอกจอ คะแนน 4 กลุ่ม (เต็ม 5) รวม % เลขอ้างอิง กรองและเรียงได้ ส่วนหัวตารางติดบน
- ไฮไลต์แถวที่ผิดปกติ (ออกนอกหน้าจอมาก, อีเมลไม่ได้ยืนยัน)
- แถบปุ่ม: ประมวลผลและเผยแพร่ผล, ส่งออก CSV, ตรวจเลขอ้างอิง
- หน้ารายละเอียดรายคน: ข้อมูลผู้สอบ ช่วงเวลา ประวัติการออกนอกหน้าจอ (เวลา+ชนิด) และกราฟ spider ของคนนั้น
- หน้าตรวจเลขอ้างอิง: ช่องกรอก ผลลัพธ์ “ถูกต้อง/ไม่พบ” ชัดเจน พร้อมรายละเอียด

## 5. Spider chart (ออกแบบให้ดีเป็นพิเศษ)
- แกน = กลุ่มวิชาของรอบนั้น (ปกติ 4 แกน: Software, Robot &amp; Automation, Cyber, Soft Skill)
- **5 วงแหวน = ระดับ 1–5** ตัวเลขกำกับบนแกน
- เส้นคะแนนผู้สอบ: เส้นทึบสีหลัก พื้นที่ภายในโปร่งใส ~18% มีจุดที่ปลายแต่ละแกน
- เส้นค่าเฉลี่ย: เส้นประสีส้ม ไม่มีสีพื้น
- ป้ายชื่อแกนไม่ถูกตัดและไม่ซ้อนกันบนจอ 360px (ชื่อสั้น: Software / Robot &amp; Auto / Cyber / Soft Skill)
- ใช้ได้ทั้งธีมสว่างและมืด และอ่านได้เมื่อพิมพ์ขาวดำ (เส้นทึบ/เส้นประต่างกัน)
- รองรับจำนวนแกนที่ไม่ใช่ 4 (เช่นรอบที่มีแค่ 2–3 กลุ่ม) แบบไม่เพี้ยน

## 6. การ์ดผลสอบ (ไฟล์ที่นักศึกษาดาวน์โหลดเป็นหลักฐาน)
- สัดส่วนแนวตั้ง ~ 900 × 1250px (ใช้แชร์/พิมพ์ A4 ได้) พื้นหลังขาว พิมพ์ขาวดำแล้วยังอ่านออก
- ส่วนหัวแถบสี: “การ์ดผลการสอบ” + ชื่อรอบ + โลโก้มหาวิทยาลัย
- ข้อมูลผู้สอบ: ชื่อ-สกุล รหัส อีเมล เวลาที่ส่งข้อสอบ
- Spider chart พร้อมคำอธิบายเส้น
- ตารางผลต่อกลุ่ม: ระดับ (1–5), คะแนน (เต็ม 5), ตอบถูก/ทั้งหมด
- คะแนนรวม
- กล่องเลขอ้างอิงตัวใหญ่ชัด (ฟอนต์ monospace) พร้อมข้อความ “ใช้ตรวจสอบกับฐานข้อมูลของมหาวิทยาลัย” และพื้นที่สำหรับ **QR code** ที่ชี้ไปหน้าตรวจเลขอ้างอิง (ถ้าระบบจริงรองรับ)
- ข้อความท้ายการ์ด: เวลาออกเอกสาร

## 7. ข้อความ (copy) ที่ต้องเขียนให้ชัด
ให้ผู้ออกแบบเขียนข้อความภาษาไทยสั้น กระชับ สุภาพ สำหรับ: ข้อความผิดพลาดทุกกรณีของหน้าเข้าสู่ระบบ, ข้อปฏิบัติระหว่างสอบ, คำเตือนออกนอกหน้าจอ,
ข้อความยืนยันส่งข้อสอบ, ข้อความหน้ารอผล, ข้อความในอีเมลสรุปผล (หัวเรื่อง + เนื้อหา)

## 8. สิ่งที่ต้องส่งมอบ
1. หน้าจอครบตามหัวข้อ 3–4 ทั้งมือถือ (390px) และเดสก์ท็อป (1280px) ธีมสว่างและมืด
2. ทุกสถานะ: ปกติ, กำลังโหลด, ว่าง, ผิดพลาด, สำเร็จ
3. Design tokens: สี, ตัวอักษร (ขนาด/น้ำหนัก), ระยะห่าง, มุมโค้ง, เงา
4. คอมโพเนนต์: ปุ่ม, ช่องกรอก, การ์ดตัวเลือก, ชิปสถานะ, ตาราง, modal/ลิ้นชัก, แถบความคืบหน้า, ตัวนับเวลา, toast
5. สเปก spider chart และการ์ดผลสอบ (ขนาด เส้น สี ตัวอักษร)
6. แผนผังการไหลของผู้ใช้ (flow) ของนักศึกษาและ Admin
7. หมายเหตุสำหรับนักพัฒนา: ขนาดตัวอักษรขั้นต่ำ, ขนาดจุดสัมผัส, ข้อควรระวังเรื่องภาษาไทย (ความสูงบรรทัด สระและวรรณยุกต์ไม่ถูกตัด)

## 9. สิ่งที่ไม่ต้องทำในขั้นนี้
ฐานข้อมูล API การล็อกอินจริง การส่งอีเมลจริง และการคิดคะแนน เป็นงานของ Claude Code ตาม `SPEC.md`
ผู้ออกแบบเพียงต้องให้หน้าจอรองรับข้อมูลและสถานะตามที่ระบุไว้ในเอกสารนี้
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Design Components">
This project uses Design Components: every design is a single streaming `Name.dc.html` file. The full authoring spec is in your system prompt under "Writing code — Design Components" — follow it. Author and edit `.dc.html` content with the `dc_write`, `dc_html_str_replace`, `dc_js_str_replace`, and `dc_set_props` tools (not `write_file`; `str_replace_edit` works but won't stream); template edits stream into the live preview as you type.
</attached-skill>

<attached-skill name="Design System (design system)">
[Design System] This project uses the **Design System** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

    Explore it to find what you need:
    - Always copy out the fonts and colors you need
    - For prototypes and designs, always copy out any relevant components
    - If the design system contains existing mocks of products, and you were asked to design or prototype something similar, copy and fork those mocks to start your design. This helps you make high-quality designs.

    Explore it quickly to find relevant UI kits (e.g. mocks of existing products you can copy and fork)

Full system at `/projects/b01176a7-1ac5-4c5e-b850-51bf2a04ae67/`. Before producing any visuals, explore it: call `list_files("/projects/b01176a7-1ac5-4c5e-b850-51bf2a04ae67/")` to see the structure, then `read_file` the README/base.md or whatever index file it has. Don't guess at the design system's contents.

CSS tokens: the guide may describe tokens in prose, but the exact `--*` names are defined in the design system's stylesheet(s). Before writing any `var(--*)`, look up the real name in the design system's `.css` files (`list_files` + `read_file` under `/projects/b01176a7-1ac5-4c5e-b850-51bf2a04ae67/`). Never guess a token name — an unresolved `var()` silently falls back to the browser default.

For assets and UI kits beyond the guide: `read_file("/projects/b01176a7-1ac5-4c5e-b850-51bf2a04ae67/<path>")` and `copy_files` to bring them into the current project.
</attached-skill>

## Assistant



## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: ask_user]_

Before I start, I need your answers on the form. The main things are which parts of the brief to do first, the two prototype files `exam-system.html` and `exam-bank.html` (they're not in the project yet), and the logo if you have it. If you skip a question, I'll make that call myself.

## User

สามารถปรับ UI ให้เหมือนกับ Apple. มากขึ้นได้ไหม

## User

ในส่วนของ Mobile ช่วยแสดงอยู่ใต้ กรอบมือถือด้วยได้หรือไหม

## User

หน้าจอสอบสำหรับ นศ. ให้ design สำหรับใช้บน Desktop

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now logic: width detection, layout prop, keyboard shortcuts.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: run_script]_

_[tool: read_file]_

_[tool: dc_set_props]_

_[tool: delete_file]_

_[tool: show_html]_

_[tool: ready_for_verification]_

I've added a desktop layout for the student exam page (S3). It switches on automatically when the screen is 1024px wide or more, and the mobile layout is unchanged. It's still being checked, so I haven't confirmed how it looks on screen yet.

- **Top bar:** shows the exam round and "ข้อ X / 40", save status, the countdown timer and a "ส่งข้อสอบ" button.
- **Left panel:** the question overview is always visible, grouped by subject. Click a number to jump to that question.
- **Question area:** up to 820px wide with larger question text (20px). When the options are images, they show in 2 columns.
- **Bottom bar:** "← ก่อนหน้า" and "ถัดไป →". Students can also press A–J to choose an answer and ← → to change questions, and a hint in the bar shows these keys.

There's a new Tweak called `layout` (auto / desktop / mobile) for viewing either layout. On the design board, the desktop row now has 9 frames: the S1 login page plus 8 exam states, including the submit confirmation, the lock screen and dark mode.

