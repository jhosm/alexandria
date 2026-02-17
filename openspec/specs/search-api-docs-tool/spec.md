## Requirements

### Requirement: search-api-docs MCP tool

The MCP tool SHALL be named `search-api-docs`. The tool title SHALL be "Search API Documentation". The description SHALL be: "Search indexed API documentation — endpoints, schemas, request/response formats, and API behaviour. Use this when you need to find information about a specific API."

#### Scenario: Tool name in MCP tool list

- **WHEN** the MCP tool list is retrieved
- **THEN** it SHALL contain `search-api-docs` and SHALL NOT contain `search-docs`

#### Scenario: Existing functionality preserved

- **WHEN** `search-api-docs` is called with `query`, optional `apiName`, and optional `types`
- **THEN** it SHALL embed query, run hybrid search, return markdown results

### Requirement: File and function naming

The source file SHALL be named `search-api-docs.ts`. The registration function SHALL be named `registerSearchApiDocs`. All imports SHALL be updated accordingly.

#### Scenario: Server imports

- **WHEN** the MCP server starts
- **THEN** it SHALL import and register the tool from `search-api-docs.ts`
