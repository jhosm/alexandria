## 1. Test Fixtures

- [x] 1.1 Create `src/ingestion/__tests__/fixtures/sample-openapi.yaml` — a minimal but complete OpenAPI 3.x spec with multiple endpoints, parameters, request/response schemas, and named components (including schemas with 3+ and <3 properties)

## 2. Core Parser

- [x] 2.1 Create `src/ingestion/openapi-parser.ts` with `parseOpenApiSpec(filePath, apiId)` function signature
- [x] 2.2 Implement spec loading and dereferencing via `SwaggerParser.dereference()`
- [x] 2.3 Implement overview chunk generation (title, version, description, servers)
- [x] 2.4 Implement endpoint chunk generation — walk paths, produce one chunk per method+path with parameters, request body, and response schemas as markdown
- [x] 2.5 Implement schema chunk generation — walk `components/schemas`, produce chunks for schemas with 3+ properties
- [x] 2.6 Implement deterministic chunk ID generation (`{apiId}:overview`, `{apiId}:endpoint:{method}:{path}`, `{apiId}:schema:{name}`)
- [x] 2.7 Implement SHA-256 content hashing for each chunk

## 3. Tests

- [x] 3.1 Create `src/ingestion/__tests__/openapi-parser.test.ts`
- [x] 3.2 Test: sample spec produces expected chunk count (1 overview + N endpoints + M schemas)
- [x] 3.3 Test: chunk types are correct (overview, endpoint, schema)
- [x] 3.4 Test: endpoint chunks contain correct metadata (path, method, tags, operationId)
- [x] 3.5 Test: schema chunks only generated for schemas with 3+ properties
- [x] 3.6 Test: content hashes are deterministic (parse twice, compare)
- [x] 3.7 Test: chunk IDs follow expected format
