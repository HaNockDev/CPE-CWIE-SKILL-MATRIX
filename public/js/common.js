import { html } from '../vendor/preact-htm.js';

export const UNI = { name: 'มหาวิทยาลัยราชภัฏพิบูลสงคราม', short: 'PSRU', logoText: 'PSRU' };
export const LEVEL_NAMES = ['', 'ต่ำ', 'ค่อนข้างต่ำ', 'ปานกลาง', 'ค่อนข้างสูง', 'สูง'];
export const LETTERS = 'ABCDEFGHIJ';
export const MONO = "font-family:ui-monospace,'SF Mono','IBM Plex Mono',monospace";

// ---------- API ----------
export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) { const e = new Error((data && (data.message || data.error)) || 'HTTP ' + res.status); e.status = res.status; e.data = data || {}; throw e; }
  return data;
}

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } }
};

// ---------- theme (auto / light / dark) ----------
export function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
export function currentTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  store.set('psru-theme', next); applyTheme(next); return next;
}
applyTheme(store.get('psru-theme'));

// ---------- formatting (Thai, Buddhist era) ----------
const TZ = 'Asia/Bangkok';
export function thDate(ms, opts = {}) {
  return new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', ...opts }).format(new Date(ms));
}
export function thTime(ms, sec = false) {
  return new Intl.DateTimeFormat('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}), hour12: false }).format(new Date(ms));
}
export const thDateTime = (ms, sec) => ms ? thDate(ms) + ' เวลา ' + thTime(ms, sec) + ' น.' : '—';
export const thWindow = (a, b) => {
  const same = thDate(a) === thDate(b);
  return same ? thDate(a, { weekday: 'long' }).replace(/^วัน/, 'วัน') + ' เวลา ' + thTime(a) + '–' + thTime(b) + ' น.' : thDateTime(a) + ' – ' + thDateTime(b);
};
export const mmss = sec => String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
export const toLocalInput = ms => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60e3); return d.toISOString().slice(0, 16); };

// ---------- icons ----------
export const Icon = {
  check: (s = 15, w = 3, c = 'currentColor') => html`<svg viewBox="0 0 24 24" aria-hidden="true" style=${`width:${s}px;height:${s}px;flex:none;fill:none;stroke:${c};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round`}><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`,
  warn: (s = 22, c = 'currentColor', st = '') => html`<svg viewBox="0 0 24 24" aria-hidden="true" style=${`width:${s}px;height:${s}px;flex:none;fill:none;stroke:${c};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;${st}`}><path d="M12 3.5L22 20.5H2L12 3.5z"></path><path d="M12 10v4.5"></path><path d="M12 17.5v.5"></path></svg>`,
  clock: (s = 22, c = 'currentColor', st = '') => html`<svg viewBox="0 0 24 24" aria-hidden="true" style=${`width:${s}px;height:${s}px;flex:none;fill:none;stroke:${c};stroke-width:2.2;stroke-linecap:round;${st}`}><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
  timer: s => html`<svg viewBox="0 0 24 24" aria-hidden="true" style=${`width:${s}px;height:${s}px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round`}><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2"></path><path d="M9 2.5h6"></path></svg>`,
  info: (s = 18, c = 'currentColor') => html`<svg viewBox="0 0 24 24" aria-hidden="true" style=${`width:${s}px;height:${s}px;flex:none;fill:none;stroke:${c};stroke-width:2.2;stroke-linecap:round`}><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6"></path><path d="M12 7.5v.5"></path></svg>`,
  grid: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path></svg>`,
  close: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round"><path d="M6 6l12 12M18 6L6 18"></path></svg>`,
  expand: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>`,
  copy: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round"><path d="M9 9h11v11H9z"></path><path d="M5 15H4V4h11v1"></path></svg>`,
  download: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 4v11"></path><path d="M7 10l5 5 5-5"></path><path d="M5 20h14"></path></svg>`,
  mail: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round"><path d="M3 6h18v12H3z"></path><path d="M3 7l9 7 9-7"></path></svg>`,
  search: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="position:absolute;left:12px;width:18px;height:18px;fill:none;stroke:var(--ink-3);stroke-width:2.2;stroke-linecap:round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>`,
  image: () => html`<svg viewBox="0 0 24 24" role="img" aria-label="มีรูป" style="width:18px;height:18px;fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linejoin:round"><path d="M3 5h18v14H3z"></path><path d="M3 16l5-5 4 4 3-3 6 6"></path></svg>`,
  moon: () => html`<svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>`
};

