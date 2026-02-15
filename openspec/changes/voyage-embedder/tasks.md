## 1. Core Embedder

- [ ] 1.1 Create `src/ingestion/embedder.ts` with `embedDocuments(texts)` and `embedQuery(text)` function signatures
- [ ] 1.2 Implement Voyage API call helper — POST to `https://api.voyageai.com/v1/embeddings` with Bearer auth, model `voyage-3-lite`, and input_type parameter
- [ ] 1.3 Implement batch splitting — split input arrays into groups of 128, make parallel API calls, flatten results
- [ ] 1.4 Implement `embedDocuments` using `input_type: "document"`
- [ ] 1.5 Implement `embedQuery` using `input_type: "query"`
- [ ] 1.6 Implement API key validation — throw descriptive error if `VOYAGE_API_KEY` is not set
- [ ] 1.7 Implement error handling — throw on non-200 responses with status code and body

## 2. Tests

- [ ] 2.1 Create `src/ingestion/__tests__/embedder.test.ts` with mocked Voyage API (mock global fetch)
- [ ] 2.2 Test: `embedDocuments` sends correct `input_type: "document"` and returns expected vectors
- [ ] 2.3 Test: `embedQuery` sends correct `input_type: "query"` and returns a single vector
- [ ] 2.4 Test: batch splitting — 200 texts produce 2 API calls (128 + 72)
- [ ] 2.5 Test: empty input returns empty array without API calls
- [ ] 2.6 Test: missing API key throws descriptive error
- [ ] 2.7 Test: API error response throws with status code
