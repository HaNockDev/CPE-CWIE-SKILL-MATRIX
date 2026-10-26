// ===== PSRU Exam — CONFIG (แก้ไขข้อมูลตัวอย่างได้ที่ไฟล์นี้) =====
window.PSRU_CONFIG = {
  university: { name: 'มหาวิทยาลัยราชภัฏพิบูลสงคราม', short: 'PSRU', emailDomain: 'psru.ac.th', logoText: 'PSRU' },
  round: {
    id: 'R1-2569',
    name: 'วัดความพร้อมก่อนสหกิจศึกษา รอบที่ 1/2569',
    code: 'K7PQ-3MXA',
    dateLabel: 'วันเสาร์ที่ 25 ต.ค. 2569',
    opensLabel: '09:00 น.',
    closesLabel: '12:00 น.',
    durationMin: 60,
    maxLeaves: 3,
    participants: 128
  },
  groups: [
    { key: 'sw', name: 'Software Development', short: 'Software', bank: 86, pick: 10 },
    { key: 'robot', name: 'Robot & Automation', short: 'Robot & Auto', bank: 64, pick: 10 },
    { key: 'cyber', name: 'Cybersecurity', short: 'Cyber', bank: 72, pick: 10 },
    { key: 'soft', name: 'Soft Skill', short: 'Soft Skill', bank: 58, pick: 10 }
  ],
  student: { id: '6512345678', name: 'นางสาวกานต์ธิดา ใจดี', email: '6512345678@psru.ac.th' },
  result: {
    ref: 'PSRU-69R1-7F3K-92QD',
    submittedLabel: '25 ต.ค. 2569 เวลา 10:42 น.',
    issuedLabel: '25 ต.ค. 2569 เวลา 14:05:22 น.',
    correct: { sw: 9, robot: 6, cyber: 8, soft: 9 },
    avgScore: { sw: 3.6, robot: 3.1, cyber: 3.4, soft: 4.0 }
  },
  questionTemplates: {
    sw: [
      { type: 'single', text: 'ข้อใดคือผลลัพธ์ของโค้ด Python ต่อไปนี้\n\nx = [1, 2, 3]\nprint(len(x) * 2)', options: ['3', '5', '6', 'เกิดข้อผิดพลาด (Error)'] },
      { type: 'multi', text: 'ข้อใดเป็นหลักการของการเขียนโปรแกรมเชิงวัตถุ (OOP)', options: ['Encapsulation', 'Inheritance', 'Compilation', 'Polymorphism'] },
      { type: 'single', text: 'คำสั่ง SQL ใดใช้ดึงข้อมูลจากตาราง students เฉพาะแถวที่ year เท่ากับ 4', options: ['GET * FROM students IF year = 4', 'SELECT * FROM students WHERE year = 4', 'SELECT students WHERE year == 4', 'FIND year = 4 IN students'] }
    ],
    robot: [
      { type: 'single', text: 'จากรูป วงจรควบคุมมอเตอร์นี้ใช้เซนเซอร์ชนิดใดในการตรวจจับวัตถุบนสายพาน', image: 'รูปวงจรควบคุมมอเตอร์', options: ['เซนเซอร์อุณหภูมิ', 'เซนเซอร์แสง (Photoelectric)', 'เซนเซอร์ความชื้น', 'เซนเซอร์แรงดัน'] },
      { type: 'single', text: 'PLC ในงานระบบอัตโนมัติย่อมาจากข้อใด', options: ['Programmable Logic Controller', 'Power Line Communication', 'Process Level Control', 'Primary Logic Circuit'] },
      { type: 'single', text: 'ข้อใดคือสัญลักษณ์ของหน้าสัมผัสปกติเปิด (Normally Open) ในแผนภาพ Ladder', options: ['', '', '', ''], optionImages: true }
    ],
    cyber: [
      { type: 'single', text: 'ข้อใดเป็นลักษณะของการโจมตีแบบ Phishing', options: ['ส่งข้อมูลจำนวนมากจนเซิร์ฟเวอร์ล่ม', 'หลอกให้กรอกรหัสผ่านผ่านอีเมลหรือเว็บไซต์ปลอม', 'ดักฟังสัญญาณ Wi-Fi สาธารณะ', 'ฝังโปรแกรมขุดเหรียญในเครื่อง'] },
      { type: 'multi', text: 'วิธีใดช่วยลดความเสี่ยงที่บัญชีผู้ใช้จะถูกเข้าถึงโดยไม่ได้รับอนุญาต', options: ['เปิดใช้การยืนยันตัวตนสองขั้นตอน (2FA)', 'ใช้รหัสผ่านเดียวกันทุกเว็บไซต์', 'ใช้โปรแกรมจัดการรหัสผ่าน', 'บันทึกรหัสผ่านไว้ในโน้ตบนหน้าจอ'] }
    ],
    soft: [
      { type: 'single', text: 'เมื่อได้รับมอบหมายงานจากพี่เลี้ยงในสถานประกอบการแต่ยังไม่เข้าใจขอบเขตของงาน ควรทำอย่างไรเป็นอันดับแรก', options: ['เริ่มทำตามความเข้าใจของตนเองไปก่อน', 'สอบถามพี่เลี้ยงเพื่อยืนยันขอบเขตและกำหนดส่ง', 'รอให้เพื่อนร่วมงานทำให้ดูก่อน', 'ปฏิเสธงานนั้น'] },
      { type: 'single', text: 'ระหว่างประชุมทีม เพื่อนร่วมงานเสนอวิธีที่คุณคิดว่ามีข้อผิดพลาด วิธีสื่อสารใดเหมาะสมที่สุด', options: ['เงียบไว้ แล้วไปแก้งานภายหลัง', 'ขัดจังหวะทันทีเพื่อชี้ข้อผิดพลาด', 'ถามคำถามเพื่อชวนทีมพิจารณาความเสี่ยง พร้อมเสนอทางเลือก', 'แจ้งหัวหน้าเป็นการส่วนตัวโดยไม่บอกทีม'] }
    ]
  },
  rounds: [
    { id: 'R1-2569', name: 'วัดความพร้อมก่อนสหกิจศึกษา รอบที่ 1/2569', status: 'open', when: '25 ต.ค. 2569 · 09:00–12:00 น.', duration: 60, picks: [10, 10, 10, 10], roster: 128, set: 'ready', published: false, code: 'K7PQ-3MXA', maxLeaves: 3 },
    { id: 'R2-2569', name: 'วัดความพร้อมก่อนสหกิจศึกษา รอบที่ 2/2569 (สอบซ่อม)', status: 'upcoming', when: '8 พ.ย. 2569 · 13:00–15:00 น.', duration: 45, picks: [5, 5, 5, 5], roster: 0, set: 'none', published: false, code: 'Q2WN-8HTE', maxLeaves: 3 },
    { id: 'R0-2568', name: 'รอบทดลองระบบ 3/2568', status: 'closed', when: '14 มี.ค. 2569 · 09:00–11:00 น.', duration: 30, picks: [5, 5, 5, 0], roster: 42, set: 'ready', published: true, code: 'ZT4M-1LKB', maxLeaves: 5 }
  ],
  firstNames: ['กานต์ธิดา', 'ธนกฤต', 'ณัฐวุฒิ', 'พิมพ์ชนก', 'ศุภกร', 'อรอุมา', 'ปิยะพงษ์', 'วรัญญา', 'ภูมิพัฒน์', 'ชนิดา', 'กิตติพัศ', 'สุพิชญา', 'จิรายุ', 'นภัสสร', 'ธีรเดช', 'เบญจมาศ'],
  lastNames: ['ใจดี', 'ศรีสุข', 'บุญมา', 'แก้วประเสริฐ', 'ทองคำ', 'วงศ์ใหญ่', 'สายสุวรรณ', 'พรหมมา', 'จันทร์เพ็ญ', 'อินทร์แก้ว', 'มณีรัตน์', 'คงสวัสดิ์']
};