export function ThemeButton({ onToggle }) {
  return html`<button onClick=${() => { toggleTheme(); onToggle && onToggle(); }} aria-label="สลับธีมสว่าง/มืด" title="สลับธีมสว่าง/มืด" class="h-surface2" style="width:44px;height:44px;flex:none;border:none;background:transparent;color:var(--ink-2);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center">${Icon.moon()}</button>`;
}

export function LogoBox({ size = 32, font = 9 }) {
  return html`<div aria-hidden="true" style=${`width:${size}px;height:${size}px;border-radius:${size > 40 ? 10 : 8}px;border:1.5px dashed var(--line-strong);background:var(--surface);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:${font}px;font-weight:700;flex:none`}>${UNI.logoText}</div>`;
}

export function Toast({ toast, bottom = 88, align = 'center' }) {
  if (!toast) return null;
  const icon = toast.kind === 'warn' ? '#ffb020' : toast.kind === 'error' ? '#ff6961' : '#4cc784';
  const wrap = align === 'right' ? 'position:fixed;right:24px;bottom:24px;z-index:60' : `position:fixed;left:16px;right:16px;bottom:${bottom}px;z-index:60;display:flex;justify-content:center;pointer-events:none`;
  return html`<div role="status" style=${wrap}>
    <div style="display:flex;align-items:center;gap:10px;max-width:440px;padding:12px 16px;border-radius:12px;background:var(--ink);color:var(--bg);font-size:15px;font-weight:500;box-shadow:var(--shadow-lg)">
      ${toast.kind === 'error' || toast.kind === 'warn' ? Icon.warn(18, icon) : Icon.check(18, 3, icon)}<span>${toast.text}</span>
    </div></div>`;
}

