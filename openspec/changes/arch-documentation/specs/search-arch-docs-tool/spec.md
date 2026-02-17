## ADDED Requirements

### Requirement: search-arch-docs MCP tool

The MCP server SHALL register a tool named `search-arch-docs` that searches architecture documentation. The tool description SHALL explicitly state: "Search architecture documentation. Use this when you need to understand architecture concepts, write code to expose an API, or write code to consume an API."

#### Scenario: Search architecture docs with query

- **WHEN** `search-arch-docs` is called with `query: "how to expose an endpoint"`
- **THEN** it SHALL embed the query, run hybrid search scoped to the "arch" entry, and return matching chunks as markdown

#### Scenario: Search architecture docs with type filter

- **WHEN** `search-arch-docs` is called with `query: "authentication"` and `types: ["guide"]`
- **THEN** it SHALL only return guide-type chunks from the architecture documentation

#### Scenario: Architecture not indexed

- **WHEN** `search-arch-docs` is called but no "arch" entry exists in the database
- **THEN** it SHALL return an error message: "Architecture documentation not indexed yet."

### Requirement: search-arch-docs input schema

The tool SHALL accept `query` (required string) and `types` (optional array of ChunkType). It SHALL NOT accept an `apiName` parameter — it is always scoped to the "arch" entry.

#### Scenario: Tool parameter schema

- **WHEN** the MCP tool list is retrieved
- **THEN** `search-arch-docs` SHALL have `query` as required and `types` as optional, with no `apiName` parameter

### Requirement: search-arch-docs result format

Results SHALL use the same markdown formatting as `search-api-docs` (title, type badge, source name, content).

#### Scenario: Result formatting

- **WHEN** `search-arch-docs` returns results
- **THEN** each result SHALL be formatted with heading, type indicator, source ("arch"), and content
