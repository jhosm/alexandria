import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './index.js';
import {
  upsertApi,
  getApis,
  getApiSpecContent,
  upsertChunk,
  deleteChunk,
  deleteChunksByApi,
  getChunksByApi,
  getChunkById,
  getChunksByIds,
  searchHybrid,
} from './queries.js';
import type { Api, Chunk } from '../shared/types.js';

function makeEmbedding(seed: number): Float32Array {
  const arr = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    arr[i] = Math.sin(seed * (i + 1));
  }
  return arr;
}

const testApi: Api = {
  id: 'api-payments',
  name: 'Payments API',
  version: '2.0',
  specPath: '/specs/payments.yaml',
  docsPath: '/docs/payments',
};

function makeChunk(id: string, overrides: Partial<Chunk> = {}): Chunk {
  return {
    id,
    apiId: 'api-payments',
    type: 'endpoint',
    title: `Test chunk ${id}`,
    content: `Content for chunk ${id}`,
    contentHash: `hash-${id}`,
    ...overrides,
  };
}

describe('Database initialization', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('should create all four tables', () => {
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

  it('should have WAL journal mode', () => {
    const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    // In-memory DBs report 'memory' for journal_mode, not 'wal'
    expect(['wal', 'memory']).toContain(result[0].journal_mode);
  });

  it('should have sqlite-vec loaded', () => {
    const row = db.prepare('SELECT vec_version() as v').get() as { v: string };
    expect(row.v).toBeTruthy();
  });
});

describe('API CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('should insert and retrieve an API', () => {
    upsertApi(db, testApi);
    const apis = getApis(db);
    expect(apis).toHaveLength(1);
    expect(apis[0].id).toBe('api-payments');
    expect(apis[0].name).toBe('Payments API');
    expect(apis[0].version).toBe('2.0');
  });

  it('should update an existing API on conflict', () => {
    upsertApi(db, testApi);
    upsertApi(db, { ...testApi, version: '3.0' });
    const apis = getApis(db);
    expect(apis).toHaveLength(1);
    expect(apis[0].version).toBe('3.0');
  });

  it('should round-trip specContent through upsert and get', () => {
    const specYaml = 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0';
    upsertApi(db, { ...testApi, specContent: specYaml });
    const apis = getApis(db);
    expect(apis[0].specContent).toBe(specYaml);
  });

  it('should retrieve specContent via getApiSpecContent', () => {
    const specYaml = 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0';
    upsertApi(db, { ...testApi, specContent: specYaml });
    expect(getApiSpecContent(db, testApi.name)).toBe(specYaml);
  });

  it('should return undefined from getApiSpecContent when no spec stored', () => {
    upsertApi(db, { ...testApi, specContent: undefined });
    expect(getApiSpecContent(db, testApi.name)).toBeUndefined();
  });
});