// ---------- Spider chart (spec §5) ----------
export function SpiderChart({ axes, values = [], avg = [], printColors = false }) {
  const n = axes.length, cx = 180, cy = 130, R = 86, max = 5;
  const P = printColors ? { primary: '#2b59d9', avg: '#e07b00', line: '#c7c7cc', ink: '#172033', ink3: '#5f6b7f', surface: '#ffffff' } : { primary: 'var(--primary)', avg: 'var(--avg)', line: 'var(--line-strong)', ink: 'var(--ink)', ink3: 'var(--ink-3)', surface: 'var(--surface)' };
  if (n < 3) {
    return html`<div style="display:flex;flex-direction:column;gap:14px;padding:8px 0">
      ${axes.map((l, i) => html`<div style="display:flex;flex-direction:column;gap:6px">
        <div style=${`display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:600;color:${P.ink}`}><span>${l}</span><span>${(values[i] ?? 0).toFixed(1)} / 5</span></div>
        <div style=${`position:relative;height:14px;border-radius:4px;background:var(--surface-2);border:1px solid ${P.line}`}>
          <div style=${`position:absolute;left:0;top:0;bottom:0;width:${(values[i] ?? 0) / 5 * 100}%;background:${P.primary};border-radius:3px`}></div>
          ${avg[i] != null && html`<div style=${`position:absolute;top:-4px;bottom:-4px;left:${avg[i] / 5 * 100}%;border-left:2px dashed ${P.avg}`}></div>`}
        </div></div>`)}
      <div style=${`font-size:12px;color:${P.ink3}`}>แสดงเป็นแถบเมื่อมีน้อยกว่า 3 กลุ่มวิชา</div>
    </div>`;
  }
  const pt = (i, v) => { const a = (-90 + (360 * i) / n) * Math.PI / 180; return [cx + Math.cos(a) * R * v / max, cy + Math.sin(a) * R * v / max]; };
  const f = x => Math.round(x * 10) / 10;
  const poly = vals => vals.map((v, i) => pt(i, v).map(f).join(',')).join(' ');
  const px = x => (x / 360 * 100).toFixed(2) + '%', py = y => (y / 260 * 100).toFixed(2) + '%';
  const aria = 'แผนภูมิใยแมงมุม ' + axes.map((l, i) => l + ' ระดับ ' + (values[i] ?? '-') + (avg[i] != null ? ' ค่าเฉลี่ย ' + avg[i] : '')).join(', ');
  return html`<div style="position:relative;width:100%;aspect-ratio:360 / 260">
    <svg viewBox="0 0 360 260" role="img" aria-label=${aria} style="position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible">
      ${[1, 2, 3, 4, 5].map(k => html`<polygon points=${poly(Array(n).fill(k))} style=${`fill:none;stroke:${P.line};stroke-width:1`}></polygon>`)}
      ${axes.map((_, i) => { const [x2, y2] = pt(i, max); return html`<line x1=${cx} y1=${cy} x2=${f(x2)} y2=${f(y2)} style=${`stroke:${P.line};stroke-width:1`}></line>`; })}
      ${values.length === n && html`<polygon points=${poly(values)} style=${`fill:${P.primary};fill-opacity:0.18;stroke:${P.primary};stroke-width:2.5;stroke-linejoin:round`}></polygon>`}
      ${avg.length === n && html`<polygon points=${poly(avg)} style=${`fill:none;stroke:${P.avg};stroke-width:2;stroke-dasharray:6 4;stroke-linejoin:round`}></polygon>`}
      ${values.length === n && values.map((v, i) => { const [x, y] = pt(i, v); return html`<circle cx=${f(x)} cy=${f(y)} r="4.5" style=${`fill:${P.primary};stroke:${P.surface};stroke-width:2`}></circle>`; })}
    </svg>
    ${[1, 2, 3, 4, 5].map(k => { const [x, y] = pt(0, k); return html`<div aria-hidden="true" style=${`position:absolute;left:${px(x)};top:${py(y)};transform:translate(4px,-50%);font-size:11px;line-height:1.2;font-weight:700;color:${P.ink3};background:${P.surface};padding:1px 3px;border-radius:3px`}>${k}</div>`; })}
    ${axes.map((l, i) => {
      const a = (-90 + (360 * i) / n) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const x = cx + c * (R + 10), y = cy + s * (R + 10);
      const tx = c > 0.25 ? '0' : c < -0.25 ? '-100%' : '-50%', ty = s < -0.3 ? '-100%' : s > 0.3 ? '0' : '-50%';
      return html`<div aria-hidden="true" style=${`position:absolute;left:${px(x)};top:${py(y)};transform:translate(${tx},${ty});font-size:13px;line-height:1.3;font-weight:600;color:${P.ink};white-space:nowrap`}>${l}</div>`;
    })}
  </div>`;
}

export function LevelCells({ level, size = [26, 10], aria }) {
  return html`<span role="img" aria-label=${aria || 'ระดับ ' + level + ' จาก 5'} style="display:flex;gap:3px">
    ${[1, 2, 3, 4, 5].map(k => html`<span style=${`width:${size[0]}px;height:${size[1]}px;border-radius:2px;background:${k <= level ? 'var(--primary)' : 'var(--surface)'};border:1px solid ${k <= level ? 'var(--primary)' : 'var(--line-strong)'}`}></span>`)}
  </span>`;
}

// ---------- Result card (spec §6): drawn on a 900×1250 canvas so the PNG is identical everywhere ----------
async function loadImage(src) {
  return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = src; });
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

