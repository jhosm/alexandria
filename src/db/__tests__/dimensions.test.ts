import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import { createTestDb, getDb, closeDb } from '../index.js';

const tmpDbPath = join(tmpdir(), `alexandria-dim-test-${process.pid}.db`);

afterEach(() => {
  closeDb();
  if (existsSync(tmpDbPath)) unlinkSync(tmpDbPath);
});

describe('Dynamic embedding dimensions', () => {
  it('should store dimension in config table on first init', () => {
    const db = createTestDb(768);
    const row = db
      .prepare("SELECT value FROM config WHERE key = 'embedding_dimension'")
      .get() as { value: string };
    expect(row.value).toBe('768');
    db.close();
  });

  it('should default to 1024 when no dimension specified', () => {
    const db = createTestDb();
    const row = db
      .prepare("SELECT value FROM config WHERE key = 'embedding_dimension'")
      .get() as { value: string };
    expect(row.value).toBe('1024');
    db.close();
  });

  it('should succeed when re-initialized with the same dimension', () => {
    // First init
    const db1 = getDb(tmpDbPath, 384);
    const row = db1
      .prepare("SELECT value FROM config WHERE key = 'embedding_dimension'")
      .get() as { value: string };
    expect(row.value).toBe('384');
    closeDb();

    // Second init with same dimension — should not throw
    const db2 = getDb(tmpDbPath, 384);
    const row2 = db2
      .prepare("SELECT value FROM config WHERE key = 'embedding_dimension'")
      .get() as { value: string };
    expect(row2.value).toBe('384');
  });

  it('should throw on dimension mismatch', () => {
    // First init with 512
    getDb(tmpDbPath, 512);
    closeDb();

    // Second init with 1024 — should throw
    expect(() => getDb(tmpDbPath, 1024)).toThrow(
      /Embedding dimension mismatch: database has 512d vectors but provider requires 1024d/,
    );
  });

  it('should create chunks_vec with correct dimension', () => {
    const db = createTestDb(384);
    // Insert a 384-dim vector to verify the table accepts it
    const embedding = new Float32Array(384);
    db.prepare(
      'INSERT INTO chunks_vec (chunk_id, embedding) VALUES (?, ?)',
    ).run('test-chunk', Buffer.from(embedding.buffer));
    const count = db.prepare('SELECT COUNT(*) as c FROM chunks_vec').get() as {
      c: number;
    };
    expect(count.c).toBe(1);
    db.close();
  });
});
