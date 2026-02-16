## Requirements

### Requirement: Project README

The project SHALL have a `README.md` at the repository root with a project overview, tech stack summary, prerequisites, setup instructions, usage examples, and available npm scripts.

#### Scenario: README exists with project overview

- **WHEN** a developer opens the repository
- **THEN** `README.md` SHALL contain a one-paragraph description of what Alexandria does (API documentation search engine, hybrid search, MCP serving)

#### Scenario: README lists prerequisites

- **WHEN** a developer reads the prerequisites section
- **THEN** it SHALL list Node.js 18+, a Voyage AI API key (with link to obtain one), and npm as required

#### Scenario: README provides setup steps

- **WHEN** a developer follows the setup section
- **THEN** it SHALL provide copy-paste commands for: cloning the repo, running `npm install`, copying `.env.example` to `.env`, and setting the `VOYAGE_API_KEY`

#### Scenario: README documents usage lifecycle

- **WHEN** a developer reads the usage section
- **THEN** it SHALL walk through the full lifecycle: indexing docs with `npm run ingest`, starting the server with `npm run dev:server`, and querying via MCP

#### Scenario: README lists npm scripts

- **WHEN** a developer looks for available commands
- **THEN** the README SHALL include a table or list of npm scripts (`build`, `dev`, `dev:server`, `ingest`, `lint`, `format`, `test`) with brief descriptions

### Requirement: Example API registry

The project SHALL include an `apis.yml` at the repository root, pre-configured to reference bundled example files, showing the registry format by example.

#### Scenario: apis.yml references example files

- **WHEN** a developer inspects `apis.yml`
- **THEN** it SHALL contain at least one entry with `name`, `spec`, and `docs` fields pointing to files under `examples/`

#### Scenario: apis.yml is valid YAML

- **WHEN** `apis.yml` is parsed
- **THEN** it SHALL be a valid YAML file with a top-level `apis` array where each entry has a string `name`, a string `spec` path, and a string `docs` path

### Requirement: Bundled example OpenAPI spec

The project SHALL include a small, self-contained OpenAPI 3.x spec at `examples/petstore-openapi.yml` that exercises the parser's key paths: info/overview, multiple endpoints, and at least one schema definition.

#### Scenario: Example spec is valid OpenAPI 3.x

- **WHEN** the example spec is parsed by the OpenAPI parser
- **THEN** it SHALL parse without errors and produce overview, endpoint, and schema chunks

#### Scenario: Example spec is minimal but representative

- **WHEN** a developer reads the example spec
- **THEN** it SHALL contain at most 3 endpoints and 2 schemas, keeping it small enough to read in full while covering the main chunk types

### Requirement: Bundled example markdown doc

The project SHALL include a companion markdown guide at `examples/petstore-guide.md` that exercises the markdown parser's heading-based splitting.

#### Scenario: Example markdown produces multiple chunks

- **WHEN** the example markdown is parsed by the markdown parser
- **THEN** it SHALL produce at least 2 chunks from distinct heading sections

#### Scenario: Example markdown complements the spec

- **WHEN** a developer reads the example markdown
- **THEN** its content SHALL relate to the example OpenAPI spec (e.g., a getting-started guide for the Petstore API), showing how spec + docs work together
