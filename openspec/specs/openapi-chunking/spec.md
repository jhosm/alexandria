## ADDED Requirements

### Requirement: Parse OpenAPI spec into chunks

The system SHALL provide a `parseOpenApiSpec(filePath: string, apiId: string)` function that reads an OpenAPI 3.x spec file, dereferences all `$ref` pointers, and returns a `Chunk[]` array containing overview, endpoint, and schema chunks.

#### Scenario: Parse a valid OpenAPI 3.x spec

- **WHEN** `parseOpenApiSpec` is called with a valid OpenAPI 3.x YAML or JSON file
- **THEN** it SHALL return an array of Chunk objects with types `overview`, `endpoint`, and `schema`

#### Scenario: Invalid file path

- **WHEN** `parseOpenApiSpec` is called with a non-existent file path
- **THEN** it SHALL throw an error

### Requirement: Overview chunk generation

The parser SHALL produce exactly one `overview` chunk per spec containing the API title, version, description, and server URLs rendered as markdown.

#### Scenario: Overview chunk content

- **WHEN** a spec has title "Pet Store", version "1.0.0", description "A pet store API", and servers `["https://api.example.com"]`
- **THEN** the overview chunk SHALL have type `overview`, a title matching the API title, and content containing the version, description, and server URLs

#### Scenario: Overview chunk metadata

- **WHEN** an overview chunk is generated
- **THEN** its metadata SHALL include `version` and `servers` fields

### Requirement: Endpoint chunk generation

The parser SHALL produce one `endpoint` chunk per path+method combination. Each chunk SHALL contain the method, path, summary/description, parameters (path, query, header), request body schema, and response schemas rendered as self-contained markdown.

#### Scenario: Endpoint chunk for GET /pets/{petId}

- **WHEN** the spec defines `GET /pets/{petId}` with a path parameter `petId`, query parameter `fields`, and a 200 response with a Pet schema
- **THEN** an endpoint chunk SHALL be produced with type `endpoint`, title containing `GET /pets/{petId}`, and content including the parameters and response schema

#### Scenario: Endpoint chunk metadata

- **WHEN** an endpoint chunk is generated for `POST /pets` with tags `["pets"]` and operationId `createPet`
- **THEN** its metadata SHALL include `method: "post"`, `path: "/pets"`, `tags: ["pets"]`, and `operationId: "createPet"`

#### Scenario: All HTTP methods are captured

- **WHEN** a path defines multiple methods (GET, POST, PUT, DELETE, PATCH)
- **THEN** each method SHALL produce a separate endpoint chunk

### Requirement: Schema chunk generation

The parser SHALL produce one `schema` chunk for each named schema under `components/schemas` that has 3 or more properties. Schemas with fewer than 3 properties SHALL be skipped.

#### Scenario: Large schema produces a chunk

- **WHEN** `components/schemas/Pet` has properties `id`, `name`, `tag`, `status` (4 properties)
- **THEN** a schema chunk SHALL be produced with type `schema`, title containing "Pet", and content listing the properties with their types

#### Scenario: Small schema is skipped

- **WHEN** `components/schemas/Error` has properties `code`, `message` (2 properties)
- **THEN** no schema chunk SHALL be produced for Error

#### Scenario: Schema chunk metadata

- **WHEN** a schema chunk is generated for `Pet`
- **THEN** its metadata SHALL include `schemaName: "Pet"`

### Requirement: Content hashing

Each chunk SHALL have a `contentHash` field containing the SHA-256 hex digest of its rendered `content` string. This enables incremental re-indexing by comparing hashes.

#### Scenario: Deterministic hashing

- **WHEN** the same spec is parsed twice without changes
- **THEN** all chunks SHALL have identical `contentHash` values

#### Scenario: Changed content produces different hash

- **WHEN** a spec endpoint description changes
- **THEN** the affected chunk's `contentHash` SHALL differ from the previous parse

### Requirement: Chunk ID generation

Each chunk SHALL have a deterministic `id` derived from the apiId and the chunk's identity (e.g., `{apiId}:overview`, `{apiId}:endpoint:get:/pets/{petId}`, `{apiId}:schema:Pet`). This ensures idempotent upserts.

#### Scenario: Endpoint chunk ID format

- **WHEN** an endpoint chunk is generated for `GET /pets` in API `petstore`
- **THEN** its id SHALL be `petstore:endpoint:get:/pets`

#### Scenario: Schema chunk ID format

- **WHEN** a schema chunk is generated for `Pet` in API `petstore`
- **THEN** its id SHALL be `petstore:schema:Pet`
