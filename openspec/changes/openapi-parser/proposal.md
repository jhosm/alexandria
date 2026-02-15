## Why

OpenAPI specs are the primary documentation source for Alexandria. We need to parse them into well-structured, searchable chunks so the MCP server can return relevant endpoint documentation to LLMs. Without this parser, the system has no way to ingest API specifications.

## What Changes

- Dereference and walk OpenAPI 3.x specs to produce overview, endpoint, and schema chunks
- Each endpoint becomes a self-contained markdown chunk with method, path, summary, parameters, request body, and response schemas
- Schema chunks for named components with 3+ properties
- An overview chunk summarizing the API (title, version, description, server URLs)
- Content hashing for incremental re-indexing support

## Capabilities

### New Capabilities

- `openapi-chunking`: Parses a dereferenced OpenAPI spec into typed `Chunk[]` with content, metadata (path, method, tags, operationId), and content hashes. Produces overview, endpoint, and schema chunk types.

### Modified Capabilities

(none)

## Impact

- **Code**: Creates `src/ingestion/openapi-parser.ts` and test files
- **Dependencies**: Uses `@apidevtools/swagger-parser` (already in package.json from project-foundation)
- **Types**: Imports `Chunk` and `ChunkType` from `src/shared/types.ts`
- **Downstream**: Used by ingestion-cli (Change 5) to process API spec files
