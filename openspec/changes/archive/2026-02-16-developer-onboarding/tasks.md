## 1. Example Files

- [x] 1.1 Create `examples/petstore-openapi.yml` — minimal OpenAPI 3.x spec with info block, 3 endpoints (list pets, get pet, create pet), and 2 schemas (Pet, Error)
- [x] 1.2 Create `examples/petstore-guide.md` — companion markdown guide with at least 3 headed sections (e.g., Overview, Authentication, Quick Start)
- [x] 1.3 Validate example spec parses correctly with existing OpenAPI parser tests
- [x] 1.4 Validate example markdown parses correctly with existing markdown parser tests

## 2. API Registry

- [x] 2.1 Create `apis.yml` at repo root with a `petstore` entry pointing to `examples/petstore-openapi.yml` and `examples/petstore-guide.md`

## 3. README

- [x] 3.1 Create `README.md` with project overview paragraph and tech stack summary
- [x] 3.2 Add prerequisites section (Node 18+, Voyage AI API key with signup link, npm)
- [x] 3.3 Add quickstart section with copy-paste setup commands (clone, install, env config)
- [x] 3.4 Add usage section covering ingestion (`npm run ingest`) and server (`npm run dev:server`)
- [x] 3.5 Add npm scripts reference table (build, dev, dev:server, ingest, lint, format, test)
- [x] 3.6 Add project status section listing phase completion (honest about what works today)

## 4. Verification

- [x] 4.1 Confirm `apis.yml` is valid YAML and its paths resolve to existing files
- [x] 4.2 Follow the README quickstart steps on a clean checkout to verify accuracy
