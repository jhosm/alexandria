## Context

Alexandria is a greenfield Node/TypeScript project. There is no existing codebase — this change creates the project skeleton and data layer that every other component builds upon. The core challenge is enabling hybrid search (combining semantic vector similarity with keyword-based full-text search) using a single embedded SQLite database, avoiding the operational overhead of separate search infrastructure.

## Goals / Non-Goals

**Goals:**
- Establish a working Node/TypeScript project that all downstream changes can import from
- Create a SQLite database with vector search (sqlite-vec) and full-text search (FTS5) in a single file
- Define shared types (`Chunk`, `SearchResult`, `Api`, `SearchOptions`) used across ingestion, search, and serving
- Implement Reciprocal Rank Fusion (RRF) to combine vector and FTS results into a single ranked list
- Provide transactional CRUD operations that keep chunks, FTS, and vector tables in sync

**Non-Goals:**
- Implementing parsers, embedders, CLI, or MCP server (separate changes)
- Remote/cloud database support — SQLite with local file is sufficient for MVP
- User authentication or multi-tenancy
- Schema migrations beyond initial creation

## Decisions

### D1: SQLite with sqlite-vec + FTS5 over separate search infrastructure

**Choice**: Single SQLite database with `better-sqlite3`, `sqlite-vec` extension for vectors, and built-in FTS5 for full-text search.

**Alternatives considered**:
- PostgreSQL + pgvector: More powerful but requires running a database server. Overkill for a single-user/team tool.
- SQLite + external vector DB (Chroma, Qdrant): Adds operational complexity of a second data store.

**Rationale**: SQLite is zero-config, single-file, and `sqlite-vec` provides ANN vector search as a loadable extension. FTS5 is built into SQLite. One file = easy backup, easy deployment.

### D2: Reciprocal Rank Fusion (RRF) for hybrid search

**Choice**: Combine FTS5 and vector results using RRF with k=60.

**Alternatives considered**:
- Weighted linear combination of normalized scores: Requires score normalization across different scales (BM25 vs cosine distance), which is fragile.
- Vector-only search: Misses exact keyword matches that FTS5 excels at.

**Rationale**: RRF is rank-based (not score-based), so it works without normalizing across different scoring systems. k=60 is the standard constant from the original RRF paper. Simple, effective, and well-understood.

### D3: Standalone FTS5 table (not external-content)

**Choice**: Separate FTS5 table with manual sync in transactions, rather than FTS5 external-content mode.

**Alternatives considered**:
- FTS5 content= (external content) with triggers: More automatic but trigger-based sync is fragile and harder to debug.

**Rationale**: Manual sync in the same transaction is explicit, easy to understand, and gives full control. The duplication cost is negligible for our data sizes.

### D4: Text primary keys (UUIDs) over integer rowids

**Choice**: Use text UUIDs as primary keys for both `apis` and `chunks` tables.

**Rationale**: Content-addressable IDs (based on API name + chunk identity) make ingestion idempotent — re-ingesting the same content produces the same IDs, enabling upsert semantics naturally.

### D5: 1024-dimension vectors (Voyage voyage-3-lite)

**Choice**: `float[1024]` in the vector table schema, matching Voyage AI's `voyage-3-lite` model output.

**Rationale**: `voyage-3-lite` provides good quality embeddings at lower cost and latency than larger models. 1024 dimensions is a reasonable balance of quality vs storage.

## Risks / Trade-offs

- **sqlite-vec maturity** → sqlite-vec is relatively new. Mitigation: our usage is simple (insert, match, delete), and we can swap to another vector solution later since the abstraction is in `queries.ts`.
- **Single-file database scaling** → SQLite may struggle with very large datasets (100k+ chunks). Mitigation: Alexandria targets org API docs, which are typically hundreds to low thousands of chunks. This is well within SQLite's comfort zone.
- **No concurrent writes** → SQLite WAL mode supports concurrent reads but single writer. Mitigation: Ingestion is a batch process, not concurrent. The MCP server only reads.
- **FTS5 data duplication** → Storing text in both `chunks` and `chunks_fts` doubles text storage. Mitigation: Negligible for our data sizes (API docs are small), and keeps the architecture simple.
