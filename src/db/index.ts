import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS apis (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    version TEXT,
    spec_path TEXT,
    docs_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    api_id TEXT NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_api_id ON chunks(api_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON chunks(content_hash);
`;

const FTS_SCHEMA = `
  CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    chunk_id UNINDEXED,
    title,
    content
  );
`;

const VEC_SCHEMA = `
  CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
    chunk_id text,
    embedding float[1024]
  );
`;

function initDb(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  sqliteVec.load(db);
  db.exec(SCHEMA);
  db.exec(FTS_SCHEMA);
  db.exec(VEC_SCHEMA);
}

let _db: Database.Database | null = null;
let _dbPath: string | null = null;

export function getDb(dbPath?: string): Database.Database {
  const path = dbPath ?? process.env.ALEXANDRIA_DB_PATH ?? './alexandria.db';
  if (_db) {
    if (_dbPath !== path) {
      throw new Error(
        `Database already open at "${_dbPath}", cannot open "${path}". Call closeDb() first.`,
      );
    }
    return _db;
  }
  _dbPath = path;
  _db = new Database(path);
  initDb(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    const db = _db;
    _db = null;
    _dbPath = null;
    db.close();
  }
}

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  initDb(db);
  return db;
}
