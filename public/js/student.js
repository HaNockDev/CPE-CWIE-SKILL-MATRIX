import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { api, store, thDateTime, thWindow, mmss, Icon, LogoBox, Toast, SpiderChart, LevelCells, drawResultCard, trapFocus, ThemeButton, UNI, LETTERS, MONO, LEVEL_NAMES } from './common.js';

const TOKEN_KEY = 'psru-stu-token';
const MIN_AWAY_MS = 1000; // shorter focus losses are ignored
const ERR = {
  err_code: ['รหัสการสอบไม่ถูกต้อง', 'ตรวจสอบตัวอักษรอีกครั้ง รหัสมี 8 ตัว รูปแบบ XXXX-XXXX', 'code'],
  err_notyet: ['ยังไม่ถึงเวลาสอบ', d => 'รอบนี้เปิดให้เข้าสอบ ' + thDateTime(d.opensAt) + ' กรุณากลับมาอีกครั้งเมื่อถึงเวลา', 'code'],
  err_closed: ['รอบสอบนี้ปิดรับแล้ว', d => 'ปิดรับเมื่อ ' + thDateTime(d.closesAt) + ' หากเข้าสอบไม่ทันด้วยเหตุจำเป็น ติดต่ออาจารย์ผู้คุมสอบ', 'code'],
  err_notfound: ['ไม่พบรหัสนักศึกษานี้ในรายชื่อผู้สอบ', 'ตรวจสอบรหัสนักศึกษา 10 หลักอีกครั้ง หากถูกต้องแล้ว แจ้งอาจารย์ผู้คุมสอบเพื่อเพิ่มรายชื่อ', 'sid'],
  err_email: ['อีเมลไม่ตรงกับรายชื่อผู้สอบ', 'ใช้อีเมลมหาวิทยาลัยที่ลงทะเบียนไว้กับรหัสนักศึกษานี้ หากถูกต้องแล้ว แจ้งอาจารย์ผู้คุมสอบ', 'email'],
  err_domain: ['ใช้ได้เฉพาะอีเมล @psru.ac.th', 'กรุณาใช้อีเมลของมหาวิทยาลัย ไม่รองรับอีเมลส่วนตัว เช่น Gmail หรือ Hotmail', 'email'],
  err_network: ['เชื่อมต่อระบบไม่ได้', 'ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', null]
};

const btnPrimary = (h = 54, fs = 17) => `height:${h}px;border:none;border-radius:14px;background:var(--primary);color:var(--primary-ink);font-size:${fs}px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px`;
const btnSecondary = (h = 52, fs = 16) => `height:${h}px;border:none;border-radius:14px;background:var(--fill);color:var(--ink);font-size:${fs}px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px`;
const card = 'background:var(--surface);border:none;border-radius:20px;box-shadow:var(--shadow)';
const inputBase = 'height:52px;padding:0 14px;font-size:17px;border-radius:12px;background:var(--fill);color:var(--ink);width:100%';

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const f = () => setW(window.innerWidth); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  return w;
}

function Modal({ children, onClose, style, role = 'dialog', label, labelledby, wrapStyle = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:16px', backdrop = true }) {
  const ref = useRef();
  useEffect(() => trapFocus(ref.current, onClose), []);
  return html`<div style=${wrapStyle}>
    ${backdrop && html`<div onClick=${onClose} style="position:absolute;inset:0;background:rgba(0,0,0,.32)"></div>`}
    <div ref=${ref} role=${role} aria-modal="true" aria-label=${label} aria-labelledby=${labelledby} style=${style}>${children}</div>
  </div>`;
}

function TopBar({ title, onLogout }) {
  return html`<div class="blur-bar" style="border-bottom:0.5px solid var(--line-strong)">
    <div style="max-width:960px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:10px">
      <${LogoBox} /><span style="flex:1;font-size:15px;font-weight:600">${title}</span>
      <${ThemeButton} />
      <button onClick=${onLogout} class="h-surface2" style="height:44px;padding:0 14px;border:none;background:transparent;color:var(--ink-2);font-size:15px;cursor:pointer;border-radius:8px">ออกจากระบบ</button>
    </div></div>`;
}

// ================= S1 Login =================
function Login({ onDone }) {
  const [f, setF] = useState({ email: '', sid: '', code: '' });
  const [st, setSt] = useState({ busy: false, err: null, data: {} });
  const err = st.err && ERR[st.err], errField = err ? err[2] : null;
  const bd = k => errField === k ? 'var(--danger)' : 'transparent';
  const submit = async e => {
    e && e.preventDefault();
    if (st.busy) return;
    setSt({ busy: true, err: null, data: {} });
    try {
      const r = await api('/student/login', { method: 'POST', body: f });
      store.set(TOKEN_KEY, r.token); onDone(r.token);
    } catch (x) { setSt({ busy: false, err: ERR[x.data && x.data.error] ? x.data.error : 'err_network', data: x.data || {} }); }
  };
  const onCode = v => { const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); setF({ ...f, code: s.length > 4 ? s.slice(0, 4) + '-' + s.slice(4) : s }); };
  return html`<div style="position:absolute;inset:0;overflow-y:auto;overflow-x:hidden">
    <form onSubmit=${submit} noValidate style="width:100%;max-width:440px;margin:0 auto;padding:36px 20px 32px;display:flex;flex-direction:column;gap:22px">
      <div style="display:flex;align-items:center;gap:12px">
        <${LogoBox} size=${44} font=${12} />
        <div style="flex:1;display:flex;flex-direction:column;line-height:1.4"><span style="font-size:13px;color:var(--ink-3)">${UNI.name}</span><span style="font-size:15px;font-weight:600">ระบบสอบออนไลน์</span></div>
        <${ThemeButton} />
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.45">เข้าสู่ระบบสอบ</h1>
        <p style="margin:0;font-size:15px;color:var(--ink-2)">วัดความพร้อมก่อนสหกิจศึกษา กรอกข้อมูลให้ครบทั้ง 3 ช่อง</p>
      </div>
      ${err && html`<div role="alert" style="display:flex;gap:12px;padding:14px 16px;border-radius:12px;background:var(--danger-soft);border:1px solid var(--danger)">
        ${Icon.warn(22, 'var(--danger)', 'margin-top:2px')}
        <div style="display:flex;flex-direction:column;gap:2px"><strong style="font-size:16px;color:var(--danger)">${err[0]}</strong><span style="font-size:15px;color:var(--ink)">${typeof err[1] === 'function' ? err[1](st.data) : err[1]}</span></div>
      </div>`}
      <div style="display:flex;flex-direction:column;gap:18px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:15px;font-weight:600">อีเมลมหาวิทยาลัย</span>
          <input type="email" inputmode="email" autocomplete="email" placeholder="รหัสนักศึกษา@psru.ac.th" value=${f.email} onInput=${e => setF({ ...f, email: e.target.value })} aria-invalid=${errField === 'email'} style=${inputBase + ';border:1.5px solid ' + bd('email')} />
        </label>
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:15px;font-weight:600">รหัสนักศึกษา</span>
          <input inputmode="numeric" maxlength="10" placeholder="10 หลัก" value=${f.sid} onInput=${e => setF({ ...f, sid: e.target.value.replace(/\D/g, '').slice(0, 10) })} aria-invalid=${errField === 'sid'} style=${inputBase + ';letter-spacing:1px;' + MONO + ';border:1.5px solid ' + bd('sid')} />
        </label>
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:15px;font-weight:600">รหัสการสอบ</span>
          <input autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX" value=${f.code} onInput=${e => onCode(e.target.value)} aria-invalid=${errField === 'code'} aria-describedby="code-hint" style=${'height:56px;padding:0 14px;font-size:22px;font-weight:600;border-radius:12px;background:var(--fill);color:var(--ink);width:100%;letter-spacing:3px;' + MONO + ';border:1.5px solid ' + bd('code')} />
          <span id="code-hint" style="font-size:14px;color:var(--ink-3)">อาจารย์ผู้คุมสอบจะแจ้งรหัสในวันสอบ ตัวพิมพ์ใหญ่จะปรับให้อัตโนมัติ</span>
        </label>
        <button type="submit" aria-busy=${st.busy} class="h-primary" style=${btnPrimary() + ';opacity:' + (st.busy ? 0.8 : 1)}>
          ${st.busy ? html`<span class="spin" style="width:18px;height:18px"></span><span>กำลังตรวจสอบ…</span>` : html`<span>เข้าสู่ระบบ</span>`}
        </button>
      </div>
      <div style="padding:14px 16px;border-radius:12px;background:var(--surface-2);font-size:15px;color:var(--ink-2);display:flex;flex-direction:column;gap:2px">
        <strong style="color:var(--ink)">ยังไม่ได้รับรหัสการสอบ?</strong>
        <span>สอบในห้อง: สอบถามอาจารย์ผู้คุมสอบประจำห้อง · สอบจากที่บ้าน: ติดต่ออาจารย์ประจำวิชาหรือเจ้าหน้าที่หลักสูตร</span>
      </div>
    </form></div>`;
}

