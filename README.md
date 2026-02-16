# Alexandria

API documentation search engine. Indexes OpenAPI specs and markdown docs into SQLite with hybrid search (vector similarity + full-text), served via MCP over stdio.

**Tech stack:** TypeScript, Node 18+, SQLite (better-sqlite3 + sqlite-vec + FTS5), MCP SDK, Vitest

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm

## Quickstart

```bash
git clone <repo-url> && cd alexandria
npm install
cp .env.example .env
```

The default configuration uses Transformers.js for embeddings — runs locally, no API key needed. No changes to `.env` are required to get started.

> **Voyage AI:** For higher-quality embeddings, set `EMBEDDING_PROVIDER=voyage` and `VOYAGE_API_KEY=your-key` in `.env`. A free tier is available at [voyageai.com](https://www.voyageai.com/). Switching providers requires re-indexing.

## Usage

### Ingest documentation

Index the bundled example API (configured in `apis.yml`):

```bash
npm run ingest -- --all
```

Or index a single API by specifying its spec and docs:

```bash
npm run ingest -- --api petstore --spec ./examples/petstore-openapi.yml --docs ./examples/
```

### Start the MCP server

```bash
npm run dev:server
```

The server exposes search tools over stdio using the [Model Context Protocol](https://modelcontextprotocol.io/). Connect it to an MCP-compatible client to query your indexed documentation.

### Configure MCP clients

#### Claude Desktop (one-click install)

Alexandria ships a `.mcpb` bundle for one-click installation in Claude Desktop. The bundle uses Transformers.js by default — no API key needed.

Build the bundle (or download a pre-built one from [GitHub Releases](https://github.com/jhosm/alexandria/releases)):

```bash
npm run pack
```

This produces `bundles/alexandria-<version>-<platform>-<arch>.mcpb`. Install it using any of these methods:

1. **Double-click** the `.mcpb` file
2. **Drag and drop** it into the Claude Desktop window
3. **Menu**: Developer > Extensions > Install Extension, then select the file

Claude Desktop will show the extension details and prompt for optional settings (embedding provider, Voyage API key, database path).

#### Claude Code

Run from the Alexandria project directory:

```bash
claude mcp add --transport stdio --env EMBEDDING_PROVIDER=transformers alexandria -- npx tsx src/server/index.ts
```

Or add to `.mcp.json` at the project root (or `~/.claude.json` for global access):

```json
{
  "mcpServers": {
    "alexandria": {
      "command": "npx",
      "args": ["tsx", "src/server/index.ts"],
      "cwd": "/absolute/path/to/alexandria",
      "env": {
        "EMBEDDING_PROVIDER": "transformers"
      }
    }
  }
}
```

#### Visual Studio Code

Add to `.vscode/mcp.json` in the workspace root:

```json
{
  "servers": {
    "alexandria": {
      "command": "npx",
      "args": ["tsx", "src/server/index.ts"],
      "cwd": "/absolute/path/to/alexandria",
      "env": {
        "EMBEDDING_PROVIDER": "transformers"
      }
    }
  }
}
```

> **Note:** Replace `/absolute/path/to/alexandria` with the actual path to your Alexandria checkout. To use Voyage AI instead, set `"EMBEDDING_PROVIDER": "voyage"` and add `"VOYAGE_API_KEY": "your-key-here"`. The embedding provider must match the one used during ingestion.

## Scripts

| Script                 | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run build`        | Compile TypeScript (not needed for dev — `tsx` runs TS directly) |
| `npm run dev`          | Start MCP server with file watching                              |
| `npm run dev:server`   | Start MCP server (stdio)                                         |
| `npm run ingest`       | Index API documentation                                          |
| `npm run pack`         | Build `.mcpb` bundle for Claude Desktop                          |
| `npm test`             | Run tests (Vitest)                                               |
| `npm run test:watch`   | Run tests in watch mode                                          |
| `npm run lint`         | ESLint                                                           |
| `npm run format`       | Prettier (write)                                                 |
| `npm run format:check` | Prettier (check only)                                            |

## Project Status

| Phase                                                        | Status |
| ------------------------------------------------------------ | ------ |
| Project foundation (SQLite schema, hybrid search)            | Done   |
| OpenAPI parser                                               | Done   |
| Markdown parser                                              | Done   |
| Voyage AI embedder                                           | Done   |
| Ingestion CLI                                                | Done   |
| Pluggable embedding providers (Voyage, Ollama, Transformers) | Done   |
| MCP server                                                   | Done   |
| Developer onboarding                                         | Done   |