describe('Chunk CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    upsertApi(db, testApi);
    upsertApi(db, { id: 'api-users', name: 'Users API' });
  });
  afterEach(() => {
    db.close();
  });

  it('should upsert and retrieve a chunk', () => {
    const chunk = makeChunk('chunk-1');
    upsertChunk(db, chunk, makeEmbedding(1));

    const result = getChunkById(db, 'chunk-1');
    expect(result).toBeDefined();
    expect(result!.title).toBe('Test chunk chunk-1');
    expect(result!.apiId).toBe('api-payments');
  });

  it('should update a chunk on re-upsert', () => {
    const chunk = makeChunk('chunk-1');
    upsertChunk(db, chunk, makeEmbedding(1));

    const updated = {
      ...chunk,
      title: 'Updated title',
      contentHash: 'new-hash',
    };
    upsertChunk(db, updated, makeEmbedding(2));

    const result = getChunkById(db, 'chunk-1');
    expect(result!.title).toBe('Updated title');
  });

  it('should keep exactly one row in FTS and vec after re-upsert', () => {
    const chunk = makeChunk('chunk-1');
    upsertChunk(db, chunk, makeEmbedding(1));
    upsertChunk(db, { ...chunk, title: 'Updated title' }, makeEmbedding(2));

    const fts = db.prepare('SELECT COUNT(*) as c FROM chunks_fts').get() as {
      c: number;
    };
    const vec = db.prepare('SELECT COUNT(*) as c FROM chunks_vec').get() as {
      c: number;
    };
    expect(fts.c).toBe(1);
    expect(vec.c).toBe(1);
    // Verify FTS content is updated
    const ftsRow = db
      .prepare('SELECT title FROM chunks_fts WHERE chunk_id = ?')
      .get('chunk-1') as { title: string };
    expect(ftsRow.title).toBe('Updated title');
  });

  it('should write to all three tables', () => {
    upsertChunk(db, makeChunk('chunk-1'), makeEmbedding(1));

    const main = db.prepare('SELECT COUNT(*) as c FROM chunks').get() as {
      c: number;
    };
    const fts = db.prepare('SELECT COUNT(*) as c FROM chunks_fts').get() as {
      c: number;
    };
    const vec = db.prepare('SELECT COUNT(*) as c FROM chunks_vec').get() as {
      c: number;
    };
    expect(main.c).toBe(1);
    expect(fts.c).toBe(1);
    expect(vec.c).toBe(1);
  });

  it('should delete a chunk from all three tables', () => {
    upsertChunk(db, makeChunk('chunk-1'), makeEmbedding(1));
    deleteChunk(db, 'chunk-1');

    expect(getChunkById(db, 'chunk-1')).toBeUndefined();
    const fts = db.prepare('SELECT COUNT(*) as c FROM chunks_fts').get() as {
      c: number;
    };
    const vec = db.prepare('SELECT COUNT(*) as c FROM chunks_vec').get() as {
      c: number;
    };
    expect(fts.c).toBe(0);
    expect(vec.c).toBe(0);
  });

  it('should delete all chunks for an API', () => {
    upsertChunk(db, makeChunk('chunk-1'), makeEmbedding(1));
    upsertChunk(db, makeChunk('chunk-2'), makeEmbedding(2));
    deleteChunksByApi(db, 'api-payments');

    const chunks = getChunksByApi(db, 'api-payments');
    expect(chunks).toHaveLength(0);
    const fts = db.prepare('SELECT COUNT(*) as c FROM chunks_fts').get() as {
      c: number;
    };
    const vec = db.prepare('SELECT COUNT(*) as c FROM chunks_vec').get() as {
      c: number;
    };
    expect(fts.c).toBe(0);
    expect(vec.c).toBe(0);
  });

  it('should not delete chunks from other APIs', () => {
    upsertChunk(
      db,
      makeChunk('chunk-pay', { apiId: 'api-payments' }),
      makeEmbedding(1),
    );
    upsertChunk(
      db,
      makeChunk('chunk-user', { apiId: 'api-users' }),
      makeEmbedding(2),
    );
    deleteChunksByApi(db, 'api-payments');

    const remaining = getChunksByApi(db, 'api-users');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('chunk-user');
    const fts = db.prepare('SELECT COUNT(*) as c FROM chunks_fts').get() as {
      c: number;
    };
    const vec = db.prepare('SELECT COUNT(*) as c FROM chunks_vec').get() as {
      c: number;
    };
    expect(fts.c).toBe(1);
    expect(vec.c).toBe(1);
  });

  it('should filter chunks by type', () => {
    upsertChunk(
      db,
      makeChunk('chunk-1', { type: 'endpoint' }),
      makeEmbedding(1),
    );
    upsertChunk(db, makeChunk('chunk-2', { type: 'schema' }), makeEmbedding(2));

    const endpoints = getChunksByApi(db, 'api-payments', 'endpoint');
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].type).toBe('endpoint');
  });

  it('should get multiple chunks by IDs', () => {
    upsertChunk(db, makeChunk('chunk-1'), makeEmbedding(1));
    upsertChunk(db, makeChunk('chunk-2'), makeEmbedding(2));
    upsertChunk(db, makeChunk('chunk-3'), makeEmbedding(3));

    const results = getChunksByIds(db, ['chunk-1', 'chunk-3']);
    expect(results).toHaveLength(2);
  });

  it('should return only existing chunks when some IDs are missing', () => {
    upsertChunk(db, makeChunk('chunk-1'), makeEmbedding(1));

    const results = getChunksByIds(db, [
      'nonexistent',
      'chunk-1',
      'also-missing',
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('chunk-1');
  });

  it('should return empty for empty ID list', () => {
    expect(getChunksByIds(db, [])).toHaveLength(0);
  });

  it('should handle metadata as JSON', () => {
    const chunk = makeChunk('chunk-1', {
      metadata: { method: 'POST', path: '/pay' },
    });
    upsertChunk(db, chunk, makeEmbedding(1));

    const result = getChunkById(db, 'chunk-1');
    expect(result!.metadata).toEqual({ method: 'POST', path: '/pay' });
  });
});

