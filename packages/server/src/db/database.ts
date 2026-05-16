import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/world.db');
let db: SqlJsDatabase;

// 封装 sql.js 使其兼容 better-sqlite3 风格的 API
class Statement {
  constructor(private db: SqlJsDatabase, private sql: string) {}
  run(...params: any[]) { this.db.run(this.sql, params); return this; }
  get(...params: any[]) {
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const obj: any = {};
      cols.forEach((c, i) => obj[c] = vals[i]);
      return obj;
    }
    stmt.free();
    return undefined;
  }
  all(...params: any[]) {
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    const rows: any[] = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const obj: any = {};
      cols.forEach((c, i) => obj[c] = vals[i]);
      rows.push(obj);
    }
    stmt.free();
    return rows;
  }
}

export function prepare(sql: string): Statement {
  return new Statement(db, sql);
}

export async function initDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  initSchema();
  saveDatabase();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      tick INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS story_arcs (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS simulation_state (
      world_id TEXT PRIMARY KEY,
      is_running INTEGER DEFAULT 0,
      current_tick INTEGER DEFAULT 0
    );
  `);
  // sql.js doesn't support CREATE INDEX inside a multi-statement exec reliably
  try { db.run('CREATE INDEX IF NOT EXISTS idx_events_world_tick ON events(world_id, tick)'); } catch {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_characters_world ON characters(world_id)'); } catch {}
}

export function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
