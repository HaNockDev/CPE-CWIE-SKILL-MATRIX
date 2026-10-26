import { db, one } from './db.js';

export const DEFAULT_GROUPS = [
  { key: 'sw', name: 'Software Development', short: 'Software' },
  { key: 'robot', name: 'Robot & Automation', short: 'Robot & Auto' },
  { key: 'cyber', name: 'Cybersecurity', short: 'Cyber' },
  { key: 'soft', name: 'Soft Skill', short: 'Soft Skill' }
];

// Sample bank (from the design's config.js) — `c` marks the correct option indices
const SAMPLE = {
  sw: [
    { type: 'single', text: 'ข้อใดคือผลลัพธ์ของโค้ด Python ต่อไปนี้\n\nx = [1, 2, 3]\nprint(len(x) * 2)', options: ['3', '5', '6', 'เกิดข้อผิดพลาด (Error)'], c: [2] },
    { type: 'multi', text: 'ข้อใดเป็นหลักการของการเขียนโปรแกรมเชิงวัตถุ (OOP)', options: ['Encapsulation', 'Inheritance', 'Compilation', 'Polymorphism'], c: [0, 1, 3] },
    { type: 'single', text: 'คำสั่ง SQL ใดใช้ดึงข้อมูลจากตาราง students เฉพาะแถวที่ year เท่ากับ 4', options: ['GET * FROM students IF year = 4', 'SELECT * FROM students WHERE year = 4', 'SELECT students WHERE year == 4', 'FIND year = 4 IN students'], c: [1] }
  ],
  robot: [
    { type: 'single', text: 'วงจรควบคุมมอเตอร์บนสายพานลำเลียง ควรใช้เซนเซอร์ชนิดใดในการตรวจจับวัตถุที่ผ่าน', options: ['เซนเซอร์อุณหภูมิ', 'เซนเซอร์แสง (Photoelectric)', 'เซนเซอร์ความชื้น', 'เซนเซอร์แรงดัน'], c: [1] },
    { type: 'single', text: 'PLC ในงานระบบอัตโนมัติย่อมาจากข้อใด', options: ['Programmable Logic Controller', 'Power Line Communication', 'Process Level Control', 'Primary Logic Circuit'], c: [0] }
  ],
  cyber: [
    { type: 'single', text: 'ข้อใดเป็นลักษณะของการโจมตีแบบ Phishing', options: ['ส่งข้อมูลจำนวนมากจนเซิร์ฟเวอร์ล่ม', 'หลอกให้กรอกรหัสผ่านผ่านอีเมลหรือเว็บไซต์ปลอม', 'ดักฟังสัญญาณ Wi-Fi สาธารณะ', 'ฝังโปรแกรมขุดเหรียญในเครื่อง'], c: [1] },
    { type: 'multi', text: 'วิธีใดช่วยลดความเสี่ยงที่บัญชีผู้ใช้จะถูกเข้าถึงโดยไม่ได้รับอนุญาต', options: ['เปิดใช้การยืนยันตัวตนสองขั้นตอน (2FA)', 'ใช้รหัสผ่านเดียวกันทุกเว็บไซต์', 'ใช้โปรแกรมจัดการรหัสผ่าน', 'บันทึกรหัสผ่านไว้ในโน้ตบนหน้าจอ'], c: [0, 2] }
  ],
  soft: [
    { type: 'single', text: 'เมื่อได้รับมอบหมายงานจากพี่เลี้ยงในสถานประกอบการแต่ยังไม่เข้าใจขอบเขตของงาน ควรทำอย่างไรเป็นอันดับแรก', options: ['เริ่มทำตามความเข้าใจของตนเองไปก่อน', 'สอบถามพี่เลี้ยงเพื่อยืนยันขอบเขตและกำหนดส่ง', 'รอให้เพื่อนร่วมงานทำให้ดูก่อน', 'ปฏิเสธงานนั้น'], c: [1] },
    { type: 'single', text: 'ระหว่างประชุมทีม เพื่อนร่วมงานเสนอวิธีที่คุณคิดว่ามีข้อผิดพลาด วิธีสื่อสารใดเหมาะสมที่สุด', options: ['เงียบไว้ แล้วไปแก้งานภายหลัง', 'ขัดจังหวะทันทีเพื่อชี้ข้อผิดพลาด', 'ถามคำถามเพื่อชวนทีมพิจารณาความเสี่ยง พร้อมเสนอทางเลือก', 'แจ้งหัวหน้าเป็นการส่วนตัวโดยไม่บอกทีม'], c: [2] }
  ]
};

export async function seedIfEmpty() {
  const g = await one('SELECT COUNT(*) AS n FROM groups');
  if (Number(g.n) > 0) return;
  const now = Date.now(), stmts = [];
  DEFAULT_GROUPS.forEach((x, i) => stmts.push({ sql: 'INSERT INTO groups (key,name,short,sort) VALUES (?,?,?,?)', args: [x.key, x.name, x.short, i] }));
  if (process.env.SEED_SAMPLE_QUESTIONS !== '0') {
    for (const [key, list] of Object.entries(SAMPLE)) {
      list.forEach((q, i) => stmts.push({
        sql: 'INSERT INTO questions (id,group_key,type,text,image,options,explain,difficulty,points,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        args: ['Q-' + key.slice(0, 2).toUpperCase() + '-' + String(i + 1).padStart(3, '0'), key, q.type, q.text, null,
          JSON.stringify(q.options.map((t, k) => ({ text: t, image: null, correct: q.c.includes(k) }))), null, 1, 1, now, now]
      }));
    }
  }
  if (process.env.SEED_DEMO !== '0') {
    // รอบทดลอง: เปิดทันที 30 วัน มีผู้สอบตัวอย่าง 1 คน (ลบได้จากหน้า Admin)
    const picks = { sw: 3, robot: 2, cyber: 2, soft: 2 };
    stmts.push({
      sql: 'INSERT INTO rounds (id,name,opens_at,closes_at,duration_min,max_leaves,picks,code,published,set_ready,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      args: ['DEMO-01', 'รอบทดลองระบบ (ตัวอย่าง)', now - 3600e3, now + 30 * 86400e3, 30, 3, JSON.stringify(picks), 'K7PQ-3MXA', 0, 0, now]
    });
    stmts.push({ sql: 'INSERT INTO roster (round_id,sid,name,email) VALUES (?,?,?,?)', args: ['DEMO-01', '6512345678', 'นางสาวกานต์ธิดา ใจดี', '6512345678@psru.ac.th'] });
  }
  await db.batch(stmts, 'write');
  console.log('[seed] initial data created');
}
