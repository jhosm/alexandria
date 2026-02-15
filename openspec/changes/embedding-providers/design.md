## Context

Alexandria's embedder (`src/ingestion/embedder.ts`) is hardcoded to Voyage AI: it calls `https://api.voyageai.com/v1/embeddings` with model `voyage-3-lite`, producing 1024-dimensional vectors. The database schema in `src/db/index.ts` hardcodes `embedding float[1024]` in the `chunks_vec` virtual table. The public API is two functions: `embedDocuments(texts: string[]) → Float32Array[]` and `embedQuery(text: string) → Float32Array`.

No consumers outside the test file currently import these functions — the ingestion CLI (Phase 3) and MCP server (Phase 4) aren't built yet. This is an ideal time to introduce the abstraction before callers exist.

## Goals / Non-Goals

**Goals:**
- Define a provider interface that all embedding backends implement
- Ship three providers: Voyage AI (existing behavior), Ollama (local server), Transformers.js (in-process)
- Make provider selection configurable via environment variables
- Handle the vector dimension mismatch across providers safely
- Keep the existing `embedDocuments`/`embedQuery` public API unchanged for callers

**Non-Goals:**
- OpenAI / Cohere / other cloud provider support (can be added later via the same interface)
- Runtime provider switching (one provider per database, chosen at index time)
- Auto-migration between dimensions (user must re-index when switching providers)
- GPU acceleration for Transformers.js (CPU-only is fine for MVP)

## Decisions

### D1: Provider interface shape

**Choice**: A TypeScript interface with two methods matching the current public API:

```typescript
interface EmbeddingProvider {
  readonly dimension: number;
  embedDocuments(texts: string[]): Promise<Float32Array[]>;
  embedQuery(text: string): Promise<Float32Array>;
}
```

The `dimension` property lets the system know the vector size without making an embedding call. Each provider hardcodes this based on its model.

**Alternatives considered**:
- Single `embed(texts, type)` method: The document/query distinction is Voyage-specific. Ollama and Transformers.js don't differentiate. Two methods is clearer and lets providers that don't distinguish simply delegate `embedQuery` to `embedDocuments`.
- Abstract class instead of interface: Adds unnecessary ceremony. A plain interface with a factory function is simpler.

### D2: Provider file layout

**Choice**: One file per provider under `src/ingestion/providers/`:

```
src/ingestion/providers/
  types.ts          — EmbeddingProvider interface
  voyage.ts         — Voyage AI (refactored from current embedder.ts)
  ollama.ts         — Ollama HTTP client
  transformers.ts   — Transformers.js in-process
  index.ts          — Factory: reads config, returns provider instance
```

`src/ingestion/embedder.ts` becomes a thin wrapper that calls `getProvider()` and delegates. Its public API stays identical.

**Rationale**: Each provider is independent and testable in isolation. The factory centralizes configuration logic.

### D3: Ollama integration via native `/api/embed`

**Choice**: Call Ollama's `/api/embed` endpoint (not the OpenAI-compatible `/v1/embeddings`). It accepts an array of strings as `input` and returns `{ embeddings: [[...], [...]] }`.

```
POST http://localhost:11434/api/embed
{ "model": "nomic-embed-text", "input": ["text1", "text2"] }
→ { "embeddings": [[0.01, ...], [0.02, ...]] }
```

**Configuration**: `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `nomic-embed-text`).

**Alternatives considered**:
- OpenAI-compatible `/v1/embeddings`: Works but wraps the native API. Using the native endpoint avoids one layer of abstraction and matches Ollama's docs.

**Rationale**: Native API is simpler, supports batch input directly, and doesn't require parsing the OpenAI response format. No auth needed for local Ollama.

### D4: Transformers.js integration

**Choice**: Use `@huggingface/transformers` with the `pipeline('feature-extraction', model)` API. Create the pipeline once (lazy singleton), reuse for all calls.

```typescript
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const output = await extractor(texts, { pooling: 'mean', normalize: true });
```

**Configuration**: `TRANSFORMERS_MODEL` (default `Xenova/all-MiniLM-L6-v2`, 384d).

**Key details**:
- First call downloads the model (~80MB for MiniLM). Subsequent calls use the cache.
- `pooling: 'mean'` and `normalize: true` produce vectors suitable for cosine similarity.
- Returns a tensor — convert to `Float32Array` via `.tolist()`.

**Alternatives considered**:
- ONNX Runtime directly: Lower-level, more boilerplate for tokenization and pooling. Transformers.js handles this.

**Rationale**: Transformers.js is the official HuggingFace JS library, handles model download/caching, tokenization, and pooling in one call. Zero external process dependency.

### D5: Dynamic vector dimensions in the database

**Choice**: Store the active embedding dimension in a new `config` table. On database initialization, compare the stored dimension with the provider's `dimension` property. If they differ, throw a clear error instructing the user to re-index.

```sql
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

On first ingestion, write `embedding_dimension` to config and create the `chunks_vec` table with that dimension. On subsequent runs, validate the stored dimension matches the provider.

The `chunks_vec` table creation becomes dynamic:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
  chunk_id TEXT PRIMARY KEY,
  embedding float[${dimension}]
);
```

**Alternatives considered**:
- Always use 1024 and pad/truncate smaller vectors: Destroys embedding quality. Non-starter.
- Drop and recreate `chunks_vec` automatically on dimension change: Too destructive. User should explicitly decide to re-index.
- Store dimension in `.env`: Decoupled from the database, easy to misconfigure.

**Rationale**: The database is the source of truth for what's stored in it. A config table keeps the dimension co-located with the data. Explicit errors on mismatch are safer than silent data corruption.

### D6: Provider selection and configuration

**Choice**: A single env var `EMBEDDING_PROVIDER` with values `voyage` (default), `ollama`, or `transformers`. Provider-specific config uses provider-prefixed env vars.

| Variable | Default | Used by |
|---|---|---|
| `EMBEDDING_PROVIDER` | `voyage` | Factory |
| `VOYAGE_API_KEY` | (required) | Voyage |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama |
| `OLLAMA_MODEL` | `nomic-embed-text` | Ollama |
| `TRANSFORMERS_MODEL` | `Xenova/all-MiniLM-L6-v2` | Transformers.js |

**Rationale**: Env vars match the existing configuration pattern (`.env.example`). One top-level switch + provider-specific overrides keeps it simple.

## Risks / Trade-offs

- **Transformers.js first-run latency** → Model download (~80MB) blocks the first embedding call. Mitigation: Log a clear message ("Downloading model... this only happens once"). Subsequent runs use cached model.
- **Dimension mismatch on provider switch** → Changing providers invalidates all stored vectors. Mitigation: Clear error message with instructions to re-index (`npm run ingest -- --all --force`). The `--force` flag (to be added in the ingestion CLI change) would skip hash comparison and re-embed everything.
- **Ollama must be running** → Unlike Voyage (cloud) and Transformers.js (in-process), Ollama requires a separate process. Mitigation: Clear error on connection refused with setup instructions.
- **Embedding quality varies** → `all-MiniLM-L6-v2` (384d) is lower quality than `voyage-3-lite` (1024d). Mitigation: Document the quality/convenience trade-off. Users who need best search quality should use Voyage; local providers are for development and offline use.
