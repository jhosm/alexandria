import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../../db/index.js';
import { getChunksByApi, getApis } from '../../db/queries.js';
import type { Chunk } from '../../shared/types.js';
import type Database from 'better-sqlite3';

// Mock dependencies before importing the module under test
vi.mock('../openapi-parser.js', () => ({
  parseOpenApiSpec: vi.fn(),
}));
vi.mock('../markdown-parser.js', () => ({
  parseMarkdownFile: vi.fn(),
}));
vi.mock('../embedder.js', () => ({
  embedDocuments: vi.fn(),
  getDimension: vi.fn().mockReturnValue(1024),
}));
vi.mock('../../db/index.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../db/index.js')>();
  return {
    ...original,
    getDb: vi.fn(),
    closeDb: vi.fn(),
  };
});

import { ingestApi, ingestDocs } from '../index.js';
import { parseOpenApiSpec } from '../openapi-parser.js';
import { parseMarkdownFile } from '../markdown-parser.js';
import { embedDocuments } from '../embedder.js';
import { getDb } from '../../db/index.js';

const FIXTURES_DIR = import.meta.dirname + '/fixtures';

function makeChunk(
  id: string,
  apiId: string,
  overrides?: Partial<Chunk>,
): Chunk {
  return {
    id,
    apiId,
    type: 'endpoint',
    title: `Chunk ${id}`,
    content: `Content for ${id}`,
    contentHash: `hash-${id}`,
    ...overrides,
  };
}

function fakeEmbedding(): Float32Array {
  return new Float32Array(1024);
}

/** Helper: mock parseOpenApiSpec to return chunks with the apiId it receives */
function mockSpecReturning(
  ...chunkDefs: Array<{ id: string; overrides?: Partial<Chunk> }>
) {
  vi.mocked(parseOpenApiSpec).mockImplementation(async (_path, apiId) =>
    chunkDefs.map((def) => makeChunk(def.id, apiId, def.overrides)),
  );
}

