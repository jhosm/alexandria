## 1. Registry: `docs` section support

- [x] 1.1 Add `DocEntry` interface (`name: string`, `path: string`) and `RegistryResult` interface (`apis: ApiEntry[]`, `docs: DocEntry[]`) to `src/ingestion/registry.ts`
- [x] 1.2 Change `loadRegistry` return type from `ApiEntry[]` to `RegistryResult`; parse top-level `docs` array with validation (name required, path required, resolve path relative to registry file); validate name uniqueness across both `apis` and `docs` sections (throw on duplicates); return empty arrays when either section is absent
- [x] 1.3 Update registry tests: add cases for docs-only registry, mixed registry, missing name/path in doc entry, path resolution for doc entries, duplicate name across sections, duplicate name within docs section; update existing tests for new return type shape (`result.apis` instead of `result`)
- [x] 1.4 Add "arch" entry to `apis.yml` under a `docs` section

## 2. Ingestion: docs-only entries

- [x] 2.1 Extract a `ingestDocs(name: string, docsPath: string)` function in `src/ingestion/index.ts` — same logic as `ingestApi` but without `parseOpenApiSpec` call; upserts into `apis` table with `specPath: undefined`
- [x] 2.2 Update `runCli` to process `docs` entries from `RegistryResult` after `apis` entries when `--all` is used; include docs entries in summary counts
- [x] 2.3 Update ingest tests: add case for docs-only ingestion (no spec), verify `--all` processes both sections

## 3. Rename `search-docs` → `search-api-docs`

- [x] 3.1 Rename `src/server/tools/search-docs.ts` → `src/server/tools/search-api-docs.ts`; rename function `registerSearchDocs` → `registerSearchApiDocs`; update tool name to `search-api-docs`; update title to "Search API Documentation"; update description to "Search indexed API documentation — endpoints, schemas, request/response formats, and API behaviour. Use this when you need to find information about a specific API."
- [x] 3.2 Update `src/server/index.ts` import to use new file and function name
- [x] 3.3 Update `src/server/__tests__/server.test.ts`: import rename, tool name references in assertions (`search-docs` → `search-api-docs`)

## 4. New tool: `search-arch-docs`

- [x] 4.1 Create `src/server/tools/search-arch-docs.ts` with `registerSearchArchDocs(server, db)` — tool name `search-arch-docs`, description "Search architecture documentation. Use this when you need to understand architecture concepts, write code to expose an API, or write code to consume an API."; accepts `query` (required) and `types` (optional); resolves "arch" entry by name, returns error if not found; delegates to `searchHybrid` with fixed `apiId`
- [x] 4.2 Register the tool in `src/server/index.ts`
- [x] 4.3 Add test in `src/server/__tests__/server.test.ts`: seed an "arch" entry with doc chunks, call `search-arch-docs`, verify results scoped to arch; verify error when arch not indexed

## 5. Verification

- [x] 5.1 Run full test suite — all existing tests pass with renames, new tests pass
- [x] 5.2 Run lint + typecheck
- [x] 5.3 Update CLAUDE.md if needed (registry format example, new tool in architecture section)
