## ADDED Requirements

### Requirement: Project configuration files

The project SHALL have a `package.json` with `type: "module"`, a `tsconfig.json` targeting ES2022 with strict mode, and a `.env.example` documenting required environment variables.

#### Scenario: package.json exists with correct configuration

- **WHEN** the project is initialized
- **THEN** `package.json` SHALL exist with `type: "module"`, project name `alexandria`, and all required dependencies listed

#### Scenario: TypeScript configuration

- **WHEN** the project is initialized
- **THEN** `tsconfig.json` SHALL target ES2022, use ESNext module system with bundler resolution, enable strict mode, and output to `dist/`

#### Scenario: Environment variable documentation

- **WHEN** a developer sets up the project
- **THEN** `.env.example` SHALL document `VOYAGE_API_KEY`, `ALEXANDRIA_DB_PATH`, and `ALEXANDRIA_PORT` with placeholder values

### Requirement: NPM scripts for common operations

The project SHALL provide npm scripts for building, development, testing, and ingestion.

#### Scenario: Available npm scripts

- **WHEN** a developer runs `npm run`
- **THEN** the following scripts SHALL be available: `build` (tsc), `dev:server` (tsx server), `ingest` (tsx ingestion CLI), `test` (vitest run), `test:watch` (vitest)

### Requirement: Project dependencies

The project SHALL include all dependencies needed across all modules: database (`better-sqlite3`, `sqlite-vec`), server (`express`, `@modelcontextprotocol/sdk`), ingestion (`commander`, `@apidevtools/swagger-parser`, `unified`, `remark-parse`, `js-yaml`), and embeddings (Voyage AI via fetch).

#### Scenario: Dependencies install without errors

- **WHEN** a developer runs `npm install`
- **THEN** all dependencies SHALL resolve and install successfully
