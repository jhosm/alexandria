## Context

Alexandria has parsers (OpenAPI, markdown), an embedder (Voyage AI), and a database layer (SQLite + vec + FTS). The ingestion CLI wires them together into a pipeline that reads source files, produces chunks, embeds them, and writes them to the database. Incremental re-indexing avoids re-embedding unchanged content, reducing cost and time.

## Goals / Non-Goals

**Goals:**
- Provide a CLI that indexes a single API or all APIs from a registry file
- Support incremental re-indexing via content hash comparison
- Clean up orphaned chunks when source content is removed
- Coordinate transactional writes across all three database tables

**Non-Goals:**
- Remote file fetching (URL-based specs) — MVP uses local files only
- Watch mode / auto-reindex on file changes
- Progress reporting beyond console output
- Parallel ingestion of multiple APIs (sequential is fine for MVP)

## Decisions

### D1: apis.yml registry format

**Choice**: A simple YAML file listing APIs with their spec path and optional docs directory:
```yaml
apis:
  - name: payments
    spec: ./specs/payments/openapi.yaml
    docs: ./specs/payments/docs/
  - name: users
    spec: ./specs/users/openapi.yaml
```

**Alternatives considered**:
- Auto-discovery (scan directories): Less explicit, harder to control what gets indexed.
- JSON config: YAML is more readable for lists and easier to edit by hand.

**Rationale**: Explicit registry gives full control over what APIs are indexed. Simple to read, write, and version control.

### D2: Incremental re-indexing via content hash comparison

**Choice**: For each parsed chunk, compare its `contentHash` with the existing chunk's hash in the database. Only re-embed and upsert chunks whose hash has changed.

**Flow**:
1. Parse all chunks from source files
2. For each chunk, check if a chunk with the same ID exists in the DB
3. If hash matches → skip (no re-embedding needed)
4. If hash differs or chunk is new → embed and upsert
5. After processing, delete any DB chunks for this API that weren't in the parsed set (orphan cleanup)

**Rationale**: Content hashing is cheap and deterministic. This avoids unnecessary Voyage API calls (the most expensive operation) while keeping the database current.

### D3: Commander for CLI framework

**Choice**: Use `commander` for CLI argument parsing.

**Rationale**: Lightweight, well-known, already in dependencies. Simple enough for our two commands (`--api` single and `--all` batch).

### D4: Sequential API processing

**Choice**: Process APIs one at a time, even in `--all` mode.

**Rationale**: Simpler to implement and debug. MVP volumes (a few APIs) don't benefit from parallelism. Database writes are sequential anyway due to SQLite's single-writer model.

## Risks / Trade-offs

- **Large initial ingestion** → First-time indexing embeds all chunks, which may be slow for large specs. Mitigation: Subsequent runs are incremental. Batch embedding (128 per request) minimizes API calls.
- **apis.yml path resolution** → Relative paths in apis.yml are resolved from CWD. Mitigation: Document this clearly. Users typically run from project root.
- **Orphan detection scope** → Orphan cleanup only operates within a single API. Removing an API from apis.yml doesn't auto-delete its chunks. Mitigation: Users can re-run `--all` which processes what's listed. A future enhancement could add a `prune` command.
