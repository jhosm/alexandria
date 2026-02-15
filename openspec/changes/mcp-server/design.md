## Context

Alexandria's MCP server is the primary interface for LLMs to access indexed API documentation. It sits on top of the database layer and embedder, exposing three tools via the Model Context Protocol over HTTP. The server is stateless — each request is independent, with no session state to manage.

## Goals / Non-Goals

**Goals:**
- Serve MCP tools over Streamable HTTP transport using Express
- Provide three tools: `list-apis`, `search-docs`, `get-api-endpoints`
- Format results as markdown optimized for LLM consumption
- Include a health check endpoint for monitoring

**Non-Goals:**
- Authentication/authorization (MVP assumes trusted network)
- Rate limiting (handled at infrastructure level if needed)
- WebSocket or SSE transport (Streamable HTTP is sufficient)
- Caching layer (SQLite reads are fast enough for MVP volumes)

## Decisions

### D1: Express + MCP Streamable HTTP transport

**Choice**: Use Express as the HTTP framework with `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` for MCP protocol handling.

**Alternatives considered**:
- stdio transport: Only works for local single-client usage. HTTP enables org-wide access.
- Raw HTTP without Express: MCP SDK's transport works well with Express middleware. No reason to go lower-level.

**Rationale**: Express is familiar, lightweight, and the MCP SDK provides a ready-made Streamable HTTP transport that plugs into Express routes. Stateless transport means no session management overhead.

### D2: Three focused tools over a single general-purpose tool

**Choice**: Three separate tools with clear, single-purpose interfaces:
- `list-apis`: No parameters, returns all indexed APIs
- `search-docs`: Takes query string + optional apiId + optional types filter
- `get-api-endpoints`: Takes apiName, returns all endpoint chunks for that API

**Alternatives considered**:
- Single `query-docs` tool with mode parameter: Overloaded interface, harder for LLMs to use correctly.

**Rationale**: Smaller, focused tools with clear parameter schemas are easier for LLMs to select and call correctly. Each tool maps to a natural question type: "what APIs exist?", "find docs about X", "what endpoints does Y have?".

### D3: Markdown-formatted results

**Choice**: Format all tool results as markdown text, not JSON.

**Rationale**: LLMs consume markdown naturally. Structured markdown (headers, lists, code blocks) gives the model clear context without requiring JSON parsing. This is how LLMs prefer to receive reference material.

### D4: Stateless transport

**Choice**: Use stateless Streamable HTTP (no session IDs, no server-side state).

**Rationale**: Alexandria's tools are all read-only queries. There's no conversation state to maintain between calls. Stateless is simpler to deploy and scale.

## Risks / Trade-offs

- **No auth** → Anyone with network access can query the server. Mitigation: MVP assumes deployment on trusted internal network. Auth can be added via Express middleware later.
- **Embedding at query time** → `search-docs` needs to embed the query string via Voyage AI on each call, adding latency (~100-200ms). Mitigation: Acceptable for interactive use. Could add embedding cache later if needed.
- **No pagination** → Tools return all matching results up to the limit. Mitigation: Default limit of 20 is reasonable for LLM consumption. LLMs typically need a focused set of results, not pages.
