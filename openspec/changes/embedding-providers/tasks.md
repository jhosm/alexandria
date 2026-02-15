## 1. Interface and Factory

- [ ] 1.1 Create `src/ingestion/providers/types.ts` with `EmbeddingProvider` interface (`dimension`, `embedDocuments`, `embedQuery`)
- [ ] 1.2 Create `src/ingestion/providers/index.ts` with `getProvider()` factory — reads `EMBEDDING_PROVIDER` env var, returns singleton instance, throws on invalid value
- [ ] 1.3 Write tests for the factory: default provider, each valid value, invalid value error, singleton behavior

## 2. Voyage Provider

- [ ] 2.1 Create `src/ingestion/providers/voyage.ts` — extract existing Voyage logic from `embedder.ts` into an `EmbeddingProvider` implementation (dimension: 1024, batching at 128)
- [ ] 2.2 Migrate existing embedder tests to test the Voyage provider directly
- [ ] 2.3 Refactor `src/ingestion/embedder.ts` to delegate to `getProvider()` — keep `embedDocuments`/`embedQuery` exports unchanged

## 3. Ollama Provider

- [ ] 3.1 Create `src/ingestion/providers/ollama.ts` — POST to `{OLLAMA_URL}/api/embed`, parse `embeddings` array to Float32Array, config via `OLLAMA_URL` and `OLLAMA_MODEL`
- [ ] 3.2 Write tests for Ollama provider: embed documents, embed query, empty input, connection error, API error response

## 4. Transformers.js Provider

- [ ] 4.1 Install `@huggingface/transformers` as a dependency
- [ ] 4.2 Create `src/ingestion/providers/transformers.ts` — lazy pipeline initialization, `feature-extraction` with `pooling: 'mean'` and `normalize: true`, convert tensor output to Float32Array
- [ ] 4.3 Write tests for Transformers.js provider: embed documents, embed query, empty input (no pipeline init), singleton pipeline reuse

## 5. Dynamic Database Dimensions

- [ ] 5.1 Add `config` table to the database schema in `src/db/index.ts`
- [ ] 5.2 Make `chunks_vec` table creation dynamic — accept dimension parameter instead of hardcoded 1024
- [ ] 5.3 Add dimension validation on startup: store dimension on first init, compare on subsequent inits, throw on mismatch
- [ ] 5.4 Write tests for dimension handling: first init stores dimension, matching dimension passes, mismatched dimension throws

## 6. Configuration

- [ ] 6.1 Update `.env.example` with new env vars: `EMBEDDING_PROVIDER`, `OLLAMA_URL`, `OLLAMA_MODEL`, `TRANSFORMERS_MODEL`

## 7. Verification

- [ ] 7.1 Run full test suite — all existing tests pass with Voyage as default provider
- [ ] 7.2 Manually test Ollama provider with a running Ollama instance
- [ ] 7.3 Manually test Transformers.js provider (confirm model download + embedding)
