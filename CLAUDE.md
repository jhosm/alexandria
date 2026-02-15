# Alexandria

API documentation search engine. Indexes OpenAPI specs and markdown docs into SQLite with hybrid search (vector + full-text), served via MCP over HTTP.

## Tech Stack

TypeScript, Node 18+, SQLite (better-sqlite3 + sqlite-vec + FTS5), Voyage AI (voyage-3-lite, 1024d), Express, MCP SDK, Vitest

## Architecture

```
src/
  shared/types.ts       — Chunk, SearchResult, Api, SearchOptions types
  db/index.ts           — SQLite init, schema creation, connection (WAL mode)
  db/queries.ts         — CRUD + hybrid search (RRF, k=60) across chunks/FTS/vec tables
  ingestion/
    openapi-parser.ts   — OpenAPI 3.x → overview/endpoint/schema chunks
    markdown-parser.ts  — Markdown → glossary/use-case/guide chunks (AST-based, heading split)
    embedder.ts         — Voyage AI batch embedding (128/batch, document vs query inputType)
    index.ts            — CLI entry: parse → hash compare → embed changed → upsert → delete orphans
  server/
    index.ts            — Express + MCP Streamable HTTP (stateless)
    tools/              — list-apis, search-docs, get-api-endpoints
apis.yml                — API registry (name, spec path, docs dir)
alexandria.db           — SQLite database (gitignored)
```

## Commands

```bash
npm run build          # Compile TypeScript
npm run dev            # Dev mode with watch
npm run dev:server     # Start MCP server (default port 3000)
npm test               # Run tests (Vitest)
npm run ingest -- --api <name> --spec <path> --docs <dir>  # Index single API
npm run ingest -- --all                                     # Index all from apis.yml
```

## Environment

```bash
VOYAGE_API_KEY=...         # Required for embedding
ALEXANDRIA_PORT=3000       # MCP server port (optional, default 3000)
```

## Key Patterns

- **Hybrid search**: RRF (k=60) fuses vector similarity (sqlite-vec) + full-text (FTS5) results
- **Incremental ingestion**: Content hashing skips unchanged chunks; orphan cleanup removes deleted ones
- **Deterministic IDs**: Text UUIDs from API name + chunk identity enable idempotent upserts
- **Three-table sync**: chunks, chunks_fts, chunks_vec always updated in same transaction

## Implementation Roadmap

Each step maps to an OpenSpec change in `openspec/changes/`. Designs and tasks live there.

```
Phase 1 ─ project-foundation
           Scaffold, SQLite schema, shared types, hybrid search queries
           └── Unblocks everything below

Phase 2 ─ openapi-parser ─┐
           markdown-parser ─┼── Can be built in parallel (only need Phase 1)
           voyage-embedder ─┘

Phase 3 ─ ingestion-cli
           Wires parsers + embedder into CLI pipeline (needs Phases 1–2)

Phase 4 ─ mcp-server
           Express + MCP HTTP serving search tools (needs Phases 1–2; reads data from Phase 3)
```

# General Guidelines

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