window.PSRU = {
  levelNames: ['', 'ต่ำ', 'ค่อนข้างต่ำ', 'ปานกลาง', 'ค่อนข้างสูง', 'สูง'],
  score5(correct, total) { return total ? Math.round((correct / total) * 50) / 10 : 0; },
  // หมายเหตุ: เกณฑ์ระดับจริงอยู่ใน SPEC.md — ใช้ปัดเศษเป็นตัวแทน
  level(score) { return Math.min(5, Math.max(1, Math.round(score))); },
  results(C) {
    C = C || window.PSRU_CONFIG;
    const rows = C.groups.map(g => {
      const correct = C.result.correct[g.key], total = g.pick, score = this.score5(correct, total), lv = this.level(score);
      return { key: g.key, name: g.name, short: g.short, correct, total, score, scoreLabel: score.toFixed(1), level: lv, levelName: this.levelNames[lv], avg: C.result.avgScore[g.key], avgLabel: C.result.avgScore[g.key].toFixed(1) };
    });
    const c = rows.reduce((s, r) => s + r.correct, 0), t = rows.reduce((s, r) => s + r.total, 0);
    return { rows, correct: c, total: t, pct: t ? ((c / t) * 100).toFixed(1) : '0.0' };
  },
  buildExam(C) {
    C = C || window.PSRU_CONFIG;
    const out = [];
    C.groups.forEach(g => {
      const tpl = C.questionTemplates[g.key] || [];
      for (let i = 0; i < g.pick; i++) { const q = tpl[i % tpl.length]; out.push(Object.assign({ group: g.key, groupShort: g.short, groupName: g.name }, q)); }
    });
    return out;
  },
  rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
};
