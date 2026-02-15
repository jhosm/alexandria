## 1. Project Scaffold

- [ ] 1.1 Create `package.json` with `type: "module"`, all dependencies, and npm scripts (build, dev:server, ingest, test, test:watch)
- [ ] 1.2 Create `tsconfig.json` targeting ES2022, ESNext modules, bundler resolution, strict mode, output to dist/
- [ ] 1.3 Create `.env.example` with VOYAGE_API_KEY, ALEXANDRIA_DB_PATH, ALEXANDRIA_PORT
- [ ] 1.4 Run `npm install` and verify all dependencies resolve

## 2. Shared Types

- [ ] 2.1 Create `src/shared/types.ts` with ChunkType, Chunk, SearchResult, Api, and SearchOptions types

## 3. Database Layer

- [ ] 3.1 Create `src/db/index.ts` with `getDb()` — SQLite connection with WAL mode, foreign keys, sqlite-vec loaded, schema initialization
- [ ] 3.2 Implement schema: apis table, chunks table with indexes, chunks_fts (FTS5), chunks_vec (vec0 float[1024])
- [ ] 3.3 Implement `createTestDb()` for in-memory test databases
- [ ] 3.4 Implement `closeDb()` for clean shutdown

## 4. CRUD Operations

- [ ] 4.1 Create `src/db/queries.ts` with `upsertApi` and `getApis` for the apis table
- [ ] 4.2 Implement `upsertChunk` — transactional insert/update across chunks + chunks_fts + chunks_vec
- [ ] 4.3 Implement `deleteChunk` and `deleteChunksByApi` — transactional delete from all three tables
- [ ] 4.4 Implement `getChunksByApi` (with optional type filter), `getChunkById`, `getChunksByIds`

## 5. Hybrid Search

- [ ] 5.1 Implement FTS5 search function with query sanitization and optional apiId/types filtering
- [ ] 5.2 Implement vector search function via sqlite-vec MATCH with post-filtering for apiId/types
- [ ] 5.3 Implement `searchHybrid` with RRF fusion (k=60), configurable limit (default 20), 3x over-fetch

## 6. Verification

- [ ] 6.1 Verify DB initializes and all four tables exist
- [ ] 6.2 Insert a test API and chunk, confirm retrieval via getChunksByApi
- [ ] 6.3 Search for the test chunk via searchHybrid, confirm it appears in results