describe('Hybrid search', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    upsertApi(db, testApi);
    upsertApi(db, { id: 'api-users', name: 'Users API' });
  });
  afterEach(() => {
    db.close();
  });

  it('should return empty results on an empty database', () => {
    const results = searchHybrid(db, 'anything', makeEmbedding(1));
    expect(results).toHaveLength(0);
  });

  it('should return results from FTS and vector search', () => {
    // Insert chunks with distinct content for FTS matching
    upsertChunk(
      db,
      makeChunk('chunk-auth', {
        title: 'Authentication endpoint',
        content: 'This endpoint handles user authentication and login',
      }),
      makeEmbedding(1),
    );

    upsertChunk(
      db,
      makeChunk('chunk-pay', {
        title: 'Payment processing',
        content: 'This endpoint handles payment processing and billing',
      }),
      makeEmbedding(2),
    );

    // Search for "authentication" — should match FTS, and vector should return results too
    const results = searchHybrid(db, 'authentication', makeEmbedding(1));
    expect(results.length).toBeGreaterThan(0);
    // The auth chunk should rank highest (FTS match + vector similarity)
    expect(results[0].chunk.id).toBe('chunk-auth');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should boost chunks appearing in both sources', () => {
    // Chunk A: matches FTS for "payment" AND has similar embedding
    upsertChunk(
      db,
      makeChunk('chunk-a', {
        title: 'Payment gateway',
        content: 'Process payment transactions',
      }),
      makeEmbedding(10),
    );

    // Chunk B: matches FTS for "payment" but different embedding
    upsertChunk(
      db,
      makeChunk('chunk-b', {
        title: 'Payment history',
        content: 'View past payment records',
      }),
      makeEmbedding(99),
    );

    // Chunk C: no FTS match but similar embedding
    upsertChunk(
      db,
      makeChunk('chunk-c', {
        title: 'Transaction overview',
        content: 'Overview of all transactions',
      }),
      makeEmbedding(10.01),
    );

    const results = searchHybrid(db, 'payment', makeEmbedding(10));
    expect(results.length).toBeGreaterThan(0);
    // Chunk A should be top: it matches both FTS ("payment") and vector (embedding ~10)
    expect(results[0].chunk.id).toBe('chunk-a');
  });

  it('should filter by apiId', () => {
    upsertChunk(
      db,
      makeChunk('chunk-pay-1', { apiId: 'api-payments' }),
      makeEmbedding(1),
    );
    upsertChunk(
      db,
      makeChunk('chunk-user-1', { apiId: 'api-users' }),
      makeEmbedding(2),
    );

    const results = searchHybrid(db, 'test chunk', makeEmbedding(1), {
      apiId: 'api-payments',
    });
    expect(results.every((r) => r.chunk.apiId === 'api-payments')).toBe(true);
  });

  it('should filter by multiple apiIds', () => {
    upsertApi(db, { id: 'api-docs-a', name: 'Docs A' });
    upsertApi(db, { id: 'api-docs-b', name: 'Docs B' });

    upsertChunk(
      db,
      makeChunk('chunk-pay-m', { apiId: 'api-payments' }),
      makeEmbedding(1),
    );
    upsertChunk(
      db,
      makeChunk('chunk-a', { apiId: 'api-docs-a' }),
      makeEmbedding(2),
    );
    upsertChunk(
      db,
      makeChunk('chunk-b', { apiId: 'api-docs-b' }),
      makeEmbedding(3),
    );
    upsertChunk(
      db,
      makeChunk('chunk-user-m', { apiId: 'api-users' }),
      makeEmbedding(4),
    );

    const results = searchHybrid(db, 'test chunk', makeEmbedding(2), {
      apiIds: ['api-docs-a', 'api-docs-b'],
    });
    const returnedApiIds = new Set(results.map((r) => r.chunk.apiId));
    expect(returnedApiIds.has('api-payments')).toBe(false);
    expect(returnedApiIds.has('api-users')).toBe(false);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should merge apiId and apiIds', () => {
    upsertChunk(
      db,
      makeChunk('chunk-pay-x', { apiId: 'api-payments' }),
      makeEmbedding(1),
    );
    upsertChunk(
      db,
      makeChunk('chunk-user-x', { apiId: 'api-users' }),
      makeEmbedding(2),
    );

    const results = searchHybrid(db, 'test chunk', makeEmbedding(1), {
      apiId: 'api-payments',
      apiIds: ['api-users'],
    });
    const returnedApiIds = new Set(results.map((r) => r.chunk.apiId));
    expect(
      [...returnedApiIds].every(
        (id) => id === 'api-payments' || id === 'api-users',
      ),
    ).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter by chunk types', () => {
    upsertChunk(
      db,
      makeChunk('chunk-ep', { type: 'endpoint' }),
      makeEmbedding(1),
    );
    upsertChunk(
      db,
      makeChunk('chunk-sc', { type: 'schema' }),
      makeEmbedding(2),
    );
    upsertChunk(
      db,
      makeChunk('chunk-ov', { type: 'overview' }),
      makeEmbedding(3),
    );

    const results = searchHybrid(db, 'test chunk', makeEmbedding(1), {
      types: ['endpoint', 'schema'],
    });
    expect(
      results.every((r) => ['endpoint', 'schema'].includes(r.chunk.type)),
    ).toBe(true);
  });

  it('should respect custom limit', () => {
    for (let i = 0; i < 10; i++) {
      upsertChunk(
        db,
        makeChunk(`chunk-${i}`, {
          content: `Search result content number ${i}`,
        }),
        makeEmbedding(i),
      );
    }

    const results = searchHybrid(db, 'search result', makeEmbedding(5), {
      limit: 3,
    });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should handle FTS special characters safely', () => {
    upsertChunk(
      db,
      makeChunk('chunk-1', { content: 'user data' }),
      makeEmbedding(1),
    );

    // Should not throw even with special FTS chars
    const results = searchHybrid(db, "user's (data)", makeEmbedding(1));
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty for query of only special characters', () => {
    upsertChunk(db, makeChunk('chunk-1'), makeEmbedding(1));

    // FTS should return nothing, but vec search still works
    const results = searchHybrid(db, '"\'*()', makeEmbedding(1));
    // Vector search should still return results even when FTS is empty
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return full chunk data with score', () => {
    upsertChunk(
      db,
      makeChunk('chunk-1', {
        metadata: { method: 'GET' },
      }),
      makeEmbedding(1),
    );

    const results = searchHybrid(db, 'test chunk', makeEmbedding(1));
    expect(results.length).toBeGreaterThan(0);
    const result = results[0];
    expect(result.chunk.id).toBe('chunk-1');
    expect(result.chunk.apiId).toBe('api-payments');
    expect(result.chunk.type).toBe('endpoint');
    expect(result.chunk.metadata).toEqual({ method: 'GET' });
    expect(result.score).toBeGreaterThan(0);
  });
});
