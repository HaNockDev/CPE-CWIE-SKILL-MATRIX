// SQLite access through libSQL.
// - Local / Hugging Face Spaces: a SQLite file (default ./data/exam.db, or /data/exam.db when HF persistent storage is mounted)
// - Vercel: a Turso (libSQL) database via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN, because Vercel's filesystem is ephemeral
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

function resolveUrl() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.VERCEL) {
    console.warn('[db] VERCEL without TURSO_DATABASE_URL: using /tmp/exam.db — data will be lost when the function is recycled');
    return 'file:/tmp/exam.db';
  }
  const dir = fs.existsSync('/data') && isWritable('/data') ? '/data' : path.resolve('data');
  fs.mkdirSync(dir, { recursive: true });
  return 'file:' + path.join(dir, 'exam.db');
}

function isWritable(dir) {
  try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; }
}

export const dbUrl = resolveUrl();
export const db = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN });
export const isEphemeral = dbUrl.startsWith('file:/tmp/');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS groups (
    key TEXT PRIMARY KEY, name TEXT NOT NULL, short TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY, group_key TEXT NOT NULL REFERENCES groups(key),
    type TEXT NOT NULL CHECK (type IN ('single','multi')),
    text TEXT NOT NULL, image TEXT, options TEXT NOT NULL, explain TEXT,
    difficulty INTEGER NOT NULL DEFAULT 1, points INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_key)`,
  `CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL,
    duration_min INTEGER NOT NULL, max_leaves INTEGER NOT NULL DEFAULT 3, picks TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, published INTEGER NOT NULL DEFAULT 0, published_at INTEGER,
    set_ready INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS roster (
    round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE, sid TEXT NOT NULL,
    name TEXT NOT NULL, email TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (round_id, sid))`,
  `CREATE TABLE IF NOT EXISTS attempts (
    round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE, sid TEXT NOT NULL,
    question_ids TEXT NOT NULL, option_orders TEXT NOT NULL, answers TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'not_started', started_at INTEGER, deadline_at INTEGER,
    submitted_at INTEGER, leaves INTEGER NOT NULL DEFAULT 0, auto_reason TEXT,
    PRIMARY KEY (round_id, sid))`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, round_id TEXT NOT NULL, sid TEXT NOT NULL,
    at INTEGER NOT NULL, kind TEXT NOT NULL, duration_ms INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_events_who ON events(round_id, sid)`,
  `CREATE TABLE IF NOT EXISTS results (
    round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE, sid TEXT NOT NULL,
    ref TEXT NOT NULL UNIQUE, groups TEXT NOT NULL, correct INTEGER NOT NULL, total INTEGER NOT NULL,
    pct REAL NOT NULL, scored_at INTEGER NOT NULL, PRIMARY KEY (round_id, sid))`,
  `CREATE TABLE IF NOT EXISTS courses (
    tag TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS email_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT, to_addr TEXT NOT NULL, subject TEXT NOT NULL,
    body TEXT NOT NULL, created_at INTEGER NOT NULL, sent_at INTEGER, error TEXT)`
];

let ready;
export function init() {
  if (!ready) ready = (async () => {
    await db.execute('PRAGMA foreign_keys = ON').catch(() => {});
    await db.batch(SCHEMA, 'write');
    await migrate();
    const { seedIfEmpty, ensureCourses } = await import('./seed.js');
    await seedIfEmpty();
    await ensureCourses();
  })();
  return ready;
}

// Columns added after the first release — existing databases get them on startup, data is kept
async function migrate() {
  const cols = (await db.execute('PRAGMA table_info(questions)')).rows.map(r => r.name);
  if (!cols.includes('tags')) await db.execute("ALTER TABLE questions ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
}

export async function all(sql, args = []) { return (await db.execute({ sql, args })).rows; }
export async function one(sql, args = []) { return (await db.execute({ sql, args })).rows[0] || null; }
export async function run(sql, args = []) { return db.execute({ sql, args }); }
export const J = (s, d) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };
