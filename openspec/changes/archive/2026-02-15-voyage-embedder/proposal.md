## Why

Alexandria needs vector embeddings for both document chunks (at ingestion time) and search queries (at runtime) to power the vector similarity component of hybrid search. Voyage AI's `voyage-3-lite` provides high-quality embeddings optimized for retrieval at reasonable cost.

## What Changes

- Voyage AI client wrapper with batch document embedding and single query embedding
- `inputType` distinction: `document` for chunks during ingestion, `query` for search queries at runtime
- Batch processing with 128 texts per API request to stay within Voyage rate limits
- Error handling for API failures

## Capabilities

### New Capabilities

- `embedding-generation`: Batch-embed document chunks and embed individual search queries using Voyage AI `voyage-3-lite` (1024 dimensions). Handles batching, input type distinction, and API communication.

### Modified Capabilities

(none)

## Impact

- **Code**: Creates `src/ingestion/embedder.ts` and test file
- **Dependencies**: Uses native `fetch` (Node 18+) — no additional npm packages needed
- **Environment**: Requires `VOYAGE_API_KEY` environment variable
- **Downstream**: Used by ingestion-cli (Change 5) for batch embedding during indexing, and by mcp-server (Change 6) for query embedding during search
