## Context

Alexandria needs to convert OpenAPI 3.x specifications into searchable document chunks. The parser takes a file path, dereferences all `$ref` pointers, then walks the resolved spec to produce typed chunks. This is one of three parsers (alongside markdown and embedder) that feed the ingestion pipeline.

## Goals / Non-Goals

**Goals:**
- Parse any valid OpenAPI 3.x spec into overview, endpoint, and schema chunks
- Produce self-contained markdown content per chunk (no cross-references needed)
- Generate stable content hashes for incremental re-indexing
- Attach rich metadata (path, method, tags, operationId) for filtering

**Non-Goals:**
- Supporting OpenAPI 2.x (Swagger) — out of scope for MVP
- Validating spec correctness — we assume input specs are valid
- Handling circular `$ref` beyond what swagger-parser provides
- Embedding generation — handled by the voyage-embedder change

## Decisions

### D1: Use @apidevtools/swagger-parser for dereferencing

**Choice**: Use `SwaggerParser.dereference()` to resolve all `$ref` pointers before walking the spec.

**Alternatives considered**:
- Manual `$ref` resolution: Complex, error-prone, reinvents the wheel.
- `SwaggerParser.bundle()`: Keeps some `$ref`s intact, making walking harder.

**Rationale**: `dereference()` gives us a fully-resolved spec tree we can walk without worrying about references. Well-maintained library with good OpenAPI 3.x support.

### D2: One chunk per endpoint (method + path)

**Choice**: Each path+method combination (e.g., `GET /users/{id}`) becomes one endpoint chunk containing parameters, request body, and response schemas rendered as markdown.

**Alternatives considered**:
- One chunk per path (grouping all methods): Produces overly large chunks for paths with many methods.
- Separate chunks for parameters, request, response: Too granular — loses the natural "one endpoint" mental model.

**Rationale**: One endpoint = one chunk maps to how developers think about APIs. Self-contained chunks provide full context for each endpoint.

### D3: Schema chunks only for components with 3+ properties

**Choice**: Named schemas under `components/schemas` with 3 or more properties get their own chunk. Smaller schemas are already inlined in endpoint chunks via dereferencing.

**Rationale**: Avoids polluting search results with trivial types (e.g., `Error { message: string }`). Larger schemas are genuinely useful to surface independently.

### D4: Content hashing via SHA-256 of rendered content

**Choice**: Hash the final rendered markdown content of each chunk.

**Rationale**: Content-based hashing means if the spec changes but a chunk's rendered output is identical, it won't be re-embedded. Simple and reliable.

## Risks / Trade-offs

- **Very large specs** → Specs with hundreds of endpoints will produce hundreds of chunks. Mitigation: This is fine — the database and search layer handle it. Chunk count is bounded by spec size.
- **Schema rendering fidelity** → Rendering JSON Schema as markdown loses some nuance (e.g., `oneOf`, complex `allOf`). Mitigation: For MVP, rendering property names, types, and descriptions is sufficient. LLMs can interpret the markdown.