export async function drawResultCard(canvas, d) {
  const W = 900, H = 1250, F = "'Noto Sans Thai', sans-serif", M = "'IBM Plex Mono', ui-monospace, monospace";
  try { await Promise.all(['400', '500', '600', '700'].map(w => document.fonts.load(`${w} 20px 'Noto Sans Thai'`)).concat([document.fonts.load("600 20px 'IBM Plex Mono'")])); } catch { /* fallback fonts */ }
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const font = (w, s, fam = F) => { ctx.font = `${w} ${s}px ${fam}`; };
  const text = (t, x, y, { w = 400, s = 18, c = '#172033', fam = F, align = 'left' } = {}) => { font(w, s, fam); ctx.fillStyle = c; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, x, y); };
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  // header band
  ctx.fillStyle = '#2b59d9'; ctx.fillRect(0, 0, W, 196); ctx.fillStyle = '#172f78'; ctx.fillRect(0, 196, W, 6);
  ctx.fillStyle = '#ffffff'; rrect(ctx, 56, 54, 88, 88, 12); ctx.fill();
  ctx.setLineDash([6, 4]); ctx.strokeStyle = '#9db3ee'; ctx.lineWidth = 2; rrect(ctx, 57, 55, 86, 86, 12); ctx.stroke(); ctx.setLineDash([]);
  text(UNI.logoText, 100, 106, { w: 700, s: 20, c: '#2b59d9', align: 'center' });
  text(UNI.name, 172, 76, { w: 500, s: 18, c: 'rgba(255,255,255,.92)' });
  text('การ์ดผลการสอบ', 172, 128, { w: 700, s: 40, c: '#ffffff' });
  text(fit(ctx, d.roundName, 680, '500 20px ' + F), 172, 164, { w: 500, s: 20, c: '#ffffff' });
  // student info grid
  const info = [['ชื่อ-สกุล', d.student.name, 22, 600, F], ['รหัสนักศึกษา', d.student.sid, 22, 600, M], ['อีเมล', d.student.email || '', 18, 500, F], ['ส่งข้อสอบเมื่อ', d.submittedLabel, 18, 500, F]];
  info.forEach(([k, v, s, w, fam], i) => {
    const x = 56 + (i % 2) * 414, y = 248 + Math.floor(i / 2) * 64;
    text(k, x, y, { s: 14, c: '#5f6b7f' });
    font(w, s, fam); text(fit(ctx, v, 380), x, y + 30, { w, s, fam });
  });
  // divider
  ctx.fillStyle = '#d9dfe8'; ctx.fillRect(56, 384, W - 112, 1);
  // spider chart
  drawSpider(ctx, 56, 404, 400, 290, d.rows.map(r => r.short), d.rows.map(r => r.score), d.rows.map(r => r.avg), F);
  // legend
  ctx.strokeStyle = '#2b59d9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(56, 718); ctx.lineTo(88, 718); ctx.stroke();
  text('คะแนนของคุณ', 98, 724, { s: 15, c: '#465267' });
  ctx.strokeStyle = '#e07b00'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(56, 746); ctx.lineTo(88, 746); ctx.stroke(); ctx.setLineDash([]);
  text('ค่าเฉลี่ยผู้สอบทั้งรอบ (' + d.participants + ' คน)', 98, 752, { s: 15, c: '#465267' });
  // total
  text('คะแนนรวม', 492, 520, { s: 16, c: '#5f6b7f' });
  text(d.correct + ' / ' + d.total, 492, 600, { w: 700, s: 72 });
  text(d.pct.toFixed(1) + '%', 492, 648, { w: 600, s: 24, c: '#2b59d9' });
  // table
  // rows shrink when a round has many groups so the reference box never meets the footer
  const tx = 56, tw = W - 112, ty = 772, refH = 148, footY = H - 56;
  const rowH = Math.min(48, Math.floor((footY - 16 - refH - 18 - ty - 44) / Math.max(1, d.rows.length)));
  const cols = [0, 0.33, 0.66, 0.84].map(p => tx + 20 + p * (tw - 40));
  const th = 44 + rowH * d.rows.length;
  ctx.fillStyle = '#eef1f6'; rrect(ctx, tx, ty, tw, 44, [10, 10, 0, 0]); ctx.fill();
  ctx.strokeStyle = '#b9c2d0'; ctx.lineWidth = 1; rrect(ctx, tx + 0.5, ty + 0.5, tw - 1, th - 1, 10); ctx.stroke();
  text('กลุ่มวิชา', cols[0], ty + 29, { w: 600, s: 15, c: '#465267' });
  text('ระดับ (1–5)', cols[1], ty + 29, { w: 600, s: 15, c: '#465267' });
  text('คะแนน (เต็ม 5)', tx + tw - 20 - (tw - 40) * 0.2 - 12, ty + 29, { w: 600, s: 15, c: '#465267', align: 'right' });
  text('ตอบถูก/ทั้งหมด', tx + tw - 20, ty + 29, { w: 600, s: 15, c: '#465267', align: 'right' });
  d.rows.forEach((r, i) => {
    const y = ty + 44 + i * rowH, mid = y + rowH / 2;
    ctx.fillStyle = '#d9dfe8'; ctx.fillRect(tx + 1, y, tw - 2, 1);
    text(fit(ctx, r.name, cols[1] - cols[0] - 12, '600 18px ' + F), cols[0], mid + 7, { w: 600, s: 18 });
    for (let k = 1; k <= 5; k++) {
      const cx = cols[1] + (k - 1) * 25;
      ctx.fillStyle = k <= r.level ? '#2b59d9' : '#ffffff'; ctx.fillRect(cx, mid - 7, 22, 14);
      ctx.strokeStyle = '#2b59d9'; ctx.lineWidth = 1.5; ctx.strokeRect(cx + 0.75, mid - 6.25, 20.5, 12.5);
    }
    text(r.level + ' · ' + r.levelName, cols[1] + 134, mid + 6, { s: 15, c: '#465267' });
    text(r.score.toFixed(1), tx + tw - 20 - (tw - 40) * 0.2 - 12, mid + 7, { w: 700, s: 18, align: 'right' });
    text(r.correct + '/' + r.total, tx + tw - 20, mid + 7, { w: 500, s: 18, fam: M, align: 'right' });
  });
  // reference box
  const ry = ty + th + 18;
  ctx.strokeStyle = '#172033'; ctx.lineWidth = 2; rrect(ctx, 57, ry, W - 114, refH, 12); ctx.stroke();
  text('เลขอ้างอิง', 81, ry + 40, { w: 600, s: 15, c: '#5f6b7f' });
  text(d.ref, 81, ry + 88, { w: 600, s: 36, fam: M });
  text('ใช้ตรวจสอบกับฐานข้อมูลของมหาวิทยาลัย', 81, ry + 122, { s: 15, c: '#465267' });
  const qr = d.qrSrc ? await loadImage(d.qrSrc) : null;
  if (qr) ctx.drawImage(qr, W - 81 - 124, ry + 12, 124, 124);
  else { ctx.setLineDash([6, 4]); ctx.strokeStyle = '#b9c2d0'; rrect(ctx, W - 81 - 124, ry + 12, 124, 124, 8); ctx.stroke(); ctx.setLineDash([]); }
  // footer
  ctx.fillStyle = '#d9dfe8'; ctx.fillRect(0, footY, W, 1);
  text('ออกเอกสารเมื่อ ' + d.issuedLabel, 56, H - 22, { s: 14, c: '#5f6b7f' });
  text('ระบบสอบออนไลน์ ' + UNI.short, W - 56, H - 22, { s: 14, c: '#5f6b7f', align: 'right' });
  return canvas;
}