// ================= S2 Confirm =================
function Confirm({ info, onStart, onLogout, starting, startErr }) {
  const r = info.round, a = info.attempt, resumed = a && a.status === 'in_progress';
  const rules = [
    'เมื่อกดเริ่ม หน้าจอจะเข้าสู่โหมดเต็มหน้าจออัตโนมัติ',
    'การออกจากโหมดเต็มหน้าจอ การสลับไปหน้าต่างหรือแอปอื่น (เช่น Alt+Tab หรือ Cmd+Tab) และการเปิดแท็บอื่น จะถูกบันทึกพร้อมเวลา',
    'ออกนอกหน้าจอได้ไม่เกิน ' + r.maxLeaves + ' ครั้ง ถ้าเกิน ระบบจะส่งข้อสอบให้อัตโนมัติ',
    'ลำดับตัวเลือกของแต่ละคนไม่เหมือนกัน',
    'คำตอบบันทึกอัตโนมัติทุกครั้งที่เลือก หากหลุดการเชื่อมต่อ เข้าสู่ระบบด้วยรหัสการสอบเดิมเพื่อทำต่อ',
    'เวลาสอบนับถอยหลังต่อเนื่อง ไม่หยุดระหว่างที่ออกจากระบบ'
  ];
  return html`<div style="position:absolute;inset:0;overflow-y:auto;overflow-x:hidden">
    <${TopBar} title="ระบบสอบออนไลน์" onLogout=${onLogout} />
    <div style="max-width:560px;margin:0 auto;padding:24px 16px 32px;display:flex;flex-direction:column;gap:18px">
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:15px;color:var(--ink-2)">สวัสดี</span>
        <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.45">${info.student.name}</h1>
        <span style="font-size:15px;color:var(--ink-2)">รหัสนักศึกษา ${info.student.sid}</span>
        <span style="font-size:14px;color:var(--ink-3)">ถ้าชื่อหรือรหัสไม่ใช่ของคุณ ให้ออกจากระบบและแจ้งอาจารย์ผู้คุมสอบ</span>
      </div>
      <div style=${card + ';padding:18px;display:flex;flex-direction:column;gap:12px'}>
        <div style="font-size:18px;font-weight:600;line-height:1.5">${r.name}</div>
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 16px;font-size:15px">
          <span style="color:var(--ink-3)">เปิดสอบ</span><span style="font-weight:500">${thWindow(r.opensAt, r.closesAt)}</span>
          <span style="color:var(--ink-3)">เวลาทำข้อสอบ</span><span style="font-weight:500">${r.durationMin} นาที นับถอยหลังทันทีที่เริ่ม</span>
          <span style="color:var(--ink-3)">จำนวนข้อ</span><span style="font-weight:500">${r.total} ข้อ จาก ${r.groupCount} กลุ่มวิชา</span>
        </div>
      </div>
      ${resumed && html`<div style="display:flex;gap:12px;padding:14px 16px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--primary)">
        ${Icon.clock(22, 'var(--primary)', 'margin-top:2px')}
        <div style="display:flex;flex-direction:column;gap:2px;font-size:15px"><strong style="font-size:16px">คุณเริ่มทำข้อสอบรอบนี้ไว้แล้ว</strong>
        <span>ตอบไปแล้ว ${a.answered} จาก ${a.total} ข้อ เหลือเวลา ${mmss(a.timeLeft || 0)} นาที เวลานับต่อเนื่องระหว่างที่ออกจากระบบ</span></div>
      </div>`}
      <div style=${card + ';padding:18px;display:flex;flex-direction:column;gap:12px'}>
        <div style="font-size:17px;font-weight:700">ข้อปฏิบัติระหว่างสอบ</div>
        <ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px">
          ${rules.map((t, i) => html`<li style="display:flex;gap:12px;font-size:15px;line-height:1.6">
            <span style="flex:none;width:26px;height:26px;border-radius:50%;background:var(--surface-2);color:var(--ink-2);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${i + 1}</span><span>${t}</span></li>`)}
        </ol>
      </div>
      ${startErr && html`<div role="alert" style="display:flex;gap:12px;padding:14px 16px;border-radius:12px;background:var(--danger-soft);border:1px solid var(--danger);font-size:15px">${Icon.warn(22, 'var(--danger)')}<span>${startErr}</span></div>`}
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onClick=${onStart} disabled=${starting} class="h-primary" style=${btnPrimary(56, 18)}>${starting ? html`<span class="spin" style="width:18px;height:18px"></span>กำลังเตรียมข้อสอบ…` : resumed ? 'กลับเข้าสอบต่อ' : 'เริ่มทำข้อสอบ'}</button>
        <button onClick=${onLogout} class="h-surface2" style=${btnSecondary()}>ย้อนกลับ</button>
      </div>
    </div></div>`;
}

// ================= S3 Exam =================
function SaveStatus({ state, size = 14 }) {
  const color = { saving: 'var(--ink-3)', saved: 'var(--ok)', error: 'var(--danger)' }[state];
  const text = { saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว', error: 'บันทึกไม่สำเร็จ กำลังลองใหม่' }[state];
  return html`<span aria-live="polite" style=${`display:flex;align-items:center;gap:5px;color:${color}`}>
    ${state === 'saving' && html`<span class="spin" style=${`width:${size - 3}px;height:${size - 3}px;border-width:2px`}></span>`}
    ${state === 'saved' && Icon.check(size)}
    ${state === 'error' && Icon.warn(size)}
    <span>${text}</span></span>`;
}

function Timer({ left, big }) {
  const warn = left < 300;
  return html`<div role="timer" aria-label=${'เหลือเวลา ' + mmss(left) + (warn ? ' เหลือน้อยกว่า 5 นาที' : '')} style=${`display:flex;align-items:center;gap:${big ? 8 : 6}px;height:44px;padding:0 ${big ? 14 : 12}px;border-radius:${big ? 12 : 10}px;background:${warn ? 'var(--danger)' : 'var(--surface-2)'};color:${warn ? '#ffffff' : 'var(--ink)'};${MONO};font-size:${big ? 22 : 20}px;font-weight:600;flex:none`}>
    ${Icon.timer(big ? 19 : 18)}<span>${mmss(left)}</span></div>`;
}

function OptionCard({ o, i, q, sel, onClick, desktop }) {
  const multi = q.type === 'multi';
  return html`<button role=${multi ? 'checkbox' : 'radio'} aria-checked=${sel ? 'true' : 'false'} aria-keyshortcuts=${desktop ? LETTERS[i] : undefined} onClick=${onClick} class="h-border"
    style=${`display:flex;align-items:center;gap:${desktop ? 16 : 14}px;width:100%;min-height:${desktop ? 64 : 60}px;padding:${desktop ? '14px 18px' : '12px 14px'};text-align:left;border-radius:16px;border:2px solid ${sel ? 'var(--primary)' : 'var(--line)'};background:${sel ? 'var(--primary-soft)' : 'var(--surface)'};color:var(--ink);cursor:pointer;font-size:17px;line-height:1.6`}>
    <span style=${`flex:none;width:36px;height:36px;border-radius:${multi ? '9px' : '50%'};border:2px solid ${sel ? 'var(--primary)' : 'var(--line-strong)'};background:${sel ? 'var(--primary)' : 'var(--surface)'};color:${sel ? 'var(--primary-ink)' : 'var(--ink-2)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px`}>${LETTERS[i]}</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
      ${o.image && html`<img src=${o.image} alt=${'รูปตัวเลือก ' + LETTERS[i]} style=${`display:block;max-width:100%;max-height:${desktop ? 160 : 120}px;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:#fff;align-self:flex-start`} />`}
      ${o.text && html`<span style="white-space:pre-wrap;overflow-wrap:anywhere">${o.text}</span>`}
    </span>
    ${sel && Icon.check(22, 3, 'var(--primary)')}
  </button>`;
}

function QuestionBody({ q, idx, mine, onSelect, onZoom, desktop }) {
  const multi = q.type === 'multi';
  const hasOptImages = q.options.some(o => o.image);
  return html`
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style=${`font-size:13px;color:var(--ink-2);background:${desktop ? 'var(--surface)' : 'var(--surface-2)'};border-radius:999px;padding:3px ${desktop ? 12 : 10}px`}>${q.groupName}</span>
      <span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--primary);background:var(--primary-soft);border-radius:999px;padding:3px 12px 3px 8px">
        <span style=${`width:14px;height:14px;border:2px solid currentColor;border-radius:${multi ? '3px' : '50%'}`}></span>${multi ? 'เลือกได้มากกว่า 1 ข้อ' : 'เลือก 1 ข้อ'}
      </span>
    </div>
    <div id=${'qtext-' + idx} style=${`font-size:${desktop ? 20 : 18}px;line-height:1.8;white-space:pre-wrap;text-wrap:pretty;overflow-wrap:anywhere`}>${q.text}</div>
    ${q.image && html`<button onClick=${() => onZoom(q.image)} aria-label="ขยายรูปประกอบโจทย์" style=${`position:relative;width:100%;${desktop ? 'max-width:640px;' : ''}padding:0;border-radius:${desktop ? 14 : 12}px;border:1px solid var(--line);background:#fff;cursor:zoom-in;display:flex;align-items:center;justify-content:center;overflow:hidden`}>
      <img src=${q.image} alt="รูปประกอบโจทย์" style=${`display:block;max-width:100%;max-height:${desktop ? 340 : 280}px;object-fit:contain`} />
      <span style="position:absolute;right:10px;bottom:10px;display:flex;align-items:center;gap:6px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:13px;font-weight:600">${Icon.expand()}${desktop ? 'คลิกเพื่อขยาย' : 'แตะเพื่อขยาย'}</span>
    </button>`}
    <div role=${multi ? 'group' : 'radiogroup'} aria-labelledby=${'qtext-' + idx} style=${desktop ? `display:grid;grid-template-columns:${hasOptImages ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)'};gap:12px` : 'display:flex;flex-direction:column;gap:12px'}>
      ${q.options.map((o, i) => html`<${OptionCard} key=${q.id + o.k} o=${o} i=${i} q=${q} sel=${mine.includes(o.k)} desktop=${desktop} onClick=${() => onSelect(o.k)} />`)}
    </div>`;
}

function OverviewGrid({ ex, answers, cur, onJump, desktop }) {
  const groups = [];
  ex.forEach((q, i) => { let g = groups.find(x => x.key === q.group); if (!g) groups.push(g = { key: q.group, name: q.groupName, idx: [] }); g.idx.push(i); });
  return groups.map(g => html`<div style="display:flex;flex-direction:column;gap:8px">
    <div style=${`font-size:${desktop ? 13 : 14}px;font-weight:600;color:var(--ink-2)`}>${g.name} · ตอบแล้ว ${g.idx.filter(i => answers[ex[i].id]).length}/${g.idx.length}</div>
    <div style=${`display:grid;grid-template-columns:${desktop ? 'repeat(5,minmax(0,1fr))' : 'repeat(auto-fill,minmax(52px,1fr))'};gap:${desktop ? 6 : 8}px`}>
      ${g.idx.map(i => {
        const a = !!answers[ex[i].id], c = i === cur;
        return html`<button onClick=${() => onJump(i)} aria-label=${'ข้อ ' + (i + 1) + (a ? ' ตอบแล้ว' : ' ยังไม่ตอบ') + (c ? ' ข้อปัจจุบัน' : '')} aria-current=${c ? 'step' : undefined} class="h-dim"
          style=${`height:${desktop ? 44 : 48}px;border-radius:10px;border:2px solid ${a ? 'var(--ok)' : 'transparent'};background:${a ? 'var(--ok-soft)' : 'var(--fill)'};color:var(--ink);font-size:${desktop ? 15 : 16}px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:2px;box-shadow:${c ? '0 0 0 2px var(--surface), 0 0 0 4px var(--primary)' : 'none'}`}>
          ${i + 1}${a && Icon.check(desktop ? 11 : 12, 3.5, 'var(--ok)')}</button>`;
      })}
    </div></div>`);
}

function Legend({ size = 16 }) {
  return html`
    <span style="display:flex;align-items:center;gap:6px"><span style=${`width:${size}px;height:${size}px;border-radius:4px;background:var(--ok-soft);border:2px solid var(--ok)`}></span>ตอบแล้ว</span>
    <span style="display:flex;align-items:center;gap:6px"><span style=${`width:${size}px;height:${size}px;border-radius:4px;background:var(--fill)`}></span>ยังไม่ตอบ</span>
    <span style="display:flex;align-items:center;gap:6px"><span style=${`width:${size}px;height:${size}px;border-radius:4px;background:var(--surface);border:2px solid var(--line-strong);box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--primary)`}></span>ข้อปัจจุบัน</span>`;
}

function Exam({ token, roundName, exam, setExam, desktop, onSubmitted, onToast }) {
  const { questions: ex, answers, cur, leaves, maxLeaves } = exam;
  const [left, setLeft] = useState(Math.max(0, Math.round((exam.deadline - Date.now()) / 1000)));
  const [save, setSave] = useState('saved');
  const [ov, setOv] = useState('none');
  const [zoom, setZoom] = useState(null);
  const [ios, setIos] = useState(!(document.fullscreenEnabled && document.documentElement.requestFullscreen));
  const S = useRef({}); S.current = { exam, ov, finished: false, ...S.current, exam, ov };
  const pending = useRef({});
  const total = ex.length, q = ex[cur], mine = answers[q.id] || [];
  const answeredCount = ex.filter(x => answers[x.id]).length;
  const unanswered = ex.map((x, i) => i).filter(i => !answers[ex[i].id]);

  const finish = async reason => {
    if (S.current.finished) return; S.current.finished = true;
    setOv('lock_submitting');
    await flush();
    let res = null;
    for (let i = 0; i < 4 && !res; i++) { try { res = await api('/student/submit', { method: 'POST', token, body: { reason } }); } catch (e) { if (e.status === 409 || e.status === 401) break; await new Promise(r => setTimeout(r, 1500)); } }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onSubmitted();
  };

  // countdown from the server deadline
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((S.current.exam.deadline - Date.now()) / 1000));
      setLeft(l);
      if (l === 300) onToast('เหลือเวลาสอบ 5 นาที', 'warn');
      if (l === 0) finish('time');
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // autosave with retry
  async function flush() {
    const items = Object.entries(pending.current);
    if (!items.length) return true;
    setSave('saving');
    let ok = true;
    for (const [qid, sel] of items) {
      try {
        await api('/student/answer', { method: 'POST', token, body: { qid, selected: sel } });
        if (pending.current[qid] === sel) delete pending.current[qid];
      } catch (e) {
        if (e.status === 409) { delete pending.current[qid]; if (!S.current.finished) { S.current.finished = true; onSubmitted(); } return false; }
        ok = false;
      }
    }
    setSave(ok && !Object.keys(pending.current).length ? 'saved' : ok ? 'saving' : 'error');
    return ok;
  }
  useEffect(() => { const t = setInterval(() => { if (Object.keys(pending.current).length) flush(); }, 4000); return () => clearInterval(t); }, []);

  const select = k => {
    const prev = answers[q.id] || [];
    const next = q.type === 'multi' ? (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k].sort((a, b) => a - b)) : [k];
    const na = { ...answers }; if (next.length) na[q.id] = next; else delete na[q.id];
    setExam({ ...exam, answers: na });
    pending.current[q.id] = next;
    clearTimeout(S.current.saveT); setSave('saving');
    S.current.saveT = setTimeout(flush, 250);
  };
  const go = i => setExam({ ...S.current.exam, cur: Math.max(0, Math.min(total - 1, i)) });

  // leave detection (tab switch / exit fullscreen)
  useEffect(() => {
    let awayAt = null, wasFs = !!document.fullscreenElement, fsLeftAt = null, fsEvent = null;
    const report = async (kind, durationMs) => {
      if (S.current.finished) return null;
      try {
        const r = await api('/student/event', { method: 'POST', token, body: { kind, durationMs } });
        if (r.status === 'submitted') { S.current.finished = true; setOv('lock_submitting'); setTimeout(onSubmitted, 1200); return null; }
        setExam({ ...S.current.exam, leaves: r.leaves });
        setOv(kind === 'fullscreen' ? 'lock_fs' : 'lock_tab');
        return r.eventId;
      } catch (e) { if (e.status === 409) onSubmitted(); return null; }
    };
    // Leaving the exam window: another browser tab, a minimised window, or another window/app via
    // Alt+Tab / Cmd+Tab / clicking elsewhere (the window stays visible but loses focus).
    // Hidden and blur usually fire together, so one leave = one event, reported on return with its duration.
    const isAway = () => document.visibilityState === 'hidden' || !document.hasFocus();
    const onLeave = () => { if (!awayAt && isAway()) awayAt = Date.now(); };
    const onBack = () => {
      if (!awayAt || isAway()) return;
      const away = Date.now() - awayAt, leftAt = awayAt;
      awayAt = null;
      if (away < MIN_AWAY_MS) return; // focus flicker, e.g. while the browser enters fullscreen
      // switching window/tab also drops fullscreen: count that single leave once, as a switch
      const sameLeave = fsLeftAt && Math.abs(fsLeftAt - leftAt) < 2000;
      if (!sameLeave) { report('tab', away); return; }
      const ev = fsEvent; fsLeftAt = null; fsEvent = null;
      ev.then(id => id && api('/student/event-duration', { method: 'POST', token, body: { durationMs: away, eventId: id, kind: 'tab' } }).catch(() => {}));
    };
    // a fullscreen exit is reported at once; its duration is sent when the student re-enters fullscreen
    const onFs = async () => {
      if (document.fullscreenElement) {
        wasFs = true;
        if (fsLeftAt) { const d = Date.now() - fsLeftAt, id = await fsEvent; fsLeftAt = null; fsEvent = null; api('/student/event-duration', { method: 'POST', token, body: { durationMs: d, eventId: id } }).catch(() => {}); }
      } else if (wasFs) { wasFs = false; fsLeftAt = Date.now(); fsEvent = report('fullscreen'); }
    };
    const onVis = () => (document.visibilityState === 'hidden' ? onLeave() : onBack());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onLeave);
    window.addEventListener('focus', onBack);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onLeave); window.removeEventListener('focus', onBack);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  // keyboard shortcuts (desktop): A–J choose, ← → change question
  useEffect(() => {
    if (!desktop) return;
    const onKey = e => {
      if (S.current.ov !== 'none' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const E = S.current.exam, qq = E.questions[E.cur], k = e.key.toUpperCase(), i = LETTERS.indexOf(k);
      if (k.length === 1 && i >= 0 && i < qq.options.length) { e.preventDefault(); S.current.select(qq.options[i].k); }
      else if (e.key === 'ArrowRight' && E.cur < E.questions.length - 1) { e.preventDefault(); go(E.cur + 1); }
      else if (e.key === 'ArrowLeft' && E.cur > 0) { e.preventDefault(); go(E.cur - 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [desktop]);
  S.current.select = select;

  const enterFs = () => {
    const el = document.documentElement;
    if (el.requestFullscreen && document.fullscreenEnabled) el.requestFullscreen().catch(() => setIos(true)); else setIos(true);
  };
  const next = () => cur < total - 1 ? go(cur + 1) : setOv('submit');
  const iosBar = msg => ios && html`<div style="flex:none;background:var(--warn-soft);border-bottom:1px solid var(--warn-line)">
    <div style=${`${desktop ? '' : 'max-width:720px;margin:0 auto;'}padding:${desktop ? '6px 12px 6px 24px' : '8px 8px 8px 16px'};display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink)`}>
      ${Icon.info(18, 'var(--warn)')}<span style="flex:1">${msg}</span>
      <button onClick=${() => setIos(false)} style="height:44px;padding:0 12px;border:none;background:transparent;color:var(--ink);font-size:14px;font-weight:600;cursor:pointer;border-radius:8px">รับทราบ</button>
    </div></div>`;
  const progress = h => html`<div role="progressbar" aria-valuemin="0" aria-valuemax=${total} aria-valuenow=${answeredCount} aria-label="ความคืบหน้า" style=${`height:${h}px;background:var(--surface-2)`}><div style=${`height:100%;width:${answeredCount / total * 100}%;background:var(--ok);transition:width .3s`}></div></div>`;
  const prevBtnStyle = `border:none;background:var(--fill);color:var(--ink);font-size:16px;font-weight:600;cursor:pointer;opacity:${cur === 0 ? 0.45 : 1}`;
  const nextBg = cur < total - 1 ? 'var(--primary)' : 'var(--ok)', nextLabel = cur < total - 1 ? 'ถัดไป →' : 'ส่งข้อสอบ';
  const summary = 'ตอบแล้ว ' + answeredCount + ' / ' + total + ' · ยังไม่ตอบ ' + (total - answeredCount);

  const body = desktop ? html`
    <div data-layout="desktop" style="position:absolute;inset:0;display:flex;flex-direction:column">
      <header class="blur-bar" style="flex:none;border-bottom:0.5px solid var(--line-strong)">
        <div style="height:64px;padding:0 24px;display:flex;align-items:center;gap:20px">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.4">
            <span style="font-size:13px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${roundName}</span>
            <span style="font-size:18px;font-weight:700">ข้อ ${cur + 1} / ${total}</span>
          </div>
          <span style="font-size:14px;flex:none"><${SaveStatus} state=${save} size=${15} /></span>
          <${Timer} left=${left} big />
          <button onClick=${() => setOv('submit')} class="h-line" style="height:44px;padding:0 18px;border:none;border-radius:12px;background:var(--fill);color:var(--ink);font-size:15px;font-weight:600;cursor:pointer;flex:none">ส่งข้อสอบ</button>
        </div>${progress(3)}
      </header>
      <div style="flex:1;min-height:0;display:grid;grid-template-columns:304px minmax(0,1fr)">
        <aside aria-label="ภาพรวมข้อสอบ" style="min-height:0;display:flex;flex-direction:column;border-right:0.5px solid var(--line-strong);background:var(--surface)">
          <div style="padding:18px 20px 10px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;flex-direction:column;line-height:1.45"><span style="font-size:16px;font-weight:700">ภาพรวมข้อสอบ</span><span style="font-size:14px;color:var(--ink-2)">${summary}</span></div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--ink-2)"><${Legend} size=${14} /></div>
          </div>
          <div style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:6px 20px 20px;display:flex;flex-direction:column;gap:18px">
            <${OverviewGrid} ex=${ex} answers=${answers} cur=${cur} onJump=${go} desktop />
          </div>
        </aside>
        <div style="min-height:0;display:flex;flex-direction:column;background:var(--bg)">
          ${iosBar('เบราว์เซอร์นี้ไม่รองรับโหมดเต็มหน้าจอ ทำข้อสอบต่อได้ตามปกติ ระบบยังบันทึกเมื่อสลับไปหน้าต่าง แท็บ หรือโปรแกรมอื่น')}
          <main style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden">
            <div style="max-width:820px;margin:0 auto;padding:32px 40px 40px;display:flex;flex-direction:column;gap:22px">
              <${QuestionBody} q=${q} idx=${cur} mine=${mine} onSelect=${select} onZoom=${setZoom} desktop />
            </div>
          </main>
          <footer class="blur-bar" style="flex:none;border-top:0.5px solid var(--line-strong)">
            <div style="max-width:820px;margin:0 auto;padding:12px 40px;display:flex;align-items:center;gap:16px">
              <button onClick=${() => go(cur - 1)} disabled=${cur === 0} style=${'min-width:150px;height:48px;padding:0 18px;border-radius:12px;' + prevBtnStyle}>← ก่อนหน้า</button>
              <div style="flex:1;display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;color:var(--ink-3)">
                <span>แป้นลัด</span>
                <kbd style="font-family:inherit;font-size:12px;font-weight:600;padding:1px 7px;border-radius:5px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink-2)">A–${LETTERS[q.options.length - 1]}</kbd><span>เลือกคำตอบ</span>
                <kbd style="font-family:inherit;font-size:12px;font-weight:600;padding:1px 7px;border-radius:5px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink-2)">← →</kbd><span>เปลี่ยนข้อ</span>
              </div>
              <button onClick=${next} style=${`min-width:150px;height:48px;padding:0 22px;border-radius:12px;border:none;background:${nextBg};color:var(--primary-ink);font-size:16px;font-weight:600;cursor:pointer`}>${nextLabel}</button>
            </div>
          </footer>
        </div>
      </div>
    </div>` : html`
    <div style="position:absolute;inset:0;display:flex;flex-direction:column">
      <header class="blur-bar" style="flex:none;border-bottom:0.5px solid var(--line-strong)">
        <div style="max-width:960px;margin:0 auto;padding:10px 16px 9px;display:flex;align-items:center;gap:10px">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column">
            <div style="font-size:19px;font-weight:700;line-height:1.35">ข้อ ${cur + 1} / ${total}</div>
            <div style="display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap;font-size:13px;color:var(--ink-2);line-height:1.4">
              <span>ตอบแล้ว ${answeredCount} ข้อ</span><${SaveStatus} state=${save} />
            </div>
          </div>
          <${Timer} left=${left} />
          <button onClick=${() => setOv('overview')} aria-label="เปิดภาพรวมข้อสอบ" class="h-surface2" style="width:44px;height:44px;flex:none;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer">${Icon.grid()}</button>
        </div>${progress(4)}
      </header>
      ${iosBar('อุปกรณ์นี้ไม่รองรับโหมดเต็มหน้าจอ ทำข้อสอบต่อได้ตามปกติ ระบบยังบันทึกเมื่อสลับไปแอปอื่น')}
      <main style="flex:1;overflow-y:auto;overflow-x:hidden">
        <div style="max-width:720px;margin:0 auto;padding:20px 16px 28px;display:flex;flex-direction:column;gap:18px">
          <${QuestionBody} q=${q} idx=${cur} mine=${mine} onSelect=${select} onZoom=${setZoom} />
        </div>
      </main>
      <footer class="blur-bar" style="flex:none;border-top:0.5px solid var(--line-strong);padding:10px 16px calc(10px + env(safe-area-inset-bottom))">
        <div style="max-width:720px;margin:0 auto;display:flex;gap:12px">
          <button onClick=${() => go(cur - 1)} disabled=${cur === 0} style=${'flex:1;height:54px;border-radius:14px;' + prevBtnStyle}>← ก่อนหน้า</button>
          <button onClick=${next} style=${`flex:1.4;height:54px;border-radius:12px;border:none;background:${nextBg};color:var(--primary-ink);font-size:16px;font-weight:600;cursor:pointer`}>${nextLabel}</button>
        </div>
      </footer>
    </div>`;

  const isLock = ov.startsWith('lock_'), leftN = Math.max(0, maxLeaves - leaves);
  return html`${body}
    ${ov === 'overview' && html`<${Modal} onClose=${() => setOv('none')} label="ภาพรวมข้อสอบ" wrapStyle="position:fixed;inset:0;z-index:40"
      style="position:absolute;left:0;right:0;bottom:0;max-width:600px;margin:0 auto;max-height:86%;background:var(--surface);border-radius:24px 24px 0 0;display:flex;flex-direction:column;box-shadow:var(--shadow-lg)">
      <div aria-hidden="true" style="width:36px;height:5px;border-radius:3px;background:var(--line-strong);margin:8px auto 0;flex:none"></div>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px 8px 20px;border-bottom:1px solid var(--line)">
        <div style="flex:1;display:flex;flex-direction:column"><span style="font-size:18px;font-weight:700">ภาพรวมข้อสอบ</span><span style="font-size:14px;color:var(--ink-2)">${summary}</span></div>
        <button onClick=${() => setOv('none')} aria-label="ปิด" style="width:44px;height:44px;border:none;background:transparent;color:var(--ink);border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center">${Icon.close()}</button>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 20px;font-size:13px;color:var(--ink-2)"><${Legend} /></div>
      <div style="flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 20px 16px;display:flex;flex-direction:column;gap:16px">
        <${OverviewGrid} ex=${ex} answers=${answers} cur=${cur} onJump=${i => { go(i); setOv('none'); }} />
      </div>
      <div style="padding:12px 20px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
        <button onClick=${() => setOv('submit')} style=${btnPrimary(52, 16) + ';width:100%'}>ส่งข้อสอบ</button>
      </div>
    <//>`}
    ${ov === 'submit' && html`<${Modal} onClose=${() => setOv('none')} role="alertdialog" labelledby="sub-title"
      style="position:relative;width:100%;max-width:420px;background:var(--surface);border-radius:22px;padding:24px 20px 20px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow-lg)">
      <h2 id="sub-title" style="margin:0;font-size:21px;font-weight:700;line-height:1.45">ส่งข้อสอบใช่หรือไม่</h2>
      ${unanswered.length > 0 ? html`<div style="display:flex;gap:10px;padding:12px 14px;border-radius:12px;background:var(--warn-soft);border:1px solid var(--warn-line)">
          ${Icon.warn(20, 'var(--warn)', 'margin-top:3px')}
          <div style="display:flex;flex-direction:column;font-size:15px"><strong style="font-size:16px">ยังไม่ได้ตอบ ${unanswered.length} ข้อ</strong>
          <span style="color:var(--ink-2)">ข้อ ${unanswered.slice(0, 5).map(i => i + 1).join(', ')}${unanswered.length > 5 ? ' และอีก ' + (unanswered.length - 5) + ' ข้อ' : ''}</span></div></div>`
        : html`<div style="display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:12px;background:var(--ok-soft);font-size:15px;font-weight:600">${Icon.check(20, 3, 'var(--ok)')}ตอบครบทั้ง ${total} ข้อแล้ว</div>`}
      ${save === 'error' && html`<div style="font-size:14px;color:var(--danger);display:flex;gap:6px;align-items:center">${Icon.warn(16)}ยังมีคำตอบที่บันทึกไม่สำเร็จ ระบบจะลองบันทึกอีกครั้งก่อนส่ง</div>`}
      <p style="margin:0;font-size:16px;color:var(--ink)">เมื่อส่งแล้วจะกลับมาแก้ไขคำตอบไม่ได้ เวลาที่เหลือจะไม่นำไปใช้ต่อ</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
        <button onClick=${() => finish(null)} style=${btnPrimary(52, 16)}>ยืนยันส่งข้อสอบ</button>
        <button onClick=${() => { setOv('none'); if (unanswered.length) go(unanswered[0]); }} style=${btnSecondary()}>กลับไปตรวจทาน</button>
      </div>
    <//>`}
    ${zoom && html`<${Modal} onClose=${() => setZoom(null)} label="รูปประกอบโจทย์" backdrop=${false} wrapStyle="position:fixed;inset:0;z-index:45"
      style="position:absolute;inset:0;background:rgba(5,8,14,.92);display:flex;flex-direction:column">
      <div style="display:flex;justify-content:flex-end;padding:8px"><button onClick=${() => setZoom(null)} style="height:44px;padding:0 16px;border:none;border-radius:10px;background:rgba(255,255,255,.12);color:#ffffff;font-size:15px;font-weight:600;cursor:pointer">ปิดรูป</button></div>
      <div style="flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;touch-action:pinch-zoom">
        <img src=${zoom} alt="รูปประกอบโจทย์ (ขยาย)" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;background:#fff" />
      </div>
    <//>`}
    ${isLock && html`<div role="alertdialog" aria-modal="true" aria-labelledby="lock-title" style="position:fixed;inset:0;z-index:50;background:var(--lock);color:#ffffff;overflow-y:auto;overflow-x:hidden;display:flex">
      <div style="margin:auto;width:100%;max-width:460px;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center">
        <div style="width:76px;height:76px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center">
          ${ov === 'lock_fs' && html`<svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:none;stroke:#ffd27a;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M4 9V4h5"></path><path d="M20 9V4h-5"></path><path d="M4 15v5h5"></path><path d="M20 15v5h-5"></path></svg>`}
          ${ov === 'lock_tab' && html`<svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:none;stroke:#ffd27a;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M4 8h14l-3-3"></path><path d="M20 16H6l3 3"></path></svg>`}
          ${ov === 'lock_submitting' && html`<span class="spin" style="width:34px;height:34px;border:3.5px solid #ffffff;border-right-color:transparent;animation-duration:.9s"></span>`}
        </div>
        <h2 id="lock-title" style="margin:0;font-size:27px;font-weight:700;line-height:1.45">${{ lock_fs: 'คุณออกจากโหมดเต็มหน้าจอ', lock_tab: 'ตรวจพบการสลับหน้าจอ', lock_submitting: 'กำลังส่งข้อสอบ…' }[ov]}</h2>
        <p style="margin:0;font-size:17px;color:#c9d2e3;line-height:1.7">${{
          lock_fs: 'ระบบบันทึกเหตุการณ์นี้พร้อมเวลาแล้ว เวลาสอบยังเดินต่อ กลับเข้าโหมดเต็มหน้าจอเพื่อทำข้อสอบต่อ',
          lock_tab: 'คุณออกจากหน้าสอบไปยังหน้าต่าง แอป หรือแท็บอื่น ระบบบันทึกเหตุการณ์นี้พร้อมเวลาแล้ว เวลาสอบยังเดินต่อ',
          lock_submitting: 'อย่าปิดหน้านี้หรือออกจากเบราว์เซอร์ ระบบกำลังบันทึกคำตอบทั้งหมด' }[ov]}</p>
        ${ov !== 'lock_submitting' && html`
          <div style="width:100%;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;align-items:center">
            <div style="font-size:16px;font-weight:600">ตรวจพบครั้งที่ ${leaves} จากที่อนุญาต ${maxLeaves} ครั้ง</div>
            <div style="display:flex;gap:8px" aria-hidden="true">${Array.from({ length: maxLeaves }, (_, i) => html`<span style=${`width:28px;height:8px;border-radius:4px;background:${i < leaves ? '#ffb020' : 'rgba(255,255,255,.2)'}`}></span>`)}</div>
            <div style=${`font-size:15px;color:${leftN > 0 ? '#c9d2e3' : '#ffb4b4'}`}>${leftN > 0 ? 'เหลืออีก ' + leftN + ' ครั้ง ก่อนระบบส่งข้อสอบอัตโนมัติ' : 'ครบจำนวนที่อนุญาตแล้ว หากออกอีกครั้ง ระบบจะส่งข้อสอบทันที'}</div>
          </div>
          <button data-autofocus onClick=${() => { if (ov === 'lock_fs') enterFs(); setOv('none'); }} style="width:100%;min-height:56px;padding:10px 16px;border:none;border-radius:12px;background:#ffffff;color:#0c1220;font-size:17px;font-weight:700;cursor:pointer;line-height:1.4">${ov === 'lock_fs' ? 'กลับเข้าโหมดเต็มหน้าจอเพื่อสอบต่อ' : 'รับทราบ กลับไปสอบต่อ'}</button>`}
      </div></div>`}`;
}

// ================= S4 Submitted =================
function Submitted({ info, onLogout, onResult }) {
  const a = info.attempt || {}, r = info.round, published = r.published;
  return html`<div style="position:absolute;inset:0;overflow-y:auto;overflow-x:hidden">
    <div style="max-width:480px;margin:0 auto;padding:48px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center">
      <div style="width:84px;height:84px;border-radius:50%;background:var(--ok-soft);display:flex;align-items:center;justify-content:center">${Icon.check(44, 2.6, 'var(--ok)')}</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.45">ส่งข้อสอบเรียบร้อยแล้ว</h1>
        <span style="font-size:16px;color:var(--ink-2)">${r.name}</span>
      </div>
      ${a.autoReason && html`<div style="width:100%;padding:12px 14px;border-radius:12px;background:var(--warn-soft);border:1px solid var(--warn-line);font-size:15px;text-align:left">
        ${a.autoReason === 'time' ? 'หมดเวลาสอบ ระบบส่งข้อสอบให้อัตโนมัติพร้อมคำตอบที่บันทึกไว้' : 'ออกนอกหน้าจอเกิน ' + r.maxLeaves + ' ครั้ง ระบบส่งข้อสอบให้อัตโนมัติพร้อมคำตอบที่บันทึกไว้'}</div>`}
      <div style=${card + ';width:100%;padding:16px 18px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 16px;text-align:left;font-size:15px'}>
        <span style="color:var(--ink-3)">ส่งเมื่อ</span><span style="font-weight:500">${thDateTime(a.submittedAt)}</span>
        <span style="color:var(--ink-3)">ตอบแล้ว</span><span style="font-weight:500">${a.answered} จาก ${a.total} ข้อ</span>
      </div>
      ${!published && html`<div style="width:100%;display:flex;gap:12px;padding:16px;border-radius:14px;background:var(--primary-soft);text-align:left">
        ${Icon.clock(22, 'var(--primary)', 'margin-top:2px')}
        <div style="display:flex;flex-direction:column;gap:4px;font-size:15px"><strong style="font-size:16px">ผลสอบยังไม่ประกาศ</strong><span>อาจารย์จะประกาศผลหลังปิดรอบสอบ เมื่อประกาศแล้ว เข้าสู่ระบบด้วยอีเมล รหัสนักศึกษา และรหัสการสอบเดิม เพื่อดูผลและดาวน์โหลดการ์ดผลสอบ</span></div>
      </div>`}
      <div style="width:100%;display:flex;flex-direction:column;gap:10px">
        ${published && html`<button onClick=${onResult} class="h-primary" style=${btnPrimary(54, 17)}>ดูผลการสอบ</button>`}
        <button onClick=${onLogout} class="h-surface2" style=${btnSecondary()}>ออกจากระบบสอบ</button>
      </div>
    </div></div>`;
}

// ================= S5 Result =================
function Result({ token, info, onLogout, onToast }) {
  const [res, setRes] = useState(null), [err, setErr] = useState(null), [cardOpen, setCardOpen] = useState(false), [mailing, setMailing] = useState(false);
  useEffect(() => { api('/student/result', { token }).then(setRes).catch(e => setErr(e.message)); }, []);
  if (err) return html`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--ink-2)">โหลดผลสอบไม่สำเร็จ (${err})</div>`;
  if (!res) return html`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--ink-2)"><span class="spin" style="width:18px;height:18px"></span>กำลังโหลดผลสอบ…</div>`;
  const copyRef = () => { navigator.clipboard?.writeText(res.ref).then(() => onToast('คัดลอกเลขอ้างอิงแล้ว'), () => onToast('คัดลอกไม่สำเร็จ', 'error')); };
  const sendEmail = async () => {
    setMailing(true);
    try { const r = await api('/student/email-result', { method: 'POST', token }); onToast(r.sent ? 'ส่งสรุปผลไปที่ ' + r.to + ' แล้ว' : r.queued ? 'บันทึกคำขอแล้ว ระบบจะส่งอีเมลไปที่ ' + r.to + ' เมื่อผู้ดูแลตั้งค่าอีเมล' : 'ส่งอีเมลไม่สำเร็จ ลองใหม่ภายหลัง', r.sent || r.queued ? 'ok' : 'error'); }
    catch (e) { onToast('ส่งอีเมลไม่สำเร็จ ลองใหม่ภายหลัง', 'error'); }
    setMailing(false);
  };
  return html`<div style="position:absolute;inset:0;overflow-y:auto;overflow-x:hidden">
    <${TopBar} title="ผลการสอบ" onLogout=${onLogout} />
    <div style="max-width:960px;margin:0 auto;padding:20px 16px 40px;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;flex-direction:column;gap:2px">
        <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.5">${res.roundName}</h1>
        <span style="font-size:15px;color:var(--ink-2)">${res.student.name} · ${res.student.sid}</span>
      </div>
      <div style=${card + ';display:flex;align-items:center;gap:12px;padding:12px 12px 12px 16px'}>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column">
          <span style="font-size:13px;color:var(--ink-3);font-weight:600">เลขอ้างอิง</span>
          <span style=${MONO + ';font-size:19px;font-weight:600;letter-spacing:.5px;word-break:break-all;user-select:all'}>${res.ref}</span>
        </div>
        <button onClick=${copyRef} class="h-surface2" style="height:44px;padding:0 14px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:15px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;flex:none">${Icon.copy()}คัดลอก</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px">
        <div style=${card + ';padding:18px 16px;display:flex;flex-direction:column;gap:12px'}>
          <div style="font-size:17px;font-weight:700">ภาพรวมรายกลุ่มวิชา</div>
          <${SpiderChart} axes=${res.rows.map(r => r.short)} values=${res.rows.map(r => r.score)} avg=${res.rows.map(r => r.avg)} />
          <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--ink-2)">
            <div style="display:flex;align-items:center;gap:10px"><span style="width:28px;border-top:3px solid var(--primary);flex:none"></span>คะแนนของคุณ (เส้นทึบ)</div>
            <div style="display:flex;align-items:center;gap:10px"><span style="width:28px;border-top:3px dashed var(--avg);flex:none"></span>ค่าเฉลี่ยผู้สอบทั้งรอบ ${res.participants} คน (เส้นประ)</div>
          </div>
        </div>
        <div style=${card + ';padding:18px 16px;display:flex;flex-direction:column;gap:16px'}>
          <div style="display:flex;flex-direction:column">
            <span style="font-size:15px;color:var(--ink-3);font-weight:600">คะแนนรวม</span>
            <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span style="font-size:44px;font-weight:700;line-height:1.25">${res.correct} / ${res.total}</span><span style="font-size:20px;font-weight:600;color:var(--primary)">(${res.pct.toFixed(1)}%)</span></div>
          </div>
          <div style="display:flex;flex-direction:column">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-3);padding-bottom:6px;border-bottom:1px solid var(--line)"><span>กลุ่มวิชา · ระดับ 1 ต่ำ – 5 สูง</span><span>คะแนน (เต็ม 5)</span></div>
            ${res.rows.map(r => html`<div style="display:flex;flex-direction:column;gap:6px;padding:12px 0;border-bottom:1px solid var(--line)">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline"><span style="font-size:16px;font-weight:600">${r.name}</span><span style="font-size:18px;font-weight:700">${r.score.toFixed(1)}</span></div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><${LevelCells} level=${r.level} /><span style="font-size:14px;font-weight:600">ระดับ ${r.level} · ${r.levelName}</span></div>
              <span style="font-size:14px;color:var(--ink-2)">ตอบถูก ${r.correct}/${r.total} · ค่าเฉลี่ยรอบ ${r.avg.toFixed(1)}</span>
            </div>`)}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button onClick=${() => setCardOpen(true)} class="h-primary" style=${btnPrimary(52, 16)}>${Icon.download()}ดาวน์โหลดการ์ดผลสอบ</button>
            <button onClick=${sendEmail} disabled=${mailing} class="h-surface2" style=${btnSecondary(52, 16) + ';font-weight:600'}>${mailing ? html`<span class="spin" style="width:16px;height:16px"></span>` : Icon.mail()}ส่งสรุปเข้าอีเมล</button>
          </div>
        </div>
      </div>
    </div>
    ${cardOpen && html`<${CardModal} res=${res} onClose=${() => setCardOpen(false)} onToast=${onToast} />`}
  </div>`;
}

function CardModal({ res, onClose, onToast }) {
  const ref = useRef(), [ready, setReady] = useState(false);
  useEffect(() => {
    drawResultCard(ref.current, {
      roundName: res.roundName, student: res.student, submittedLabel: thDateTime(res.submittedAt), issuedLabel: thDateTime(res.issuedAt, true),
      rows: res.rows, correct: res.correct, total: res.total, pct: res.pct, participants: res.participants, ref: res.ref,
      qrSrc: '/api/qr?text=' + encodeURIComponent(res.verifyUrl)
    }).then(() => setReady(true));
  }, []);
  const save = () => ref.current.toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'result-card-' + res.ref + '.png';
    document.body.appendChild(a); a.click(); a.remove(); onClose(); onToast('บันทึกการ์ดผลสอบแล้ว');
  }, 'image/png');
  return html`<${Modal} onClose=${onClose} label="การ์ดผลสอบ" style="position:relative;width:100%;max-width:400px;max-height:100%;overflow-y:auto;overflow-x:hidden;background:var(--surface);border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow-lg)">
    <div style="font-size:18px;font-weight:700">การ์ดผลสอบ</div>
    <div style="width:100%;max-width:324px;aspect-ratio:900 / 1250;margin:0 auto;border-radius:6px;border:1px solid var(--line);flex:none;overflow:hidden;background:#fff;position:relative">
      <canvas ref=${ref} style="width:100%;height:100%;display:block"></canvas>
      ${!ready && html`<span class="spin" style="position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-12px;color:#2b59d9"></span>`}
    </div>
    <span style="font-size:14px;color:var(--ink-2)">ไฟล์ PNG ขนาด 900 × 1250 px พิมพ์ลงกระดาษ A4 ได้</span>
    <button onClick=${save} disabled=${!ready} class="h-primary" style=${btnPrimary(52, 16) + ';opacity:' + (ready ? 1 : 0.6)}>บันทึกเป็นรูปภาพ</button>
    <button onClick=${onClose} style=${btnSecondary(48, 16)}>ปิด</button>
  <//>`;
}

