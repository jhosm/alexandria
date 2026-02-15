## Why

The indexed documentation needs to be accessible to LLMs via a standard protocol. An MCP server over HTTP allows any MCP-compatible client (Claude, IDEs, custom agents) to search and browse API documentation without direct database access, enabling org-wide access to a centrally indexed knowledge base.

## What Changes

- Express server with MCP Streamable HTTP transport (stateless, no session management needed)
- Three MCP tools: `list-apis`, `search-docs`, `get-api-endpoints`
- Markdown-formatted results optimized for LLM consumption
- Health check endpoint at `/health`

## Capabilities

### New Capabilities

- `mcp-serving`: Stateless MCP server exposing documentation search tools over HTTP. Provides `list-apis` (enumerate indexed APIs), `search-docs` (hybrid search with optional filters), and `get-api-endpoints` (list all endpoints for a named API). Results formatted as markdown for LLM readability.

### Modified Capabilities

(none)

## Impact

- **Code**: Creates `src/server/index.ts`, `src/server/tools/list-apis.ts`, `src/server/tools/search-docs.ts`, `src/server/tools/get-api-endpoints.ts`
- **Dependencies**: Uses `express` and `@modelcontextprotocol/sdk` (both in package.json). Imports from db layer (Change 1) and embedder (Change 4).
- **Network**: Listens on configurable port (default 3000, via `ALEXANDRIA_PORT`)
- **npm scripts**: The `dev:server` script runs this server
