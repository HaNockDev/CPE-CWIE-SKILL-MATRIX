// Dump the whole database as SQL (schema + data) to stdout.
// Works with a local SQLite file or Turso: uses the same env vars as the app.
//   node scripts/backup-db.mjs > backup.sql
// Restore into an empty database:
//   turso db shell <new-db> < backup.sql      or      sqlite3 exam.db < backup.sql
import { createClient } from '@libsql/client';
import path from 'node:path';

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:' + path.resolve('data/exam.db');
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const lit = v => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return "X'" + Buffer.from(v).toString('hex') + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
};

const out = s => process.stdout.write(s + '\n');
const objects = (await db.execute("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' AND name NOT LIKE 'libsql_%' ORDER BY type = 'table' DESC, name")).rows;

out('-- PSRU exam backup ' + new Date().toISOString());
out('PRAGMA foreign_keys=OFF;');
out('BEGIN TRANSACTION;');
for (const o of objects.filter(o => o.type === 'table')) {
  out(o.sql.replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ') + ';');
  const cols = (await db.execute(`PRAGMA table_info("${o.name}")`)).rows.map(c => c.name);
  const colList = cols.map(c => '"' + c + '"').join(',');
  let n = 0;
  for (let offset = 0; ; offset += 500) { // page through large tables
    const rows = (await db.execute(`SELECT ${colList} FROM "${o.name}" ORDER BY rowid LIMIT 500 OFFSET ${offset}`)).rows;
    for (const r of rows) out(`INSERT INTO "${o.name}" (${colList}) VALUES (${cols.map(c => lit(r[c])).join(',')});`);
    n += rows.length;
    if (rows.length < 500) break;
  }
  process.stderr.write(`${o.name}: ${n} rows\n`);
}
for (const o of objects.filter(o => o.type !== 'table')) out(o.sql.replace(/^CREATE (UNIQUE )?INDEX /i, 'CREATE $1INDEX IF NOT EXISTS ') + ';');
out('COMMIT;');
