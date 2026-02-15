## Why

Alexandria needs a foundational layer before any parsers, embedders, or servers can be built. Every downstream component — ingestion, search, MCP serving — depends on a shared database, types, and query interface. This change establishes that foundation so all other work streams can begin in parallel.

## What Changes

- Initialize Node/TypeScript project with all shared dependencies (better-sqlite3, sqlite-vec, express, MCP SDK, etc.)
- Create SQLite database layer with schema: `apis`, `chunks`, `chunks_fts` (FTS5), `chunks_vec` (vector via sqlite-vec)
- Define shared `Chunk`, `SearchResult`, `Api`, and `SearchOptions` types used across all modules
- Implement hybrid search via Reciprocal Rank Fusion (RRF) combining vector similarity and full-text search
- Implement CRUD operations for apis and chunks tables with transactional FTS/vector sync

## Capabilities

### New Capabilities
- `project-scaffold`: package.json, tsconfig.json, .env.example, npm scripts for build/dev/test/ingest
- `database-layer`: SQLite initialization, schema creation (apis, chunks, chunks_fts, chunks_vec tables), connection management with WAL mode
- `hybrid-search`: RRF-based search combining vector similarity (sqlite-vec) and full-text search (FTS5), metadata filtering by API and chunk type, upsert/delete operations with transactional sync across all three tables

### Modified Capabilities

(none — greenfield project)

## Impact

- **Code**: Creates `src/shared/types.ts`, `src/db/index.ts`, `src/db/queries.ts`, and project config files
- **Dependencies**: Introduces `better-sqlite3`, `sqlite-vec`, `typescript`, `vitest`, and all other shared npm dependencies
- **Systems**: Creates SQLite database file (default: `./alexandria.db`) with WAL journaling
- **Downstream**: Unblocks all other changes — parsers (2,3), embedder (4), CLI (5), and MCP server (6) all import from this foundation
