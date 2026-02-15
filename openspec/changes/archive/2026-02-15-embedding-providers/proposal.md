## Why

Alexandria's embedder is hardcoded to Voyage AI — a cloud API that requires an API key and internet access. This blocks local development without credentials, offline usage, and teams that can't send documentation to external APIs. Adding a provider abstraction with Ollama and Transformers.js support makes Alexandria usable in more environments while keeping Voyage as the default for production quality.

## What Changes

- Extract an `EmbeddingProvider` interface from the current embedder with `embedDocuments` and `embedQuery` methods
- Refactor the existing Voyage AI code into a provider implementation behind that interface
- Add an Ollama provider that calls a local Ollama instance's `/api/embed` endpoint
- Add a Transformers.js provider that runs ONNX models directly in Node.js with zero external dependencies
- Make the provider configurable via `EMBEDDING_PROVIDER` environment variable (default: `voyage`)
- Handle dimension differences across providers — different models produce different vector sizes (Voyage: 1024d, nomic-embed-text: 768d, all-minilm: 384d), and the `chunks_vec` table schema currently hardcodes `float[1024]`

## Capabilities

### New Capabilities

- `embedding-provider-interface`: A provider abstraction (`EmbeddingProvider` interface) with `embedDocuments(texts)` and `embedQuery(text)` methods, a factory function to instantiate the configured provider, and configuration via environment variables.
- `ollama-embedding-provider`: An `EmbeddingProvider` implementation that calls a local Ollama instance for embeddings. Configurable model and endpoint URL. Works offline with no API key.
- `transformers-js-embedding-provider`: An `EmbeddingProvider` implementation that runs ONNX embedding models directly in Node.js via Transformers.js. Zero external process dependencies. Works offline after initial model download.

### Modified Capabilities

- `embedding-generation`: The existing `embedDocuments` and `embedQuery` exports must use the provider interface internally instead of calling Voyage directly. External API unchanged — callers still import the same functions.

## Impact

- **Code**: Creates `src/ingestion/providers/` with interface, Voyage, Ollama, and Transformers.js implementations. Modifies `src/ingestion/embedder.ts` to delegate to the configured provider. Modifies `src/db/index.ts` schema to support dynamic vector dimensions.
- **Dependencies**: Adds `@huggingface/transformers` (Transformers.js). Ollama uses HTTP fetch (no new dependency).
- **Environment**: New env vars: `EMBEDDING_PROVIDER` (`voyage`|`ollama`|`transformers`), `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `nomic-embed-text`), `TRANSFORMERS_MODEL` (default `all-MiniLM-L6-v2`).
- **Database**: Vector dimension becomes provider-dependent. Changing providers requires re-indexing (re-embedding all chunks). Schema must accommodate the active provider's dimension.
- **Downstream**: The ingestion CLI and MCP server (both unbuilt) will inherit provider support transparently — they call `embedDocuments`/`embedQuery` which delegates to whatever provider is configured.
