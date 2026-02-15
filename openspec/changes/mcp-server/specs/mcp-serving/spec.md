## ADDED Requirements

### Requirement: MCP server over Streamable HTTP

The system SHALL provide an Express-based HTTP server that handles MCP protocol requests via `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`. The server SHALL be stateless (no session management). It SHALL listen on the port specified by `ALEXANDRIA_PORT` environment variable (default 3000).

#### Scenario: Server starts and accepts MCP requests

- **WHEN** the server is started
- **THEN** it SHALL listen on the configured port and accept MCP Streamable HTTP requests at the `/mcp` endpoint

#### Scenario: Default port

- **WHEN** `ALEXANDRIA_PORT` is not set
- **THEN** the server SHALL listen on port 3000

### Requirement: Health check endpoint

The server SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body indicating the server is running.

#### Scenario: Health check response

- **WHEN** `GET /health` is requested
- **THEN** the server SHALL respond with HTTP 200 and `{ "status": "ok" }`

### Requirement: list-apis tool

The server SHALL register an MCP tool named `list-apis` that takes no parameters and returns a markdown-formatted list of all indexed APIs with their names and versions.

#### Scenario: List APIs with indexed data

- **WHEN** `list-apis` is called and the database contains 3 indexed APIs
- **THEN** it SHALL return a markdown list with each API's name and version

#### Scenario: No APIs indexed

- **WHEN** `list-apis` is called and the database is empty
- **THEN** it SHALL return a message indicating no APIs are indexed

### Requirement: search-docs tool

The server SHALL register an MCP tool named `search-docs` that accepts a required `query` string parameter and optional `apiName` and `types` filter parameters. It SHALL embed the query via Voyage AI, run hybrid search, and return results formatted as markdown.

#### Scenario: Search with query only

- **WHEN** `search-docs` is called with `query: "authentication flow"`
- **THEN** it SHALL embed the query, run hybrid search across all APIs, and return matching chunks as markdown with titles, types, and content

#### Scenario: Search with API filter

- **WHEN** `search-docs` is called with `query: "create user"` and `apiName: "users-api"`
- **THEN** it SHALL only return results from the `users-api` API

#### Scenario: Search with type filter

- **WHEN** `search-docs` is called with `query: "payment"` and `types: ["endpoint"]`
- **THEN** it SHALL only return endpoint-type chunks

#### Scenario: No results found

- **WHEN** `search-docs` is called with a query that matches nothing
- **THEN** it SHALL return a message indicating no results were found

### Requirement: get-api-endpoints tool

The server SHALL register an MCP tool named `get-api-endpoints` that accepts a required `apiName` string parameter and returns all endpoint chunks for that API formatted as a markdown list with method, path, and summary.

#### Scenario: List endpoints for existing API

- **WHEN** `get-api-endpoints` is called with `apiName: "payments"`
- **THEN** it SHALL return all endpoint chunks for the payments API as a markdown list showing HTTP method, path, and summary for each

#### Scenario: API not found

- **WHEN** `get-api-endpoints` is called with an `apiName` that doesn't exist in the database
- **THEN** it SHALL return a message indicating the API was not found

### Requirement: Markdown result formatting

All tool results SHALL be formatted as markdown optimized for LLM consumption. Search results SHALL include chunk title, type badge, API name, and content. Endpoint listings SHALL include method, path, and summary.

#### Scenario: Search result format

- **WHEN** search results are returned
- **THEN** each result SHALL be formatted with a heading (chunk title), a type indicator, the API source, and the chunk content as markdown

#### Scenario: Endpoint list format

- **WHEN** endpoint chunks are listed
- **THEN** each endpoint SHALL show its HTTP method (uppercased), path, and summary/description in a scannable format
