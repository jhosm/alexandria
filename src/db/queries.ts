import type Database from 'better-sqlite3';
import {
  CHUNK_TYPES,
  type Api,
  type Chunk,
  type ChunkType,
  type SearchOptions,
  type SearchResult,
} from '../shared/types.js';

// --- APIs ---

export function upsertApi(db: Database.Database, api: Api): void {
  db.prepare(
    `
    INSERT INTO apis (id, name, version, spec_path, docs_path, source_hash)
    VALUES (@id, @name, @version, @specPath, @docsPath, @sourceHash)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      version = excluded.version,
      spec_path = excluded.spec_path,
      docs_path = excluded.docs_path,
      source_hash = excluded.source_hash,
      updated_at = datetime('now')
  `,
  ).run({
    id: api.id,
    name: api.name,
    version: api.version ?? null,
    specPath: api.specPath ?? null,
    docsPath: api.docsPath ?? null,
    sourceHash: api.sourceHash ?? null,
  });
}

export function getApiSourceHash(
  db: Database.Database,
  apiId: string,
): string | undefined {
  const row = db
    .prepare('SELECT source_hash FROM apis WHERE id = ?')
    .get(apiId) as { source_hash: string | null } | undefined;
  return row?.source_hash ?? undefined;
}

export function getApis(db: Database.Database): Api[] {
  const rows = db.prepare('SELECT * FROM apis ORDER BY name').all() as Array<{
    id: string;
    name: string;
    version: string | null;
    spec_path: string | null;
    docs_path: string | null;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version ?? undefined,
    specPath: r.spec_path ?? undefined,
    docsPath: r.docs_path ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// --- Chunks ---

export function upsertChunk(
  db: Database.Database,
  chunk: Chunk,
  embedding: Float32Array,
): void {
  const metadata = chunk.metadata ? JSON.stringify(chunk.metadata) : null;
  const txn = db.transaction(() => {
    // Upsert main chunk
    db.prepare(
      `
      INSERT INTO chunks (id, api_id, type, title, content, content_hash, metadata)
      VALUES (@id, @apiId, @type, @title, @content, @contentHash, @metadata)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        title = excluded.title,
        content = excluded.content,
        content_hash = excluded.content_hash,
        metadata = excluded.metadata
    `,
    ).run({
      id: chunk.id,
      apiId: chunk.apiId,
      type: chunk.type,
      title: chunk.title,
      content: chunk.content,
      contentHash: chunk.contentHash,
      metadata,
    });

    // Sync FTS: delete old, insert new
    db.prepare('DELETE FROM chunks_fts WHERE chunk_id = ?').run(chunk.id);
    db.prepare(
      'INSERT INTO chunks_fts (chunk_id, title, content) VALUES (?, ?, ?)',
    ).run(chunk.id, chunk.title, chunk.content);

    // Sync vec: delete old, insert new
    db.prepare('DELETE FROM chunks_vec WHERE chunk_id = ?').run(chunk.id);
    db.prepare(
      'INSERT INTO chunks_vec (chunk_id, embedding) VALUES (?, ?)',
    ).run(chunk.id, embedding);
  });
  txn();
}

export function deleteChunk(db: Database.Database, chunkId: string): void {
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM chunks_vec WHERE chunk_id = ?').run(chunkId);
    db.prepare('DELETE FROM chunks_fts WHERE chunk_id = ?').run(chunkId);
    db.prepare('DELETE FROM chunks WHERE id = ?').run(chunkId);
  });
  txn();
}

export function deleteChunksByApi(db: Database.Database, apiId: string): void {
  const txn = db.transaction(() => {
    const chunkIds = db
      .prepare('SELECT id FROM chunks WHERE api_id = ?')
      .all(apiId) as Array<{ id: string }>;
    for (const { id } of chunkIds) {
      db.prepare('DELETE FROM chunks_vec WHERE chunk_id = ?').run(id);
      db.prepare('DELETE FROM chunks_fts WHERE chunk_id = ?').run(id);
    }
    db.prepare('DELETE FROM chunks WHERE api_id = ?').run(apiId);
  });
  txn();
}

const CHUNK_TYPES_SET = new Set<string>(CHUNK_TYPES);

function rowToChunk(r: Record<string, unknown>): Chunk {
  const type = r.type as string;
  if (!CHUNK_TYPES_SET.has(type)) {
    throw new Error(`Invalid chunk type "${type}" in chunk "${r.id}"`);
  }

  let metadata: Record<string, unknown> | undefined;
  if (r.metadata) {
    try {
      metadata = JSON.parse(r.metadata as string);
    } catch (e) {
      throw new Error(
        `Corrupted metadata JSON in chunk "${r.id}": ${(e as Error).message}`,
        { cause: e },
      );
    }
  }

  return {
    id: r.id as string,
    apiId: r.api_id as string,
    type: type as ChunkType,
    title: r.title as string,
    content: r.content as string,
    contentHash: r.content_hash as string,
    metadata,
    createdAt: r.created_at as string | undefined,
  };
}

