## Context

Alexandria's MCP server is the primary interface for LLMs to access indexed API documentation. It sits on top of the database layer and embedder, exposing three tools via the Model Context Protocol over stdio. MCP clients (Claude Desktop, IDEs) launch the server as a child process and communicate via stdin/stdout.

## Goals / Non-Goals

**Goals:**
- Serve MCP tools over stdio transport (stdin/stdout)
- Provide three tools: `list-apis`, `search-docs`, `get-api-endpoints`
- Format results as markdown optimized for LLM consumption

**Non-Goals:**
- HTTP transport (stdio is simpler and sufficient for local/single-client usage)
- Authentication/authorization (stdio is inherently local)
- Caching layer (SQLite reads are fast enough for MVP volumes)

## Decisions

### D1: Stdio transport

**Choice**: Use `@modelcontextprotocol/sdk`'s `StdioServerTransport` for MCP protocol handling over stdin/stdout.

**Alternatives considered**:
- Streamable HTTP via Express: Adds Express dependency, port management, and network concerns. Overkill for local single-client usage.
- SSE transport: Deprecated in MCP spec in favor of Streamable HTTP. Not needed for stdio.

**Rationale**: Stdio is the standard MCP transport for local servers. The client spawns the process and communicates directly — no network stack, no port conflicts, no deployment complexity. If HTTP is needed later, it can be added as a separate entry point.

### D2: Three focused tools over a single general-purpose tool

**Choice**: Three separate tools with clear, single-purpose interfaces:
- `list-apis`: No parameters, returns all indexed APIs
- `search-docs`: Takes query string + optional apiName + optional types filter
- `get-api-endpoints`: Takes apiName, returns all endpoint chunks for that API

**Alternatives considered**:
- Single `query-docs` tool with mode parameter: Overloaded interface, harder for LLMs to use correctly.

**Rationale**: Smaller, focused tools with clear parameter schemas are easier for LLMs to select and call correctly. Each tool maps to a natural question type: "what APIs exist?", "find docs about X", "what endpoints does Y have?".

### D3: Markdown-formatted results

**Choice**: Format all tool results as markdown text, not JSON.

**Rationale**: LLMs consume markdown naturally. Structured markdown (headers, lists, code blocks) gives the model clear context without requiring JSON parsing. This is how LLMs prefer to receive reference material.

## Risks / Trade-offs

- **Single client** → Stdio supports one connected client at a time. Mitigation: This is the standard MCP model. Multiple clients each spawn their own server process.
- **Embedding at query time** → `search-docs` needs to embed the query string via Voyage AI on each call, adding latency (~100-200ms). Mitigation: Acceptable for interactive use. Could add embedding cache later if needed.
- **No pagination** → Tools return all matching results up to the limit. Mitigation: Default limit of 20 is reasonable for LLM consumption. LLMs typically need a focused set of results, not pages.
