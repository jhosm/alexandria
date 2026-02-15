## MODIFIED Requirements

### Requirement: Batch document embedding

The system SHALL provide an `embedDocuments(texts: string[])` function that delegates to the configured `EmbeddingProvider` instance, returning an array of Float32Array vectors. It SHALL preserve batching behavior where the provider supports it.

#### Scenario: Embed a batch of document texts

- **WHEN** `embedDocuments` is called with 10 texts
- **THEN** it SHALL delegate to the active provider's `embedDocuments` method and return 10 Float32Array embeddings

#### Scenario: Empty input

- **WHEN** `embedDocuments` is called with an empty array
- **THEN** it SHALL return an empty array without calling the provider

### Requirement: Single query embedding

The system SHALL provide an `embedQuery(text: string)` function that delegates to the configured `EmbeddingProvider` instance, returning a single Float32Array vector.

#### Scenario: Embed a search query

- **WHEN** `embedQuery` is called with "how to authenticate users"
- **THEN** it SHALL delegate to the active provider's `embedQuery` method and return a single Float32Array

### Requirement: API key configuration

The Voyage provider SHALL read the Voyage API key from the `VOYAGE_API_KEY` environment variable. If the variable is not set and the Voyage provider is active, functions SHALL throw an error with a descriptive message. Other providers SHALL NOT require `VOYAGE_API_KEY`.

#### Scenario: Missing API key with Voyage provider

- **WHEN** `embedDocuments` or `embedQuery` is called with the Voyage provider active and `VOYAGE_API_KEY` not set
- **THEN** it SHALL throw an error indicating the API key is missing

#### Scenario: Missing API key with non-Voyage provider

- **WHEN** `embedDocuments` is called with the Ollama or Transformers.js provider active and `VOYAGE_API_KEY` not set
- **THEN** it SHALL succeed without requiring a Voyage API key
