## ADDED Requirements

### Requirement: Parse markdown file into chunks

The system SHALL provide a `parseMarkdownFile(filePath: string, apiId: string)` function that reads a markdown file and returns a `Chunk[]` array split at h2/h3 heading boundaries.

#### Scenario: Parse a markdown file with h2 sections

- **WHEN** `parseMarkdownFile` is called with a markdown file containing three h2 sections
- **THEN** it SHALL return at least three chunks, one per section

#### Scenario: Invalid file path

- **WHEN** `parseMarkdownFile` is called with a non-existent file path
- **THEN** it SHALL throw an error

### Requirement: Heading hierarchy preservation

Each chunk's title SHALL include the full heading hierarchy from the document. For example, a section under `## Authentication` > `### OAuth Flow` SHALL have title "Authentication > OAuth Flow".

#### Scenario: Nested heading title

- **WHEN** a markdown file has `## Authentication` followed by `### OAuth Flow`
- **THEN** the chunk for the OAuth Flow section SHALL have title "Authentication > OAuth Flow"

#### Scenario: Top-level section title

- **WHEN** a markdown file has `# API Guide` followed by `## Getting Started`
- **THEN** the chunk for Getting Started SHALL have title "API Guide > Getting Started"

### Requirement: Automatic chunk type detection

The parser SHALL auto-detect chunk type from the filename:
- Files containing "glossary" (case-insensitive) → `glossary` type
- Files containing "use-case" or "use_case" (case-insensitive) → `use-case` type
- All other files → `guide` type

#### Scenario: Glossary file detection

- **WHEN** `parseMarkdownFile` is called with a file named `api-glossary.md`
- **THEN** all chunks SHALL have type `glossary`

#### Scenario: Use-case file detection

- **WHEN** `parseMarkdownFile` is called with a file named `payment-use-cases.md`
- **THEN** all chunks SHALL have type `use-case`

#### Scenario: Guide file detection (default)

- **WHEN** `parseMarkdownFile` is called with a file named `getting-started.md`
- **THEN** all chunks SHALL have type `guide`

### Requirement: Paragraph-boundary splitting for oversized sections

When a section's content exceeds a configurable maximum character count (default 3000), the parser SHALL split it at the nearest paragraph boundary (double newline). Split chunks SHALL retain the same heading title with a part suffix.

#### Scenario: Large section is split

- **WHEN** a section contains 5000 characters of content
- **THEN** it SHALL be split into multiple chunks at paragraph boundaries, each within the max size

#### Scenario: Small section is not split

- **WHEN** a section contains 1000 characters of content
- **THEN** it SHALL remain as a single chunk

### Requirement: Content hashing

Each chunk SHALL have a `contentHash` field containing the SHA-256 hex digest of its `content` string.

#### Scenario: Deterministic hashing

- **WHEN** the same file is parsed twice without changes
- **THEN** all chunks SHALL have identical `contentHash` values

### Requirement: Chunk ID generation

Each chunk SHALL have a deterministic `id` derived from the apiId, filename (without extension), and heading path. This ensures idempotent upserts.

#### Scenario: Chunk ID format

- **WHEN** a chunk is generated for the "OAuth Flow" section under "Authentication" in file `auth-guide.md` for API `payments`
- **THEN** its id SHALL be `payments:doc:auth-guide:authentication>oauth-flow`

### Requirement: Chunk metadata

Each chunk's metadata SHALL include `filePath` (source file), `headings` (array of heading texts in hierarchy), and `chunkIndex` (position within the file).

#### Scenario: Metadata fields present

- **WHEN** a chunk is generated from a markdown file
- **THEN** its metadata SHALL contain `filePath`, `headings`, and `chunkIndex` fields