describe('ingestApi', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db);
    vi.mocked(embedDocuments).mockImplementation(async (texts) =>
      texts.map(() => fakeEmbedding()),
    );
    vi.mocked(parseOpenApiSpec).mockResolvedValue([]);
    vi.mocked(parseMarkdownFile).mockResolvedValue([]);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('ingests spec-only (no docs), embeds all new chunks', async () => {
    mockSpecReturning({ id: 'c1' }, { id: 'c2' });

    const result = await ingestApi(
      'testapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
    );

    expect(result.api).toBe('testapi');
    expect(result.total).toBe(2);
    expect(result.embedded).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.deleted).toBe(0);
    expect(embedDocuments).toHaveBeenCalledOnce();
  });

  it('ingests spec + docs directory', async () => {
    mockSpecReturning({ id: 'spec1' });
    let docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path, apiId) => [
      makeChunk(`doc${docIdx++}`, apiId, { type: 'guide' }),
    ]);

    const result = await ingestApi(
      'testapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
      FIXTURES_DIR,
    );

    expect(result.total).toBe(3); // 1 spec + 2 docs (fixtures has 2 .md files)
    expect(result.embedded).toBe(3);
    expect(parseMarkdownFile).toHaveBeenCalled();
  });

  it('skips docs parsing when docsPath does not exist', async () => {
    mockSpecReturning({ id: 'c1' });

    const result = await ingestApi(
      'testapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
      '/nonexistent/docs',
    );

    expect(result.total).toBe(1);
    expect(parseMarkdownFile).not.toHaveBeenCalled();
  });

  it('skips embedding when all chunks are unchanged', async () => {
    // First ingest: all new
    mockSpecReturning({ id: 'c1' });

    await ingestApi('testapi', FIXTURES_DIR + '/sample-openapi.yaml');

    // Second ingest: return chunks with same hash from DB
    const apis = getApis(db);
    const apiId = apis[0].id;
    const dbChunks = getChunksByApi(db, apiId);

    vi.mocked(parseOpenApiSpec).mockResolvedValue(
      dbChunks.map((c) => ({ ...c })),
    );
    vi.mocked(embedDocuments).mockClear();

    const result = await ingestApi(
      'testapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
    );

    expect(result.embedded).toBe(0);
    expect(result.skipped).toBe(1);
    expect(embedDocuments).toHaveBeenCalledWith([]);
  });

  it('re-embeds only changed chunks', async () => {
    // First ingest
    mockSpecReturning({ id: 'c1' }, { id: 'c2' });

    await ingestApi('testapi', FIXTURES_DIR + '/sample-openapi.yaml');

    // Second ingest: c1 unchanged, c2 changed
    const apis = getApis(db);
    const apiId = apis[0].id;
    const dbChunks = getChunksByApi(db, apiId);

    vi.mocked(parseOpenApiSpec).mockResolvedValue([
      { ...dbChunks.find((c) => c.id === 'c1')! },
      {
        ...dbChunks.find((c) => c.id === 'c2')!,
        contentHash: 'new-hash',
        content: 'updated',
      },
    ]);
    vi.mocked(embedDocuments).mockClear();

    const result = await ingestApi(
      'testapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
    );

    expect(result.embedded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(vi.mocked(embedDocuments).mock.calls[0][0]).toEqual(['updated']);
  });

  it('deletes orphaned chunks not in current parse results', async () => {
    // First ingest with 2 chunks
    mockSpecReturning({ id: 'c1' }, { id: 'c2' });

    await ingestApi('testapi', FIXTURES_DIR + '/sample-openapi.yaml');

    const apis = getApis(db);
    const apiId = apis[0].id;
    expect(getChunksByApi(db, apiId)).toHaveLength(2);

    // Second ingest with only c1 — c2 should be deleted
    const dbChunks = getChunksByApi(db, apiId);
    const keepChunk = dbChunks.find((c) => c.id === 'c1')!;
    vi.mocked(parseOpenApiSpec).mockResolvedValue([{ ...keepChunk }]);

    const result = await ingestApi(
      'testapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
    );

    expect(result.deleted).toBe(1);
    expect(getChunksByApi(db, apiId)).toHaveLength(1);
    expect(getChunksByApi(db, apiId)[0].id).toBe('c1');
  });

  it('upserts API registry entry with docsPath', async () => {
    mockSpecReturning({ id: 'c1' });

    await ingestApi(
      'myapi',
      FIXTURES_DIR + '/sample-openapi.yaml',
      '/some/docs',
    );

    const apis = getApis(db);
    expect(apis).toHaveLength(1);
    expect(apis[0].name).toBe('myapi');
    expect(apis[0].specPath).toContain('sample-openapi.yaml');
    expect(apis[0].docsPath).toContain('/some/docs');
  });

  it('upserts API registry without docsPath when not provided', async () => {
    mockSpecReturning({ id: 'c1' });

    await ingestApi('myapi', FIXTURES_DIR + '/sample-openapi.yaml');

    const apis = getApis(db);
    expect(apis[0].docsPath).toBeUndefined();
  });

  it('produces deterministic API IDs from name', async () => {
    vi.mocked(parseOpenApiSpec).mockResolvedValue([]);

    await ingestApi('testapi', FIXTURES_DIR + '/sample-openapi.yaml');
    await ingestApi('testapi', FIXTURES_DIR + '/sample-openapi.yaml');

    const apis = getApis(db);
    expect(apis).toHaveLength(1);
  });
});

