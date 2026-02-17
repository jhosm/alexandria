## Why

The indexed documentation needs to be accessible to LLMs via a standard protocol. An MCP server over stdio allows any MCP-compatible client (Claude Desktop, IDEs, custom agents) to search and browse API documentation without direct database access.

## What Changes

- MCP server using stdio transport (stdin/stdout), launched as a child process by MCP clients
- Three MCP tools: `list-apis`, `search-docs`, `get-api-endpoints`
- Markdown-formatted results optimized for LLM consumption

## Capabilities

### New Capabilities

- `mcp-serving`: MCP server over stdio exposing documentation search tools. Provides `list-apis` (enumerate indexed APIs), `search-docs` (hybrid search with optional filters), and `get-api-endpoints` (list all endpoints for a named API). Results formatted as markdown for LLM readability.

### Modified Capabilities

(none)

## Impact

- **Code**: Creates `src/server/index.ts`, `src/server/tools/list-apis.ts`, `src/server/tools/search-docs.ts`, `src/server/tools/get-api-endpoints.ts`
- **Dependencies**: Uses `@modelcontextprotocol/sdk` (already in package.json). Imports from db layer (Change 1) and embedder (Change 4).
- **npm scripts**: The `dev:server` script runs this server via `node`/`tsx`
