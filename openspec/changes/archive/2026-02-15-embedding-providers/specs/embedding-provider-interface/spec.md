## ADDED Requirements

### Requirement: EmbeddingProvider interface

The system SHALL define an `EmbeddingProvider` interface with a readonly `dimension` property (number), an `embedDocuments(texts: string[])` method returning `Promise<Float32Array[]>`, and an `embedQuery(text: string)` method returning `Promise<Float32Array>`.

#### Scenario: Interface contract

- **WHEN** a class implements `EmbeddingProvider`
- **THEN** it SHALL expose `dimension` as a readonly number, `embedDocuments` accepting a string array and returning Float32Array[], and `embedQuery` accepting a single string and returning a Float32Array

### Requirement: Provider factory

The system SHALL provide a `getProvider()` factory function that reads `EMBEDDING_PROVIDER` from the environment and returns the corresponding `EmbeddingProvider` instance. Valid values SHALL be `voyage`, `ollama`, and `transformers`. The default SHALL be `voyage`.

#### Scenario: Default provider

- **WHEN** `getProvider()` is called with no `EMBEDDING_PROVIDER` set
- **THEN** it SHALL return a Voyage AI provider instance

#### Scenario: Ollama provider selection

- **WHEN** `EMBEDDING_PROVIDER` is set to `ollama`
- **THEN** `getProvider()` SHALL return an Ollama provider instance

#### Scenario: Transformers.js provider selection

- **WHEN** `EMBEDDING_PROVIDER` is set to `transformers`
- **THEN** `getProvider()` SHALL return a Transformers.js provider instance

#### Scenario: Invalid provider

- **WHEN** `EMBEDDING_PROVIDER` is set to an unrecognized value
- **THEN** `getProvider()` SHALL throw an error listing the valid provider names

### Requirement: Provider singleton

The factory SHALL return the same provider instance on repeated calls within a process. The provider SHALL be created lazily on first call.

#### Scenario: Singleton behavior

- **WHEN** `getProvider()` is called twice
- **THEN** both calls SHALL return the same instance

### Requirement: Dynamic vector dimension in database schema

The system SHALL store the active embedding dimension in a `config` table (`key: 'embedding_dimension'`). The `chunks_vec` virtual table SHALL be created with the provider's `dimension` value. On subsequent startups, if the stored dimension does not match the provider's dimension, the system SHALL throw an error with a message instructing the user to re-index.

#### Scenario: First initialization

- **WHEN** the database is initialized with no existing `config` entry for `embedding_dimension`
- **THEN** the system SHALL write the provider's dimension to the config table and create `chunks_vec` with that dimension

#### Scenario: Matching dimension on restart

- **WHEN** the database is initialized and the stored `embedding_dimension` matches the provider's dimension
- **THEN** initialization SHALL proceed normally

#### Scenario: Dimension mismatch on restart

- **WHEN** the database is initialized and the stored `embedding_dimension` differs from the provider's dimension
- **THEN** the system SHALL throw an error stating the dimension mismatch and instructing the user to re-index
