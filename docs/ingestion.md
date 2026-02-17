# Ingestion Guide

Ingestion is Alexandria's first phase. It reads your source documentation (OpenAPI specs and markdown files), splits it into searchable chunks, generates vector embeddings for each chunk, and stores everything in a SQLite database.

The output — a single `.db` file — is what the [MCP server](mcp-clients.md) reads to serve search queries.

## How ingestion works

1. **Parse** — OpenAPI specs are split into overview, endpoint, and schema chunks. Markdown files are split by heading into glossary, use-case, and guide chunks.
2. **Embed** — Each chunk is sent to an embedding provider (Transformers.js, Voyage AI, or Ollama) to generate a vector representation.
3. **Store** — Chunks, their embeddings, and full-text search indexes are written to SQLite in a single transaction.

Ingestion is **incremental**: content is hashed, and only changed chunks are re-embedded. Chunks that no longer exist in the source are automatically removed.

## Registry file

Alexandria uses a YAML registry file (`apis.yml` by default) to know what to index. The registry has two sections:

- **`apis`** — OpenAPI-backed services. Each entry has a `name`, a `spec` (path to the OpenAPI file), and optionally `docs` (path to a directory of markdown files).
- **`docs`** — Standalone documentation collections (no spec required). Each entry has a `name` and a `path` to a directory of markdown files.

Entry names must be unique across both sections. All paths are relative to the registry file.

```yaml
apis:
  - name: service-a
    spec: ./specs/service-a.yaml
    docs: ./docs/service-a
  - name: service-b
    spec: ./specs/service-b.yaml
    docs: ./docs/service-b

docs:
  - name: arch
    path: ./docs/arch
```

## Commands

Index everything in the registry:

```bash
npm run ingest -- --all
```

Index a single API by name, spec, and docs:

```bash
npm run ingest -- --api petstore --spec ./examples/petstore-openapi.yml --docs ./examples/
```

Use a registry file in a different location:

```bash
npm run ingest -- --all --registry ./my-org-docs/apis.yml
```

## Using your own docs

Alexandria is organization-agnostic. The core engine is separate from the data it indexes — your registry file, OpenAPI specs, markdown docs, and the SQLite database are all configurable.

To index your own documentation, create a directory with your data:

```
my-org-docs/
  apis.yml              # registry listing your APIs and docs
  specs/
    service-a.yaml
    service-b.yaml
  docs/
    service-a/
      getting-started.md
    service-b/
      overview.md
    arch/
      patterns.md
```

Point Alexandria at your data using `--registry` or environment variables:

```bash
# Via CLI flag
npm run ingest -- --all --registry ./my-org-docs/apis.yml

# Via environment variables (in .env or shell)
ALEXANDRIA_REGISTRY_PATH=./my-org-docs/apis.yml
ALEXANDRIA_DB_PATH=./my-org-docs/alexandria.db
```

This keeps your org data in a separate directory (or even a separate repo) from the Alexandria codebase. The MCP server will read whatever database `ALEXANDRIA_DB_PATH` points to.

## Embedding providers

Alexandria supports three embedding providers. The provider is selected via the `EMBEDDING_PROVIDER` environment variable in `.env`.

| Provider        | `EMBEDDING_PROVIDER` | Runs locally | API key required | Default model            |
| --------------- | -------------------- | ------------ | ---------------- | ------------------------ |
| Transformers.js | `transformers`       | Yes          | No               | Xenova/bge-large-en-v1.5 |
| Voyage AI       | `voyage`             | No           | Yes              | voyage-3-lite            |
| Ollama          | `ollama`             | Yes          | No               | bge-large                |

The default is Transformers.js — it runs locally with no setup beyond `npm install`.

> **Important:** The embedding provider used during ingestion must match the one used by the MCP server. Switching providers requires re-indexing: `npm run ingest -- --all`.

### Custom embedding models

The Ollama and Transformers providers can use any compatible embedding model:

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
