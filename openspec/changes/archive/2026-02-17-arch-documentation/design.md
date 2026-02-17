## Context

Alexandria indexes API documentation (OpenAPI specs + markdown) into SQLite with hybrid search, served via MCP over stdio. The registry (`apis.yml`) currently only supports API entries with a required `spec` field. The MCP server exposes three tools: `list-apis`, `search-docs`, `get-api-endpoints`. We need to support standalone documentation collections alongside APIs, with a dedicated MCP tool and a clearer name for the existing search tool.

## Goals / Non-Goals

**Goals:**
- Add a `docs` section to `apis.yml` for standalone documentation collections
- Ingest docs-only entries through the existing pipeline (markdown parsing, embedding, hybrid search)
- Rename `search-docs` → `search-api-docs` with a description scoped to API documentation
- Add `search-arch-docs` tool with a description that guides agents to use it for architecture contexts

**Non-Goals:**
- Changing the database schema (docs entries use the existing `apis` + `chunks` tables)
- Adding new chunk types (architecture docs produce the same `glossary`/`use-case`/`guide` types)
- Generic "search any doc collection" tool (architecture documentation gets a dedicated tool; other doc collections can be added later following the same pattern)

## Decisions

### D1: Registry `docs` section as a flat list alongside `apis`

**Choice**: Add a top-level `docs` array in `apis.yml` with entries containing `name` and `path`.

```yaml
apis:
  - name: petstore
    spec: ./specs/petstore/openapi.yaml
    docs: ./examples/

docs:
  - name: arch
    path: ./docs/arch
```

**Alternatives considered**:
- Putting docs under `apis` with `spec` made optional: Conflates two different concepts. An API has a spec; a documentation collection doesn't.
- Separate registry file for docs: Adds config sprawl. One registry file is simpler.

**Rationale**: Clean semantic separation in one file. `apis` entries have specs (and optionally docs). `docs` entries have only a path to markdown files. Both get ingested into the same database and search infrastructure.

### D2: Docs entries stored in the same `apis` table

**Choice**: Docs entries are inserted into the `apis` table like API entries, with `specPath` as `null`. The ingestion pipeline skips OpenAPI parsing when there's no spec.

**Alternatives considered**:
- Separate `doc_collections` table: Requires new FK relationships, new query paths, and duplicates infrastructure for no benefit.

**Rationale**: The search layer already works with `apiId` as a generic scope key. A docs entry is just an entry without a spec — the query layer doesn't care.

**Constraint**: Entry names must be unique across both `apis` and `docs` sections. The `apis` table has a `UNIQUE` constraint on `name`, and `apiId` is derived from name alone (`uuidV5(name, namespace)`), so a name collision between sections would produce the same ID and overwrite the existing row. The registry loader validates this at parse time.

### D3: Registry loader returns a unified type with optional `spec`

**Choice**: `loadRegistry` returns both `apis` and `docs` entries as separate arrays from a single `RegistryResult` type. `ApiEntry` keeps `spec` required. A new `DocEntry` type has just `name` and `path`.

```typescript
interface DocEntry { name: string; path: string; }
interface RegistryResult { apis: ApiEntry[]; docs: DocEntry[]; }
```

**Alternatives considered**:
- Making `spec` optional on `ApiEntry` and mixing everything: Loses type safety — callers can't tell if an entry needs OpenAPI parsing without runtime checks.

**Rationale**: Separate types make the two cases explicit. The ingestion CLI processes `apis` entries (spec + optional docs) and `docs` entries (path only) with clear, distinct code paths.

### D4: `search-arch-docs` hardcoded to the "arch" docs entry

**Choice**: The `search-arch-docs` tool internally resolves the "arch" entry by name and scopes all queries to that `apiId`. It accepts `query` and optional `types` parameters (no `apiName` — it's always "arch").

**Alternatives considered**:
- Generic `search-docs-collection` with a `name` parameter: Defeats the purpose. The dedicated tool exists precisely so its description can tell the agent *when* to use it.

**Rationale**: The tool's value is in its description, not its implementation. A rich description like "Search architecture documentation. Use this when you need to understand architecture concepts, write code to expose an API, or write code to consume an API" guides agents to the right tool at the right time. The implementation is just `searchHybrid` with a fixed `apiId`.

### D5: Rename `search-docs` → `search-api-docs`

**Choice**: Rename the tool, file, and function. Update the description to: "Search indexed API documentation — endpoints, schemas, request/response formats, and API behaviour. Use this when you need to find information about a specific API."

**Rationale**: With two search tools, the names and descriptions must clearly partition the search space. `search-api-docs` is for API-specific content; `search-arch-docs` is for architecture content.

### D6: `--all` ingests both `apis` and `docs` sections

**Choice**: `ingest --all` processes all entries from both sections sequentially. The existing `--api` / `--spec` flags continue to work for single API entries.

**Alternatives considered**:
- Separate `--docs` flag: Adds flag complexity for a rare operation. `--all` should mean "everything in the registry."

**Rationale**: Simple and consistent. `--all` already means "process the whole registry." Expanding its scope to include `docs` entries is the natural extension.

## Risks / Trade-offs

- **"arch" entry must exist** → `search-arch-docs` will return an error if "arch" hasn't been ingested. Mitigation: clear error message ("Architecture documentation not indexed. Run ingestion first."). Same pattern as `get-api-endpoints` returning "API not found."
- **Test references to `search-docs`** → Renaming the tool breaks existing server tests. Mitigation: straightforward find-and-replace in test file. Small blast radius.
- **Name collision between sections** → A docs entry with the same name as an API entry would produce the same `apiId` (UUID derived from name) and collide in the `apis` table. Mitigation: registry loader validates name uniqueness across both sections at parse time.
- **No CLI flag for single doc entry** → There's no `--doc <name>` equivalent of `--api <name>`. Mitigation: not needed for MVP. If needed later, it's a simple addition.
