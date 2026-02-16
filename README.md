# Alexandria

API documentation search engine. Indexes OpenAPI specs and markdown docs into SQLite with hybrid search (vector similarity + full-text), served via MCP over stdio.

**Tech stack:** TypeScript, Node 18+, SQLite (better-sqlite3 + sqlite-vec + FTS5), MCP SDK, Vitest

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm
- A [Voyage AI](https://www.voyageai.com/) API key (free tier available) — or use a local provider (Ollama, Transformers.js)

## Quickstart

```bash
git clone <repo-url> && cd alexandria
npm install
cp .env.example .env
```

Edit `.env` and set your `VOYAGE_API_KEY`:

```
VOYAGE_API_KEY=your-key-here
```

> **Alternative providers:** Set `EMBEDDING_PROVIDER=ollama` or `EMBEDDING_PROVIDER=transformers` to avoid needing a Voyage AI key. See `.env.example` for configuration options.

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

#### Claude Code

Add to `.mcp.json` at the project root (or `~/.claude.json` for global access):

```json
{
  "mcpServers": {
    "alexandria": {
      "command": "npx",
      "args": ["tsx", "src/server/index.ts"],
      "env": {
        "VOYAGE_API_KEY": "your-key-here"
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
      "env": {
        "VOYAGE_API_KEY": "your-key-here"
      }
    }
  }
}
```

> **Note:** If using Ollama or Transformers.js, replace the `env` block with the appropriate provider settings from `.env.example` (e.g., `"EMBEDDING_PROVIDER": "ollama"`).

## Scripts

| Script                 | Description              |
| ---------------------- | ------------------------ |
| `npm run build`        | Compile TypeScript       |
| `npm run dev`          | Dev mode with watch      |
| `npm run dev:server`   | Start MCP server (stdio) |
| `npm run ingest`       | Index API documentation  |
| `npm test`             | Run tests (Vitest)       |
| `npm run test:watch`   | Run tests in watch mode  |
| `npm run lint`         | ESLint                   |
| `npm run format`       | Prettier (write)         |
| `npm run format:check` | Prettier (check only)    |

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
