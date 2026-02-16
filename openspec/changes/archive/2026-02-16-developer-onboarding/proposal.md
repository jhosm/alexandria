## Why

Alexandria has no README or getting-started guide. A new developer cloning the repo has to reverse-engineer the setup from CLAUDE.md (written for AI assistants), guess the apis.yml format, and figure out the end-to-end flow from ingestion to search with no working example. This friction kills adoption before the tool proves its value.

## What Changes

- Add a `README.md` with project overview, prerequisites, install steps, and usage examples covering the full lifecycle (configure → ingest → search)
- Add an `examples/` directory with a sample OpenAPI spec and companion markdown doc, so a new developer can run a real ingestion + search cycle without sourcing their own API docs
- Add an example `apis.yml` showing the registry format, pre-configured to point at the bundled example files

## Capabilities

### New Capabilities

- `developer-quickstart`: README with prerequisites (Node 18+, Voyage AI key), setup steps, and a copy-paste walkthrough that takes a new developer from `git clone` to a working search query. Includes example `apis.yml` and bundled sample API docs for a self-contained first run.

### Modified Capabilities

(none)

## Impact

- **Files**: Creates `README.md`, `apis.yml`, `examples/petstore-openapi.yml`, `examples/petstore-guide.md`
- **Dependencies**: None — documentation and static example files only
- **Downstream**: Unblocks anyone trying to evaluate or contribute to Alexandria. The example files also serve as integration test fixtures for the ingestion pipeline once Phase 3 lands.
