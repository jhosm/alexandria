# MCP Client Setup

Alexandria's MCP server is the second phase — it reads the SQLite database produced by [ingestion](ingestion.md) and exposes search tools over stdio using the [Model Context Protocol](https://modelcontextprotocol.io/).

To start the server:

```bash
npm run dev:server
```

The server does not index or modify the database. It only reads. If you need to update your indexed documentation, run ingestion again — the server will pick up changes on the next query.

## Available tools

| Tool                | Description                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `list-apis`         | List all indexed APIs and documentation collections                                        |
| `search-api-docs`   | Search API documentation — endpoints, schemas, behaviour                                   |
| `search-docs`       | Search standalone documentation — architecture, guides, conventions (optional name filter) |
| `get-api-endpoints` | List all endpoints for a specific API                                                      |

## Claude Desktop (one-click install)

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

## Claude Code

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

## Visual Studio Code

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
