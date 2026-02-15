import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getDb, closeDb } from './index.js';

describe('getDb / closeDb singleton', () => {
  let tmpDir: string;

  afterEach(() => {
    closeDb();
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('opens a file-based database at the given path', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-test-'));
    const dbPath = join(tmpDir, 'test.db');

    const db = getDb(dbPath);
    expect(db).toBeDefined();
    expect(db.open).toBe(true);
  });

  it('returns the same instance on repeated calls with same path', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-test-'));
    const dbPath = join(tmpDir, 'test.db');

    const db1 = getDb(dbPath);
    const db2 = getDb(dbPath);
    expect(db1).toBe(db2);
  });

  it('throws when opening a different path without closing first', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-test-'));
    const path1 = join(tmpDir, 'a.db');
    const path2 = join(tmpDir, 'b.db');

    getDb(path1);
    expect(() => getDb(path2)).toThrow('already open');
  });

  it('allows reopening with a new path after closeDb()', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-test-'));
    const path1 = join(tmpDir, 'a.db');
    const path2 = join(tmpDir, 'b.db');

    const db1 = getDb(path1);
    closeDb();
    expect(db1.open).toBe(false);

    const db2 = getDb(path2);
    expect(db2.open).toBe(true);
    expect(db2).not.toBe(db1);
  });

  it('closeDb() is a no-op when no database is open', () => {
    expect(() => closeDb()).not.toThrow();
  });

  it('creates schema tables in the opened database', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-test-'));
    const dbPath = join(tmpDir, 'test.db');

    const db = getDb(dbPath);
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);

    expect(names).toContain('apis');
    expect(names).toContain('chunks');
    expect(names).toContain('chunks_fts');
    expect(names).toContain('chunks_vec');
  });
});