export function getChunksByApi(
  db: Database.Database,
  apiId: string,
  type?: ChunkType,
): Chunk[] {
  if (type) {
    const rows = db
      .prepare('SELECT * FROM chunks WHERE api_id = ? AND type = ?')
      .all(apiId, type);
    return (rows as Record<string, unknown>[]).map(rowToChunk);
  }
  const rows = db.prepare('SELECT * FROM chunks WHERE api_id = ?').all(apiId);
  return (rows as Record<string, unknown>[]).map(rowToChunk);
}

export function getChunkById(
  db: Database.Database,
  id: string,
): Chunk | undefined {
  const row = db.prepare('SELECT * FROM chunks WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToChunk(row) : undefined;
}

export function getChunksByIds(db: Database.Database, ids: string[]): Chunk[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM chunks WHERE id IN (${placeholders})`)
    .all(...ids);
  return (rows as Record<string, unknown>[]).map(rowToChunk);
}

// --- Hybrid Search ---

function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/['"*()\-:^~@{}]/g, ' ').trim();
  if (!cleaned) return '';
  // Quote each token so FTS5 treats them as literals, not boolean operators
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(' ');
}

interface FtsRow {
  chunk_id: string;
  rank: number;
}
interface VecRow {
  chunk_id: string;
  distance: number;
}

function searchFts(
  db: Database.Database,
  query: string,
  limit: number,
  apiId?: string,
  types?: ChunkType[],
): Array<{ chunkId: string; rank: number }> {
  const sanitized = sanitizeFtsQuery(query);
  if (!sanitized) return [];

  let sql = `
    SELECT f.chunk_id, f.rank
    FROM chunks_fts f
  `;
  const params: unknown[] = [];

  // Join with chunks table if we need filtering
  if (apiId || types?.length) {
    sql += ' JOIN chunks c ON c.id = f.chunk_id';
  }

  sql += ' WHERE chunks_fts MATCH ?';
  params.push(sanitized);

  if (apiId) {
    sql += ' AND c.api_id = ?';
    params.push(apiId);
  }
  if (types?.length) {
    const placeholders = types.map(() => '?').join(',');
    sql += ` AND c.type IN (${placeholders})`;
    params.push(...types);
  }

  sql += ' ORDER BY f.rank LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as FtsRow[];
  return rows.map((r) => ({ chunkId: r.chunk_id, rank: r.rank }));
}

function searchVec(
  db: Database.Database,
  queryEmbedding: Float32Array,
  limit: number,
  apiId?: string,
  types?: ChunkType[],
): Array<{ chunkId: string; distance: number }> {
  // sqlite-vec KNN query — post-filter for apiId/types
  const overFetch = apiId || types?.length ? limit * 5 : limit;
  const vecRows = db
    .prepare(
      `
    SELECT chunk_id, distance
    FROM chunks_vec
    WHERE embedding MATCH ?
      AND k = ?
    ORDER BY distance
  `,
    )
    .all(queryEmbedding, overFetch) as VecRow[];

  let results = vecRows.map((r) => ({
    chunkId: r.chunk_id,
    distance: r.distance,
  }));

  // Post-filter if needed
  if (apiId || types?.length) {
    const chunkIds = results.map((r) => r.chunkId);
    if (chunkIds.length === 0) return [];
    const placeholders = chunkIds.map(() => '?').join(',');
    let filterSql = `SELECT id FROM chunks WHERE id IN (${placeholders})`;
    const filterParams: unknown[] = [...chunkIds];

    if (apiId) {
      filterSql += ' AND api_id = ?';
      filterParams.push(apiId);
    }
    if (types?.length) {
      const typePlaceholders = types.map(() => '?').join(',');
      filterSql += ` AND type IN (${typePlaceholders})`;
      filterParams.push(...types);
    }

    const validIds = new Set(
      (db.prepare(filterSql).all(...filterParams) as Array<{ id: string }>).map(
        (r) => r.id,
      ),
    );
    results = results.filter((r) => validIds.has(r.chunkId));
  }

  return results.slice(0, limit);
}

const RRF_K = 60;

export function searchHybrid(
  db: Database.Database,
  query: string,
  queryEmbedding: Float32Array,
  options: SearchOptions = {},
): SearchResult[] {
  const limit = options.limit ?? 20;
  const overFetchLimit = limit * 3;

  const ftsResults = searchFts(
    db,
    query,
    overFetchLimit,
    options.apiId,
    options.types,
  );
  const vecResults = searchVec(
    db,
    queryEmbedding,
    overFetchLimit,
    options.apiId,
    options.types,
  );

  // RRF fusion
  const scores = new Map<string, number>();

  ftsResults.forEach((r, i) => {
    const rank = i + 1;
    scores.set(r.chunkId, (scores.get(r.chunkId) ?? 0) + 1 / (RRF_K + rank));
  });

  vecResults.forEach((r, i) => {
    const rank = i + 1;
    scores.set(r.chunkId, (scores.get(r.chunkId) ?? 0) + 1 / (RRF_K + rank));
  });

  // Sort by RRF score descending, take top `limit`
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (ranked.length === 0) return [];

  // Fetch full chunk data
  const chunkIds = ranked.map(([id]) => id);
  const chunks = getChunksByIds(db, chunkIds);
  const chunkMap = new Map(chunks.map((c) => [c.id, c]));

  return ranked
    .filter(([id]) => chunkMap.has(id))
    .map(([id, score]) => ({ chunk: chunkMap.get(id)!, score }));
}
