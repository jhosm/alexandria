## 1. Registry

- [x] 1.1 Create `apis.yml` example registry with 1-2 sample API entries (name, spec, docs fields)
- [x] 1.2 Implement `apis.yml` parser — read YAML, validate structure, resolve relative paths

## 2. Ingestion Pipeline

- [x] 2.1 Create `src/ingestion/index.ts` with Commander CLI setup (`--api`, `--spec`, `--docs`, `--all` options)
- [x] 2.2 Implement single API ingestion flow: parse spec → parse docs → collect all chunks
- [x] 2.3 Implement incremental re-indexing: for each chunk, compare contentHash with existing DB chunk, skip if unchanged
- [x] 2.4 Implement batch embedding of new/changed chunks via `embedDocuments`
- [x] 2.5 Implement transactional upsert of embedded chunks to DB (chunks + FTS + vec)
- [x] 2.6 Implement orphan cleanup: after processing, delete DB chunks not in current parse results
- [x] 2.7 Implement API registry upsert — write/update apis table entry for each processed API

## 3. Batch Mode

- [x] 3.1 Implement `--all` mode: read apis.yml, process each API sequentially through the pipeline
- [x] 3.2 Implement error handling: if one API fails, log error and continue with remaining APIs

## 4. Console Output

- [x] 4.1 Print progress during ingestion: which API, chunk counts (total, embedded, skipped, deleted)
- [x] 4.2 Print summary after all APIs processed

## 5. Verification

- [x] 5.1 Index a sample API spec + docs dir, confirm chunks in DB
- [x] 5.2 Re-run ingestion, confirm no re-embedding of unchanged chunks
- [x] 5.3 Remove a source endpoint, re-run, confirm orphan cleanup
