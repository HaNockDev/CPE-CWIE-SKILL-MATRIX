// Stateless signed tokens (works on serverless): base64url(payload).hmac
import crypto from 'node:crypto';
import { one, run } from './db.js';

let secret = process.env.APP_SECRET;
async function getSecret() {
  if (secret) return secret;
  const row = await one("SELECT value FROM settings WHERE key = 'secret'");
  if (row) return (secret = row.value);
  const v = crypto.randomBytes(32).toString('hex');
  await run("INSERT OR IGNORE INTO settings (key, value) VALUES ('secret', ?)", [v]);
  return (secret = (await one("SELECT value FROM settings WHERE key = 'secret'")).value);
}

const b64 = s => Buffer.from(s).toString('base64url');
export async function sign(payload, ttlSec) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + ttlSec * 1000 }));
  const mac = crypto.createHmac('sha256', await getSecret()).update(body).digest('base64url');
  return body + '.' + mac;
}
export async function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const want = crypto.createHmac('sha256', await getSecret()).update(body).digest('base64url');
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

const bearer = req => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

export const DEFAULT_ADMIN_PASSWORD = 'admin1234';
export const adminPassword = () => process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

export function requireRole(role) {
  return async (req, res, next) => {
    const p = await verify(bearer(req));
    if (!p || p.role !== role) return res.status(401).json({ error: 'unauthorized', message: 'กรุณาเข้าสู่ระบบอีกครั้ง' });
    req.auth = p;
    next();
  };
}
