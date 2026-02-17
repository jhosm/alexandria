# Alexandria

Alexandria is a documentation search engine for API teams. It indexes your OpenAPI specs and markdown docs into a local SQLite database, then serves that index as search tools via the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP).

MCP clients — like Claude Desktop, Claude Code, and VS Code — connect to these search tools so that AI assistants can look up your API documentation on demand.

## How it works

Alexandria has two independent phases connected by a single SQLite database file:

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│  Your Docs  │──────▶│  Ingestion   │──────▶│  SQLite DB │
│  (specs +   │       │  (parse,     │       │  (chunks,  │
│   markdown) │       │   embed,     │       │   vectors, │
│             │       │   store)     │       │   FTS)     │
└─────────────┘       └──────────────┘       └─────┬──────┘
                                                   │
                                                   ▼
                      ┌──────────────┐       ┌────────────┐
                      │  MCP Client  │◀─────▶│ MCP Server │
                      │  (Claude,    │ stdio │  (search   │
                      │   VS Code)   │       │   tools)   │
                      └──────────────┘       └────────────┘
```

**Phase 1 — Ingestion** parses your OpenAPI specs and markdown files, generates vector embeddings, and stores everything in a SQLite database. You run this once, and again whenever your docs change.

**Phase 2 — MCP Server** reads the SQLite database and exposes search tools over stdio. MCP clients connect to this server to query your indexed documentation.

These phases share no runtime state and run as separate processes. The database file is the only thing that connects them — you can ingest on one machine and serve on another by copying the `.db` file.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm

> **No C/C++ build tools required.** Native dependencies (`better-sqlite3`, `sqlite-vec`) ship prebuilt binaries. If you don't have build tools, use `npm install --prefer-offline` to avoid fallback to source compilation.

## Quickstart

**1. Install**

```bash
git clone <repo-url> && cd alexandria
npm install --prefer-offline
cp .env.example .env
```

The default configuration uses Transformers.js for embeddings — runs locally, no API key needed.

> **Voyage AI:** For higher-quality embeddings, set `EMBEDDING_PROVIDER=voyage` and `VOYAGE_API_KEY=your-key` in `.env`. A free tier is available at [voyageai.com](https://www.voyageai.com/). Switching providers requires re-indexing.

**2. Ingest documentation** (Phase 1)

Index the bundled example API (configured in `apis.yml`):

```bash
npm run ingest -- --all
```

This parses the example specs and docs, generates embeddings, and writes everything to `alexandria.db`.

**3. Start the MCP server** (Phase 2)

```bash
npm run dev:server
```

The server reads `alexandria.db` and exposes search tools over stdio. Connect an MCP client to start querying — see [MCP Client Setup](docs/mcp-clients.md) for configuration guides.

## What can you search?

Once connected, the MCP server provides these tools to your AI assistant:

| Tool                | Description                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `list-apis`         | List all indexed APIs and documentation collections                                        |
| `search-api-docs`   | Search API documentation — endpoints, schemas, behaviour                                   |
| `search-docs`       | Search standalone documentation — architecture, guides, conventions (optional name filter) |
| `get-api-endpoints` | List all endpoints for a specific API                                                      |

Search combines vector similarity and full-text matching (hybrid search) for accurate results across both natural-language queries and exact terms.

## Scripts

| Script                 | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run build`        | Compile TypeScript (not needed for dev — `tsx` runs TS directly) |
| `npm run dev`          | Start MCP server with file watching                              |
| `npm run dev:server`   | Start MCP server (stdio)                                         |
| `npm run ingest`       | Index API and standalone documentation                           |
| `npm run pack`         | Build `.mcpb` bundle for Claude Desktop                          |
| `npm test`             | Run tests (Vitest)                                               |
| `npm run test:watch`   | Run tests in watch mode                                          |
| `npm run lint`         | ESLint                                                           |
| `npm run format`       | Prettier (write)                                                 |
| `npm run format:check` | Prettier (check only)                                            |

## Further reading

- **[Ingestion Guide](docs/ingestion.md)** — Index your own docs, configure the registry, choose embedding providers
- **[Embedding Models](docs/embedding-models.md)** — Provider comparison, model configuration, Transformers.js dtype/local-model options
- **[MCP Client Setup](docs/mcp-clients.md)** — Connect Alexandria to Claude Desktop, Claude Code, or VS Code
- **[Troubleshooting](docs/troubleshooting.md)** — Native dependencies and build issues

**Tech stack:** TypeScript, Node 18+, SQLite (better-sqlite3 + sqlite-vec + FTS5), MCP SDK, Vitest
