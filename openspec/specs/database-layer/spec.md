## ADDED Requirements

### Requirement: Database initialization with schema

The system SHALL create a SQLite database with WAL journal mode, foreign keys enabled, and sqlite-vec extension loaded. It SHALL create the `apis`, `chunks`, `chunks_fts`, and `chunks_vec` tables on first connection.

#### Scenario: First-time database creation

- **WHEN** `getDb()` is called and no database file exists
- **THEN** the system SHALL create the database file, enable WAL mode and foreign keys, load sqlite-vec, and create all four tables

#### Scenario: Existing database reconnection

- **WHEN** `getDb()` is called and the database already exists with tables
- **THEN** the system SHALL return the existing connection without recreating tables (using `CREATE TABLE IF NOT EXISTS`)

### Requirement: APIs table schema

The `apis` table SHALL store API registry entries with columns: `id` (TEXT PRIMARY KEY), `name` (TEXT NOT NULL UNIQUE), `version` (TEXT), `spec_path` (TEXT), `docs_path` (TEXT), `created_at` (TEXT), `updated_at` (TEXT).

#### Scenario: Insert and retrieve an API entry

- **WHEN** an API entry is upserted with id, name, version, spec_path, and docs_path
- **THEN** it SHALL be retrievable by querying the apis table and all fields SHALL match

### Requirement: Chunks table schema

The `chunks` table SHALL store document chunks with columns: `id` (TEXT PRIMARY KEY), `api_id` (TEXT NOT NULL, FK to apis), `type` (TEXT NOT NULL), `title` (TEXT NOT NULL), `content` (TEXT NOT NULL), `content_hash` (TEXT NOT NULL), `metadata` (TEXT, JSON string), `created_at` (TEXT). It SHALL have indexes on `api_id` and `content_hash`.

#### Scenario: Foreign key cascade on API deletion

- **WHEN** an API entry is deleted from the `apis` table
- **THEN** all associated chunks SHALL be cascade-deleted

### Requirement: FTS5 virtual table for full-text search

The `chunks_fts` table SHALL be a FTS5 virtual table with columns: `chunk_id` (UNINDEXED), `title`, `content`. It SHALL be kept in sync with the `chunks` table via manual operations in the same transaction.

#### Scenario: FTS table supports text search

- **WHEN** a chunk is inserted into both `chunks` and `chunks_fts`
- **THEN** the chunk SHALL be retrievable via FTS5 MATCH queries on title or content

### Requirement: Vector virtual table for similarity search

The `chunks_vec` table SHALL be a vec0 virtual table with columns: `chunk_id` (TEXT PRIMARY KEY), `embedding` (float[1024]). It SHALL be kept in sync with the `chunks` table via manual operations in the same transaction.

#### Scenario: Vector table supports similarity search

- **WHEN** a chunk embedding is inserted into `chunks_vec`
- **THEN** it SHALL be retrievable via `embedding MATCH` queries with a query vector

### Requirement: CRUD operations for APIs

The system SHALL provide `upsertApi` (insert or update on conflict) and `getApis` (list all) operations on the apis table.

#### Scenario: Upsert creates new API

- **WHEN** `upsertApi` is called with a new API id
- **THEN** a new row SHALL be inserted

#### Scenario: Upsert updates existing API

- **WHEN** `upsertApi` is called with an existing API id
- **THEN** the existing row SHALL be updated and `updated_at` SHALL reflect the current time

### Requirement: CRUD operations for chunks

The system SHALL provide `upsertChunk` (transactional insert/update across chunks + FTS + vec), `deleteChunk` (transactional delete from all three tables), `deleteChunksByApi` (bulk delete all chunks for an API), `getChunksByApi` (with optional type filter), `getChunkById`, and `getChunksByIds`.

#### Scenario: Upsert chunk writes to all three tables

- **WHEN** `upsertChunk` is called with a chunk and embedding
- **THEN** the chunk SHALL be written to `chunks`, `chunks_fts`, and `chunks_vec` in a single transaction

#### Scenario: Delete chunk removes from all three tables

- **WHEN** `deleteChunk` is called with a chunk id
- **THEN** the chunk SHALL be removed from `chunks`, `chunks_fts`, and `chunks_vec` in a single transaction

#### Scenario: Delete chunks by API removes all associated data

- **WHEN** `deleteChunksByApi` is called with an api_id
- **THEN** all chunks for that API SHALL be removed from all three tables

### Requirement: In-memory database for testing

The system SHALL provide a `createTestDb()` function that creates an in-memory SQLite database with the full schema initialized, suitable for unit tests.

#### Scenario: Test database is functional

- **WHEN** `createTestDb()` is called
- **THEN** it SHALL return a fully initialized in-memory database with all tables and the sqlite-vec extension loaded
