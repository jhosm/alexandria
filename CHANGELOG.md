# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-02-17

### Added

- **Project foundation**: SQLite schema (WAL mode), shared types, hybrid search with RRF (k=60)
- **OpenAPI parser**: OpenAPI 3.x specs to overview, endpoint, and schema chunks
- **Markdown parser**: Markdown files to glossary, use-case, and guide chunks (AST-based, heading split)
- **Voyage AI embedder**: Voyage AI provider (voyage-3-lite, 1024d, 128/batch)
- **Ingestion CLI**: `ingest --api` and `ingest --all` with incremental re-indexing, content hashing, and orphan cleanup
- **Pluggable embedding providers**: Voyage AI, Ollama, and Transformers.js with configurable models (BGE-large 1024d default)
- **MCP server**: Stdio transport serving `list-apis`, `search-api-docs`, `search-arch-docs`, and `get-api-endpoints` tools
- **Architecture documentation support**: `docs` section in `apis.yml` for indexing standalone documentation collections (markdown only, no OpenAPI spec required)
- **`.mcpb` bundle packaging**: One-click installation for Claude Desktop
- **Developer onboarding**: README, quickstart guide, examples, MCP client configuration docs
- **`--registry` flag**: Custom registry file path via CLI flag or `ALEXANDRIA_REGISTRY_PATH` env var
- **`ALEXANDRIA_DB_PATH`**: Configurable database path for separating org data from the codebase
- **CI workflow**: ESLint, Prettier, pre-commit hooks mirroring CI checks
