## MODIFIED Requirements

### Requirement: Docs-only ingestion (markdown without OpenAPI spec)

The ingestion pipeline SHALL support ingesting entries that have only a docs path and no OpenAPI spec. For such entries, it SHALL parse all `.md` files in the directory, embed chunks, and upsert them — skipping OpenAPI parsing entirely. The same incremental re-indexing (content hashing) and orphan cleanup SHALL apply.

#### Scenario: Ingest a docs-only entry

- **WHEN** a docs entry with `name: "fast"` and `path: "./docs/fast"` is ingested
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

- **WHEN** a docs entry named "fast" is ingested for the first time
- **THEN** a new row SHALL be created in the `apis` table with `name = "fast"`, `specPath = null`, and `docsPath` set to the resolved path
