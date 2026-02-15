## Why

The parsers, embedder, and database layer need to be wired together into a usable workflow. The ingestion CLI provides the entry point for indexing API documentation from local files into the searchable SQLite database, with incremental re-indexing to avoid unnecessary re-embedding.

## What Changes

- Commander-based CLI with `ingest --api <name> --spec <path> --docs <dir>` for single API and `ingest --all` for batch ingestion
- `apis.yml` registry format listing APIs with their spec and docs paths
- Incremental re-indexing pipeline: parse → hash compare → embed only changed chunks → upsert → delete orphans
- Transactional writes coordinating chunks, FTS, and vector tables

## Capabilities

### New Capabilities

- `ingestion-pipeline`: End-to-end CLI flow from local files to indexed, searchable chunks in SQLite. Reads `apis.yml` registry, parses specs and docs, compares content hashes for incremental updates, embeds changed chunks via Voyage AI, and writes to the database with orphan cleanup.

### Modified Capabilities

(none)

## Impact

- **Code**: Creates `src/ingestion/index.ts` (CLI entry point) and `apis.yml` (example registry)
- **Dependencies**: Uses `commander` (already in package.json). Imports from all four prior changes: db layer, openapi-parser, markdown-parser, embedder.
- **npm scripts**: The `ingest` npm script runs this CLI
- **Downstream**: This is the primary way to populate the database that the MCP server (Change 6) queries
