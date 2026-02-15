## Context

Hybrid search in Alexandria combines FTS5 keyword search with vector similarity search. The vector component requires embeddings — numerical representations of text that capture semantic meaning. Voyage AI provides a hosted embedding API, and we need a thin client wrapper that handles batching and the document/query input type distinction.

## Goals / Non-Goals

**Goals:**
- Provide `embedDocuments(texts[])` for batch embedding during ingestion
- Provide `embedQuery(text)` for single query embedding at search time
- Handle Voyage API batching (128 texts per request)
- Use correct `input_type` parameter for document vs query embeddings

**Non-Goals:**
- Local/offline embedding models
- Caching embeddings (the database handles persistence)
- Retry logic beyond basic error surfacing (MVP)
- Supporting multiple embedding models simultaneously

## Decisions

### D1: Voyage AI voyage-3-lite over alternatives

**Choice**: Use Voyage AI's `voyage-3-lite` model (1024 dimensions).

**Alternatives considered**:
- OpenAI `text-embedding-3-small`: Good quality but higher cost for large batch ingestion.
- Local models (e.g., via Ollama): Requires GPU/CPU resources and model management.
- Voyage `voyage-3`: Better quality but higher cost and latency. Lite is sufficient for API docs retrieval.

**Rationale**: `voyage-3-lite` is optimized for retrieval use cases, has good benchmark scores, reasonable pricing, and 1024 dimensions keeps storage manageable.

### D2: Native fetch over SDK

**Choice**: Use Node.js built-in `fetch` to call the Voyage REST API directly.

**Alternatives considered**:
- `voyageai` npm package: Adds a dependency for a simple REST call.

**Rationale**: The Voyage API is a single POST endpoint. A few lines of fetch code is simpler than adding and maintaining an SDK dependency.

### D3: Batch size of 128

**Choice**: Split texts into batches of 128 per API call.

**Rationale**: Voyage's API accepts up to 128 texts per request. We batch at this maximum to minimize API calls while staying within limits.

### D4: input_type distinction

**Choice**: Use `input_type: "document"` when embedding chunks during ingestion and `input_type: "query"` when embedding search queries at runtime.

**Rationale**: Voyage AI optimizes embeddings differently based on whether the text is a document being indexed or a query being searched. Using the correct type improves retrieval quality.

## Risks / Trade-offs

- **API dependency** → Embedding requires network access to Voyage AI. Mitigation: Embeddings are only needed during ingestion and search — if Voyage is down, ingestion fails clearly. Cached embeddings in the DB still serve vector search.
- **Cost at scale** → Large-scale re-indexing generates API costs. Mitigation: Incremental re-indexing (content hash comparison) avoids re-embedding unchanged chunks.
- **Rate limiting** → Voyage may rate-limit high-volume requests. Mitigation: Batch size of 128 minimizes request count. For MVP volumes (hundreds of chunks), this is not a concern.