// ================= App =================
function App() {
  const width = useWidth(), desktop = width >= 1024;
  const [token, setToken] = useState(store.get(TOKEN_KEY));
  const [info, setInfo] = useState(null);
  const [screen, setScreen] = useState(token ? 'loading' : 'login');
  const [exam, setExam] = useState(null);
  const [starting, setStarting] = useState(false), [startErr, setStartErr] = useState(null);
  const [toast, setToast] = useState(null);
  const toastT = useRef();
  const onToast = (text, kind) => { clearTimeout(toastT.current); setToast({ text, kind }); toastT.current = setTimeout(() => setToast(null), 2800); };

  const logout = () => { store.set(TOKEN_KEY, null); setToken(null); setInfo(null); setExam(null); setScreen('login'); };
  const refresh = async (t = token) => {
    try {
      const s = await api('/student/state', { token: t });
      setInfo(s);
      setScreen(s.attempt && s.attempt.status === 'submitted' ? 'submitted' : 'confirm');
      return s;
    } catch (e) { if (e.status === 401) logout(); else setScreen('confirm'); }
  };
  useEffect(() => { if (token) refresh(); }, []);
  useEffect(() => {
    const labels = { login: 'เข้าสู่ระบบ', confirm: 'ยืนยันก่อนสอบ', exam: 'ทำข้อสอบ', submitted: 'ส่งข้อสอบแล้ว', result: 'ผลการสอบ' };
    document.title = (labels[screen] ? labels[screen] + ' · ' : '') + 'ระบบสอบออนไลน์ ' + UNI.short;
  }, [screen]);

  const start = async () => {
    setStarting(true); setStartErr(null);
    // fullscreen must be requested inside the click handler
    const el = document.documentElement;
    if (el.requestFullscreen && document.fullscreenEnabled) el.requestFullscreen().catch(() => {});
    try {
      const r = await api('/student/start', { method: 'POST', token });
      setExam({ questions: r.questions, answers: r.answers || {}, cur: 0, leaves: r.leaves, maxLeaves: r.maxLeaves, deadline: Date.now() + r.timeLeft * 1000 });
      setScreen('exam');
    } catch (e) {
      const m = { set_not_ready: 'ชุดข้อสอบของรอบนี้ยังไม่พร้อม กรุณาแจ้งอาจารย์ผู้คุมสอบ', err_closed: 'รอบสอบนี้ปิดรับแล้ว', err_notyet: 'ยังไม่ถึงเวลาสอบ', already_submitted: 'คุณส่งข้อสอบรอบนี้แล้ว' }[e.data && e.data.error];
      setStartErr(m || 'เริ่มสอบไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (e.data && e.data.error === 'already_submitted') refresh();
    }
    setStarting(false);
  };

  let view;
  if (screen === 'login') view = html`<${Login} onDone=${t => { setToken(t); setScreen('loading'); refresh(t); }} />`;
  else if (screen === 'loading' || !info) view = html`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--ink-2)"><span class="spin" style="width:18px;height:18px"></span>กำลังโหลด…</div>`;
  else if (screen === 'confirm') view = html`<${Confirm} info=${info} onStart=${start} onLogout=${logout} starting=${starting} startErr=${startErr} />`;
  else if (screen === 'exam' && exam) view = html`<${Exam} token=${token} roundName=${info.round.name} exam=${exam} setExam=${setExam} desktop=${desktop} onToast=${onToast} onSubmitted=${() => { setExam(null); refresh(); }} />`;
  else if (screen === 'submitted') view = html`<${Submitted} info=${info} onLogout=${logout} onResult=${() => setScreen('result')} />`;
  else if (screen === 'result') view = html`<${Result} token=${token} info=${info} onLogout=${logout} onToast=${onToast} />`;
  return html`${view}<${Toast} toast=${toast} />`;
}

render(html`<${App} />`, document.getElementById('app'));
