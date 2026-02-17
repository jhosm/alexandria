## ADDED Requirements

### Requirement: search-fast-docs MCP tool

The MCP server SHALL register a tool named `search-fast-docs` that searches FAST architecture documentation. The tool description SHALL explicitly state: "Search FAST architecture documentation. Use this when you need to understand FAST concepts, write code to expose an API, or write code to consume an API."

#### Scenario: Search FAST docs with query

- **WHEN** `search-fast-docs` is called with `query: "how to expose an endpoint"`
- **THEN** it SHALL embed the query, run hybrid search scoped to the "fast" entry, and return matching chunks as markdown

#### Scenario: Search FAST docs with type filter

- **WHEN** `search-fast-docs` is called with `query: "authentication"` and `types: ["guide"]`
- **THEN** it SHALL only return guide-type chunks from the FAST documentation

#### Scenario: FAST not indexed

- **WHEN** `search-fast-docs` is called but no "fast" entry exists in the database
- **THEN** it SHALL return an error message: "FAST documentation not indexed yet."

### Requirement: search-fast-docs input schema

The tool SHALL accept `query` (required string) and `types` (optional array of ChunkType). It SHALL NOT accept an `apiName` parameter — it is always scoped to the "fast" entry.

#### Scenario: Tool parameter schema

- **WHEN** the MCP tool list is retrieved
- **THEN** `search-fast-docs` SHALL have `query` as required and `types` as optional, with no `apiName` parameter

### Requirement: search-fast-docs result format

Results SHALL use the same markdown formatting as `search-api-docs` (title, type badge, source name, content).

#### Scenario: Result formatting

- **WHEN** `search-fast-docs` returns results
- **THEN** each result SHALL be formatted with heading, type indicator, source ("fast"), and content
