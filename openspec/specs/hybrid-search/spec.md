## ADDED Requirements

### Requirement: Hybrid search via Reciprocal Rank Fusion

The system SHALL provide a `searchHybrid` function that combines FTS5 full-text search results and sqlite-vec vector similarity results using Reciprocal Rank Fusion (RRF) with k=60. The function SHALL accept a text query, a query embedding vector, and search options.

#### Scenario: Combined search returns fused results

- **WHEN** `searchHybrid` is called with a query string and query embedding
- **THEN** the system SHALL run both FTS5 and vector searches, combine results using RRF scoring (`score = sum(1/(k+rank))` per source), and return results sorted by descending RRF score

#### Scenario: Result appears in both search sources

- **WHEN** a chunk matches both the FTS5 query and the vector similarity search
- **THEN** its RRF score SHALL be the sum of both contributions (`1/(k+rank_fts) + 1/(k+rank_vec)`), ranking it higher than chunks appearing in only one source

#### Scenario: Result appears in only one source

- **WHEN** a chunk matches only the FTS5 search or only the vector search
- **THEN** it SHALL still appear in results with an RRF score from that single source

### Requirement: Search result limit

The system SHALL accept an optional `limit` parameter (default 20) controlling the maximum number of results returned. It SHALL over-fetch from each source (3x limit) before fusion to ensure good coverage.

#### Scenario: Default limit

- **WHEN** `searchHybrid` is called without a limit option
- **THEN** at most 20 results SHALL be returned

#### Scenario: Custom limit

- **WHEN** `searchHybrid` is called with `limit: 5`
- **THEN** at most 5 results SHALL be returned

### Requirement: Search filtering by API

The system SHALL accept an optional `apiId` filter. When provided, only chunks belonging to that API SHALL be included in results.

#### Scenario: Filter by API

- **WHEN** `searchHybrid` is called with `apiId: "payments-api"`
- **THEN** only chunks with `api_id = "payments-api"` SHALL appear in results

### Requirement: Search filtering by chunk type

The system SHALL accept an optional `types` filter (array of ChunkType). When provided, only chunks matching one of the specified types SHALL be included in results.

#### Scenario: Filter by chunk types

- **WHEN** `searchHybrid` is called with `types: ["endpoint", "schema"]`
- **THEN** only chunks with type `endpoint` or `schema` SHALL appear in results

### Requirement: Search returns full chunk data

Each search result SHALL include the full `Chunk` object (with all fields except embedding) and the computed RRF score.

#### Scenario: Result contains chunk and score

- **WHEN** a search returns results
- **THEN** each result SHALL have a `chunk` field with id, apiId, type, title, content, contentHash, and metadata, and a `score` field with the RRF score

### Requirement: FTS query safety

The FTS5 search SHALL sanitize the input query by removing special FTS5 syntax characters (`'`, `"`, `*`, `(`, `)`) to prevent query syntax errors. If the sanitized query is empty, FTS SHALL return no results.

#### Scenario: Special characters in query

- **WHEN** a search query contains FTS5 special characters like `"user's (data)"`
- **THEN** the system SHALL sanitize the query and execute FTS without errors

#### Scenario: Empty query after sanitization

- **WHEN** a search query consists entirely of special characters
- **THEN** FTS SHALL return an empty result set and vector search results SHALL still be returned
