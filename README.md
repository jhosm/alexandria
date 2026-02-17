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

Index the bundled example API (configured in the registry file `apis.yml`):

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

## Using your own API docs

Alexandria is organization-agnostic. The core engine is separate from the data it indexes — your registry file (`apis.yml`), OpenAPI specs, markdown docs, and the SQLite database are all configurable.

To index your own APIs, create a directory with your data:

```
my-org-docs/
  apis.yml              # registry listing your APIs
  specs/
    service-a.yaml
    service-b.yaml
  docs/
    service-a/
      getting-started.md
    service-b/
      overview.md
```

Your `apis.yml` references specs and docs with paths relative to itself:

```yaml
apis:
  - name: service-a
    spec: ./specs/service-a.yaml
    docs: ./docs/service-a
  - name: service-b
    spec: ./specs/service-b.yaml
    docs: ./docs/service-b
```

Point Alexandria at your data using `--registry` or environment variables:

```bash
# Via CLI flag
npm run ingest -- --all --registry ./my-org-docs/apis.yml

# Via environment variables (in .env or shell)
ALEXANDRIA_REGISTRY_PATH=./my-org-docs/apis.yml
ALEXANDRIA_DB_PATH=./my-org-docs/alexandria.db
```

This keeps your org data in a separate directory (or even a separate repo) from the Alexandria codebase.

## Advanced

### Custom embedding models

The Ollama and Transformers providers can use any compatible embedding model. Set the model, dimension, and (for Transformers) pooling strategy via environment variables in `.env`:

**Ollama** — any model from the [Ollama library](https://ollama.com/library) that supports embeddings:

```bash
OLLAMA_MODEL=bge-large           # default
OLLAMA_DIMENSION=1024            # must match the model's output dimension
```

**Transformers.js** — any ONNX model from HuggingFace (typically under the `Xenova/` namespace):

```bash
TRANSFORMERS_MODEL=Xenova/bge-large-en-v1.5   # default
TRANSFORMERS_DIMENSION=1024                    # must match the model's output dimension
TRANSFORMERS_POOLING=cls                       # cls (BGE models) or mean (MiniLM, etc.)
```

Example — switching to MiniLM for a lighter local setup:

```bash
EMBEDDING_PROVIDER=transformers
TRANSFORMERS_MODEL=Xenova/all-MiniLM-L6-v2
TRANSFORMERS_DIMENSION=384
TRANSFORMERS_POOLING=mean
```

After changing the model or provider, re-index: `npm run ingest -- --all`.

### Native dependencies without build tools

Alexandria depends on two native packages: `better-sqlite3` (Node addon) and `sqlite-vec` (SQLite loadable extension). Both ship prebuilt binaries, so **C/C++ build tools are not normally required**.

**sqlite-vec** distributes precompiled binaries via platform-specific npm packages (e.g., `sqlite-vec-darwin-arm64`). npm installs the correct one automatically. No build fallback exists — if your platform isn't supported, it won't compile from source.

**better-sqlite3** uses [`prebuild-install`](https://github.com/prebuild/prebuild-install) to download prebuilt binaries from [GitHub Releases](https://github.com/WiseLibs/better-sqlite3/releases). If the download fails (network restrictions, unsupported Node version), it falls back to `node-gyp rebuild`, which requires a C/C++ compiler. If you don't have build tools and the prebuild download fails:

1. **Determine your platform details:**

   ```bash
   node -e "console.log(process.platform, process.arch, 'abi=' + process.versions.modules)"
   # Example output: darwin arm64 abi=127
   ```

2. **Download the matching prebuilt binary** from GitHub Releases:

   ```
   https://github.com/WiseLibs/better-sqlite3/releases/download/v<VERSION>/better-sqlite3-v<VERSION>-node-v<ABI>-<PLATFORM>-<ARCH>.tar.gz
   ```

   Replace `<VERSION>` with the version in `package-lock.json`, `<ABI>` with the abi number from step 1, `<PLATFORM>` with `darwin`/`linux`/`win32`, and `<ARCH>` with `arm64`/`x64`.

3. **Install without running build scripts, then extract the binary:**

   ```bash
   npm install --ignore-scripts
   tar -xzf better-sqlite3-v<VERSION>-node-v<ABI>-<PLATFORM>-<ARCH>.tar.gz \
     -C node_modules/better-sqlite3/
   ```

   This places `build/Release/better_sqlite3.node` where the `bindings` package expects it.

Alternatively, set `npm_config_better_sqlite3_binary_host` to an internal mirror hosting the same tarball structure.

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
