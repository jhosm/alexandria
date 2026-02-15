## 1. Server Setup

- [ ] 1.1 Create `src/server/index.ts` with MCP `Server` and `StdioServerTransport`, initialize database connection on startup
- [ ] 1.2 Register tool definitions (JSON Schema for each tool's parameters)

## 2. MCP Tools

- [ ] 2.1 Create `src/server/tools/list-apis.ts` — query apis table, format as markdown list with name and version
- [ ] 2.2 Create `src/server/tools/search-docs.ts` — accept query + optional apiName/types, embed query via Voyage, run hybrid search, format results as markdown
- [ ] 2.3 Create `src/server/tools/get-api-endpoints.ts` — accept apiName, look up API by name, fetch endpoint chunks, format as markdown list with method/path/summary

## 3. Result Formatting

- [ ] 3.1 Implement markdown formatting for search results (title, type badge, API name, content)
- [ ] 3.2 Implement markdown formatting for endpoint listings (method, path, summary)
- [ ] 3.3 Implement empty-state messages ("No APIs indexed", "No results found", "API not found")

## 4. Verification

- [ ] 4.1 Start server via stdio, confirm it accepts MCP `initialize` handshake
- [ ] 4.2 Call `list-apis`, verify it returns indexed APIs
- [ ] 4.3 Call `search-docs` with a natural language query, verify relevant results
- [ ] 4.4 Call `get-api-endpoints` with an API name, verify endpoint listing
