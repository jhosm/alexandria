## 1. Server Setup

- [ ] 1.1 Create `src/server/index.ts` with Express app, MCP `StreamableHTTPServerTransport`, and `/mcp` route
- [ ] 1.2 Configure server port from `ALEXANDRIA_PORT` env var (default 3000)
- [ ] 1.3 Add `GET /health` endpoint returning `{ "status": "ok" }`
- [ ] 1.4 Initialize database connection on server start

## 2. MCP Tools

- [ ] 2.1 Create `src/server/tools/list-apis.ts` — query apis table, format as markdown list with name and version
- [ ] 2.2 Create `src/server/tools/search-docs.ts` — accept query + optional apiName/types, embed query via Voyage, run hybrid search, format results as markdown
- [ ] 2.3 Create `src/server/tools/get-api-endpoints.ts` — accept apiName, look up API by name, fetch endpoint chunks, format as markdown list with method/path/summary

## 3. Tool Registration

- [ ] 3.1 Register all three tools with the MCP server, including JSON Schema definitions for tool parameters
- [ ] 3.2 Implement tool dispatcher that routes MCP tool calls to the correct handler

## 4. Result Formatting

- [ ] 4.1 Implement markdown formatting for search results (title, type badge, API name, content)
- [ ] 4.2 Implement markdown formatting for endpoint listings (method, path, summary)
- [ ] 4.3 Implement empty-state messages ("No APIs indexed", "No results found", "API not found")

## 5. Verification

- [ ] 5.1 Start server, confirm `/health` returns 200
- [ ] 5.2 Connect with MCP client, call `list-apis`, verify it returns indexed APIs
- [ ] 5.3 Call `search-docs` with a natural language query, verify relevant results
- [ ] 5.4 Call `get-api-endpoints` with an API name, verify endpoint listing
