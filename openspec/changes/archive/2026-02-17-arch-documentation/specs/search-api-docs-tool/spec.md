## MODIFIED Requirements

### Requirement: Rename search-docs to search-api-docs

The MCP tool formerly named `search-docs` SHALL be renamed to `search-api-docs`. The tool title SHALL be "Search API Documentation". The description SHALL be updated to: "Search indexed API documentation — endpoints, schemas, request/response formats, and API behaviour. Use this when you need to find information about a specific API."

#### Scenario: Tool name in MCP tool list

- **WHEN** the MCP tool list is retrieved
- **THEN** it SHALL contain `search-api-docs` and SHALL NOT contain `search-docs`

#### Scenario: Existing functionality preserved

- **WHEN** `search-api-docs` is called with `query`, optional `apiName`, and optional `types`
- **THEN** it SHALL behave identically to the former `search-docs` — embed query, run hybrid search, return markdown results

### Requirement: File and function rename

The source file SHALL be renamed from `search-docs.ts` to `search-api-docs.ts`. The registration function SHALL be renamed from `registerSearchDocs` to `registerSearchApiDocs`. All imports SHALL be updated accordingly.

#### Scenario: Server imports

- **WHEN** the MCP server starts
- **THEN** it SHALL import and register the tool from `search-api-docs.ts`