describe('ingestion pipeline verification', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db);
    vi.mocked(embedDocuments).mockImplementation(async (texts) =>
      texts.map(() => fakeEmbedding()),
    );
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('5.1→5.2→5.3: ingest spec+docs, skip unchanged, clean orphans', async () => {
    // --- 5.1: Index spec + docs, confirm chunks in DB ---
    vi.mocked(parseOpenApiSpec).mockImplementation(async (_path, apiId) => [
      makeChunk('ep-list', apiId, {
        type: 'endpoint',
        title: 'GET /pets',
        content: 'List all pets',
      }),
      makeChunk('ep-create', apiId, {
        type: 'endpoint',
        title: 'POST /pets',
        content: 'Create a pet',
      }),
      makeChunk('ep-get', apiId, {
        type: 'endpoint',
        title: 'GET /pets/{id}',
        content: 'Get a pet by ID',
      }),
    ]);
    let docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path, apiId) => [
      makeChunk(`doc-${docIdx++}`, apiId, {
        type: 'guide',
        title: 'Guide',
        content: 'A guide doc',
      }),
    ]);

    const r1 = await ingestApi(
      'petstore',
      FIXTURES_DIR + '/sample-openapi.yaml',
      FIXTURES_DIR,
    );

    expect(r1.total).toBe(5); // 3 endpoints + 2 docs
    expect(r1.embedded).toBe(5);
    expect(r1.skipped).toBe(0);
    expect(r1.deleted).toBe(0);

    const apis = getApis(db);
    expect(apis).toHaveLength(1);
    expect(apis[0].name).toBe('petstore');

    const apiId = apis[0].id;
    const chunks = getChunksByApi(db, apiId);
    expect(chunks).toHaveLength(5);
    expect(chunks.filter((c) => c.type === 'endpoint')).toHaveLength(3);
    expect(chunks.filter((c) => c.type === 'guide')).toHaveLength(2);

    // --- 5.2: Re-run, confirm no re-embedding ---
    const storedChunks = getChunksByApi(db, apiId);
    vi.mocked(parseOpenApiSpec).mockResolvedValue(
      storedChunks.filter((c) => c.type === 'endpoint').map((c) => ({ ...c })),
    );
    docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path) => {
      const stored = storedChunks.filter((c) => c.type === 'guide');
      return [{ ...stored[docIdx++] }];
    });
    vi.mocked(embedDocuments).mockClear();

    const r2 = await ingestApi(
      'petstore',
      FIXTURES_DIR + '/sample-openapi.yaml',
      FIXTURES_DIR,
    );

    expect(r2.total).toBe(5);
    expect(r2.embedded).toBe(0);
    expect(r2.skipped).toBe(5);
    expect(r2.deleted).toBe(0);
    expect(embedDocuments).toHaveBeenCalledWith([]);
    expect(getChunksByApi(db, apiId)).toHaveLength(5);

    // --- 5.3: Remove an endpoint, re-run, confirm orphan cleanup ---
    const remaining = storedChunks.filter((c) => c.id !== 'ep-get');
    vi.mocked(parseOpenApiSpec).mockResolvedValue(
      remaining.filter((c) => c.type === 'endpoint').map((c) => ({ ...c })),
    );
    docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path) => {
      const stored = remaining.filter((c) => c.type === 'guide');
      return [{ ...stored[docIdx++] }];
    });
    vi.mocked(embedDocuments).mockClear();

    const r3 = await ingestApi(
      'petstore',
      FIXTURES_DIR + '/sample-openapi.yaml',
      FIXTURES_DIR,
    );

    expect(r3.total).toBe(4);
    expect(r3.embedded).toBe(0);
    expect(r3.skipped).toBe(4);
    expect(r3.deleted).toBe(1);
    expect(embedDocuments).toHaveBeenCalledWith([]);

    const finalChunks = getChunksByApi(db, apiId);
    expect(finalChunks).toHaveLength(4);
    expect(finalChunks.find((c) => c.id === 'ep-get')).toBeUndefined();
  });
});

describe('ingestDocs', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db);
    vi.mocked(embedDocuments).mockImplementation(async (texts) =>
      texts.map(() => fakeEmbedding()),
    );
    vi.mocked(parseMarkdownFile).mockResolvedValue([]);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('ingests docs-only entry (no spec parsing)', async () => {
    let docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path, apiId) => [
      makeChunk(`doc${docIdx++}`, apiId, { type: 'guide' }),
    ]);

    const result = await ingestDocs('arch', FIXTURES_DIR);

    expect(result.api).toBe('arch');
    expect(result.total).toBe(2); // fixtures has 2 .md files
    expect(result.embedded).toBe(2);
    expect(parseOpenApiSpec).not.toHaveBeenCalled();

    const apis = getApis(db);
    expect(apis).toHaveLength(1);
    expect(apis[0].name).toBe('arch');
    expect(apis[0].specPath).toBeUndefined();
    expect(apis[0].docsPath).toContain('fixtures');
  });

  it('applies incremental re-indexing to docs entries', async () => {
    let docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path, apiId) => [
      makeChunk(`doc${docIdx++}`, apiId, { type: 'guide' }),
    ]);

    await ingestDocs('arch', FIXTURES_DIR);

    // Re-ingest with same content
    const apis = getApis(db);
    const apiId = apis[0].id;
    const dbChunks = getChunksByApi(db, apiId);

    docIdx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path) => {
      return [{ ...dbChunks[docIdx++] }];
    });
    vi.mocked(embedDocuments).mockClear();

    const result = await ingestDocs('arch', FIXTURES_DIR);

    expect(result.embedded).toBe(0);
    expect(result.skipped).toBe(2);
  });
});
