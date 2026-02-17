## Why

LLM agents using Alexandria need to understand the FAST architecture — the patterns for building, exposing, and consuming APIs — not just individual API specs. Today, Alexandria's registry only supports API entries (with a required OpenAPI spec). There's no way to index standalone documentation like FAST or other architectural patterns, and no dedicated MCP tool to guide the agent toward using that documentation in the right contexts (writing API code, understanding integration patterns, etc.).

## What Changes

- New `docs` section in `apis.yml` for standalone documentation collections (FAST, design patterns, component docs, etc.)
- Registry loader and ingestion pipeline extended to handle docs-only entries (no OpenAPI spec)
- Existing `search-docs` tool renamed to `search-api-docs` with description clarified to guide agents toward API-specific searches (endpoints, schemas, API behaviour)
- New MCP tool `search-fast-docs` with a rich description that guides agents to use it when understanding FAST, writing code to expose an API, or writing code to consume an API

## Capabilities

### New Capabilities

- `docs-registry`: A `docs` section in `apis.yml` for indexing standalone documentation collections. Each entry has `name` (required) and `path` (required, directory of markdown files). Processed by the same ingestion pipeline but skips OpenAPI parsing entirely.
- `search-fast-docs-tool`: A dedicated MCP tool for searching FAST architecture documentation. Description explicitly tells the agent to use it when understanding FAST concepts, writing code to expose an API, or writing code to consume an API. Scoped to the "fast" entry internally.

### Modified Capabilities

- `ingestion-pipeline`: Extended to support entries without an OpenAPI spec — markdown-only ingestion for docs entries.
- `search-api-docs-tool`: Renamed from `search-docs` to `search-api-docs`. Description updated to clarify it should be used for searching API-specific documentation — endpoints, schemas, request/response formats, and API behaviour.

## Impact

- **Registry**: `apis.yml` gains a `docs` section alongside `apis`
- **Code**: `src/ingestion/registry.ts` — parse new section; `src/ingestion/index.ts` — handle docs-only entries; `src/server/tools/search-docs.ts` renamed to `search-api-docs.ts` with updated tool name and description; new `src/server/tools/search-fast-docs.ts`
- **Server**: `src/server/index.ts` — register the new tool, update import for renamed tool
- **Tests**: Extend registry and ingestion tests; add tool test; update existing search-docs test references
