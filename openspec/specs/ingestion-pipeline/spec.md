## Requirements

### Requirement: Single API ingestion command

The CLI SHALL support `ingest --api <name> --spec <path> [--docs <dir>]` to index a single API. It SHALL parse the spec file, optionally parse markdown files from the docs directory, embed new/changed chunks, and write them to the database.

#### Scenario: Ingest API with spec and docs

- **WHEN** `ingest --api payments --spec ./specs/payments/openapi.yaml --docs ./specs/payments/docs/` is run
- **THEN** the system SHALL parse the OpenAPI spec, parse all `.md` files in the docs directory, embed chunks, upsert them into the database, and report the number of chunks processed

#### Scenario: Ingest API with spec only

- **WHEN** `ingest --api payments --spec ./specs/payments/openapi.yaml` is run without `--docs`
- **THEN** the system SHALL parse only the OpenAPI spec and skip markdown parsing

### Requirement: Batch ingestion from registry

The CLI SHALL support `ingest --all` to process all APIs listed in `apis.yml`. It SHALL process each API sequentially using the same pipeline as single API ingestion.

#### Scenario: Ingest all APIs from registry

- **WHEN** `ingest --all` is run with an `apis.yml` containing 3 APIs
- **THEN** the system SHALL process each API sequentially, reporting progress for each

#### Scenario: Missing apis.yml

- **WHEN** `ingest --all` is run but `apis.yml` does not exist
- **THEN** the system SHALL exit with an error message indicating the registry file is missing

### Requirement: apis.yml registry format

The system SHALL read an `apis.yml` file with the following structure: a top-level `apis` array where each entry has `name` (required string), `spec` (required file path), and `docs` (optional directory path).

#### Scenario: Valid registry file

- **WHEN** `apis.yml` contains entries with name, spec, and optional docs fields
- **THEN** the system SHALL parse all entries and use them for ingestion

### Requirement: Incremental re-indexing

The pipeline SHALL compare content hashes of parsed chunks against existing chunks in the database. Only chunks with new or changed hashes SHALL be embedded and upserted. Unchanged chunks SHALL be skipped.

#### Scenario: No changes detected

- **WHEN** the pipeline runs on an API that has already been fully indexed with no source changes
- **THEN** zero chunks SHALL be embedded and the database SHALL remain unchanged

#### Scenario: Partial changes detected

- **WHEN** the pipeline runs after one endpoint description was modified in the spec
- **THEN** only the affected endpoint chunk SHALL be re-embedded and upserted

### Requirement: Orphan chunk cleanup

After processing all source files for an API, the pipeline SHALL delete any chunks in the database that were not present in the current parse results (orphans). This handles removed endpoints, deleted docs, etc.

#### Scenario: Endpoint removed from spec

- **WHEN** an endpoint that was previously indexed is removed from the spec and ingestion runs
- **THEN** the orphaned endpoint chunk SHALL be deleted from chunks, chunks_fts, and chunks_vec

### Requirement: API registry upsert

The pipeline SHALL upsert an entry in the `apis` table for each processed API, recording its name, spec path, and docs path.

#### Scenario: New API is registered

- **WHEN** an API is ingested for the first time
- **THEN** a new entry SHALL be created in the apis table

#### Scenario: Existing API is updated

- **WHEN** an already-registered API is re-ingested
- **THEN** the existing apis table entry SHALL be updated with current paths and timestamp

### Requirement: Console output

The CLI SHALL print progress information to stdout: which API is being processed, how many chunks were parsed, how many were new/changed (embedded), how many were unchanged (skipped), and how many orphans were deleted.

#### Scenario: Progress output

- **WHEN** ingestion completes for an API
- **THEN** the CLI SHALL print a summary line showing total chunks, embedded count, skipped count, and deleted orphan count

### Requirement: Docs-only ingestion (markdown without OpenAPI spec)

The ingestion pipeline SHALL support ingesting entries that have only a docs path and no OpenAPI spec. For such entries, it SHALL parse all `.md` files in the directory, embed chunks, and upsert them — skipping OpenAPI parsing entirely. The same incremental re-indexing (content hashing) and orphan cleanup SHALL apply.

#### Scenario: Ingest a docs-only entry

- **WHEN** a docs entry with `name: "arch"` and `path: "./docs/arch"` is ingested
- **THEN** the system SHALL parse all `.md` files in that directory, embed new/changed chunks, upsert them, and report the result — with zero OpenAPI chunks

#### Scenario: Incremental re-indexing for docs entries

- **WHEN** a docs entry is re-ingested with no source changes
- **THEN** zero chunks SHALL be embedded and the database SHALL remain unchanged

### Requirement: Batch ingestion includes docs entries

The `ingest --all` command SHALL process both `apis` entries and `docs` entries from the registry. API entries SHALL be processed first (existing behaviour), followed by docs entries. Both use the same progress reporting format.

#### Scenario: Ingest all with both apis and docs

- **WHEN** `ingest --all` is run with a registry containing 1 API and 1 doc entry
- **THEN** the system SHALL process the API entry, then the doc entry, and report a combined summary

#### Scenario: Ingest all with only docs

- **WHEN** `ingest --all` is run with a registry containing no apis and 1 doc entry
- **THEN** the system SHALL process only the doc entry and report the summary

### Requirement: Docs entry stored in apis table

A docs entry SHALL be upserted into the `apis` table with `specPath` as `null` and `docsPath` set to the resolved directory path.

#### Scenario: Doc entry creates apis table record

- **WHEN** a docs entry named "arch" is ingested for the first time
- **THEN** a new row SHALL be created in the `apis` table with `name = "arch"`, `specPath = null`, and `docsPath` set to the resolved path
