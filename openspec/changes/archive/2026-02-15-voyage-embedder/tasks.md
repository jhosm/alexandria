## 1. Core Embedder

- [x] 1.1 Create `src/ingestion/embedder.ts` with `embedDocuments(texts)` and `embedQuery(text)` function signatures
- [x] 1.2 Implement Voyage API call helper — POST to `https://api.voyageai.com/v1/embeddings` with Bearer auth, model `voyage-3-lite`, and input_type parameter
- [x] 1.3 Implement batch splitting — split input arrays into groups of 128, make parallel API calls, flatten results
- [x] 1.4 Implement `embedDocuments` using `input_type: "document"`
- [x] 1.5 Implement `embedQuery` using `input_type: "query"`
- [x] 1.6 Implement API key validation — throw descriptive error if `VOYAGE_API_KEY` is not set
- [x] 1.7 Implement error handling — throw on non-200 responses with status code and body

## 2. Tests

- [x] 2.1 Create `src/ingestion/__tests__/embedder.test.ts` with mocked Voyage API (mock global fetch)
- [x] 2.2 Test: `embedDocuments` sends correct `input_type: "document"` and returns expected vectors
- [x] 2.3 Test: `embedQuery` sends correct `input_type: "query"` and returns a single vector
- [x] 2.4 Test: batch splitting — 200 texts produce 2 API calls (128 + 72)
- [x] 2.5 Test: empty input returns empty array without API calls
- [x] 2.6 Test: missing API key throws descriptive error
- [x] 2.7 Test: API error response throws with status code
