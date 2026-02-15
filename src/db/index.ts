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

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const FTS_SCHEMA = `
  CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    chunk_id UNINDEXED,
    title,
    content
  );
`;

function initDb(db: Database.Database, dimension: number = 1024): void {
  if (!Number.isInteger(dimension) || dimension < 1) {
    throw new Error(`Invalid embedding dimension: ${dimension}`);
  }

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  sqliteVec.load(db);
  db.exec(SCHEMA);
  db.exec(FTS_SCHEMA);

  const stored = db
    .prepare("SELECT value FROM config WHERE key = 'embedding_dimension'")
    .get() as { value: string } | undefined;

  if (stored) {
    const storedDim = Number(stored.value);
    if (storedDim !== dimension) {
      throw new Error(
        `Embedding dimension mismatch: database has ${storedDim}d vectors but provider requires ${dimension}d. Re-index with: npm run ingest -- --all`,
      );
    }
  } else {
    db.prepare(
      "INSERT INTO config (key, value) VALUES ('embedding_dimension', ?)",
    ).run(String(dimension));
  }

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
      chunk_id text,
      embedding float[${dimension}]
    );
  `);
}

let _db: Database.Database | null = null;
let _dbPath: string | null = null;

export function getDb(dbPath?: string, dimension?: number): Database.Database {
  const path = dbPath ?? process.env.ALEXANDRIA_DB_PATH ?? './alexandria.db';
  if (_db) {
    if (_dbPath !== path) {
      throw new Error(
        `Database already open at "${_dbPath}", cannot open "${path}". Call closeDb() first.`,
      );
    }
    if (dimension !== undefined) {
      const stored = _db
        .prepare("SELECT value FROM config WHERE key = 'embedding_dimension'")
        .get() as { value: string } | undefined;
      if (stored && Number(stored.value) !== dimension) {
        throw new Error(
          `Embedding dimension mismatch: database has ${stored.value}d vectors but provider requires ${dimension}d. Re-index with: npm run ingest -- --all`,
        );
      }
    }
    return _db;
  }
  _dbPath = path;
  _db = new Database(path);
  initDb(_db, dimension);
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

export function createTestDb(dimension: number = 1024): Database.Database {
  const db = new Database(':memory:');
  initDb(db, dimension);
  return db;
}