function fit(ctx, t, maxW, fontSpec) {
  if (fontSpec) ctx.font = fontSpec;
  if (ctx.measureText(t).width <= maxW) return t;
  let s = t;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

function drawSpider(ctx, ox, oy, w, h, axes, values, avg, F) {
  const n = axes.length, sx = w / 360, sy = h / 260, cx = ox + 180 * sx, cy = oy + 130 * sy, R = 86 * sx;
  const pt = (i, v) => { const a = (-90 + (360 * i) / n) * Math.PI / 180; return [cx + Math.cos(a) * R * v / 5, cy + Math.sin(a) * R * v / 5]; };
  if (n < 3) {
    axes.forEach((l, i) => {
      const y = oy + 30 + i * 70;
      ctx.font = `600 16px ${F}`; ctx.fillStyle = '#172033'; ctx.textAlign = 'left'; ctx.fillText(l, ox, y);
      ctx.textAlign = 'right'; ctx.fillText((values[i] || 0).toFixed(1) + ' / 5', ox + w, y);
      ctx.strokeStyle = '#c7c7cc'; ctx.lineWidth = 1; ctx.strokeRect(ox, y + 12, w, 16);
      ctx.fillStyle = '#2b59d9'; ctx.fillRect(ox, y + 12, w * (values[i] || 0) / 5, 16);
      ctx.strokeStyle = '#e07b00'; ctx.setLineDash([5, 3]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox + w * (avg[i] || 0) / 5, y + 6); ctx.lineTo(ox + w * (avg[i] || 0) / 5, y + 34); ctx.stroke(); ctx.setLineDash([]);
    });
    return;
  }
  const path = vals => { ctx.beginPath(); vals.forEach((v, i) => { const [x, y] = pt(i, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
  ctx.strokeStyle = '#c7c7cc'; ctx.lineWidth = 1;
  for (let k = 1; k <= 5; k++) { path(Array(n).fill(k)); ctx.stroke(); }
  axes.forEach((_, i) => { const [x, y] = pt(i, 5); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); });
  path(values); ctx.fillStyle = 'rgba(43,89,217,.18)'; ctx.fill(); ctx.strokeStyle = '#2b59d9'; ctx.lineWidth = 2.5 * sx; ctx.lineJoin = 'round'; ctx.stroke();
  path(avg); ctx.strokeStyle = '#e07b00'; ctx.lineWidth = 2 * sx; ctx.setLineDash([6 * sx, 4 * sx]); ctx.stroke(); ctx.setLineDash([]);
  values.forEach((v, i) => { const [x, y] = pt(i, v); ctx.beginPath(); ctx.arc(x, y, 4.5 * sx, 0, Math.PI * 2); ctx.fillStyle = '#2b59d9'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); });
  ctx.font = `700 ${Math.round(11 * sx)}px ${F}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let k = 1; k <= 5; k++) { const [x, y] = pt(0, k); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y - 7 * sx, 10 * sx, 14 * sx); ctx.fillStyle = '#5f6b7f'; ctx.fillText(String(k), x + 5, y); }
  ctx.font = `600 ${Math.round(13 * sx)}px ${F}`; ctx.fillStyle = '#172033';
  axes.forEach((l, i) => {
    const a = (-90 + (360 * i) / n) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const x = cx + c * (R + 10 * sx), y = cy + s * (R + 10 * sx);
    ctx.textAlign = c > 0.25 ? 'left' : c < -0.25 ? 'right' : 'center';
    ctx.textBaseline = s < -0.3 ? 'bottom' : s > 0.3 ? 'top' : 'middle';
    ctx.fillText(l, x, y);
  });
  ctx.textBaseline = 'alphabetic';
}

// Focus trap + Esc for modals (dev note: modal must trap focus and close with Esc, except lock screens)
export function trapFocus(el, onEsc) {
  if (!el) return () => {};
  const prev = document.activeElement;
  const sel = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const first = () => el.querySelector(sel);
  setTimeout(() => { const f = el.querySelector('[data-autofocus]') || first(); f && f.focus(); }, 0);
  MODALS.push(el);
  const onKey = e => {
    if (MODALS[MODALS.length - 1] !== el) return; // only the topmost modal reacts
    if (e.key === 'Escape' && onEsc) { e.preventDefault(); onEsc(); return; }
    if (e.key !== 'Tab') return;
    if (!el.contains(document.activeElement)) { e.preventDefault(); (el.querySelector(sel) || el).focus(); return; }
    const items = [...el.querySelectorAll(sel)].filter(x => x.offsetParent !== null);
    if (!items.length) return;
    const a = items[0], z = items[items.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('keydown', onKey);
    const i = MODALS.indexOf(el); if (i >= 0) MODALS.splice(i, 1);
    prev && prev.focus && document.contains(prev) && prev.focus();
  };
}
const MODALS = [];

export function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
