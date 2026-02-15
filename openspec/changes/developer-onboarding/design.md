## Context

Alexandria has detailed internals documentation in CLAUDE.md (aimed at AI assistants) and a `.env.example`, but no human-facing README or working example. A developer cloning the repo must piece together the setup from scattered sources and can't run a meaningful test without sourcing their own API spec. The ingestion CLI (Phase 3) and MCP server (Phase 4) are not yet implemented, so the onboarding material must be accurate about what works today while pointing forward to what's coming.

## Goals / Non-Goals

**Goals:**
- Give a new developer a clear path from `git clone` to understanding what Alexandria is and how to set it up
- Provide a self-contained example (OpenAPI spec + markdown doc + apis.yml) that can be used once the ingestion pipeline lands
- Document all available npm scripts and environment variables in one place

**Non-Goals:**
- Duplicating CLAUDE.md's architecture details — README links to it for deep dives
- Tutorial-style documentation beyond the quickstart (API reference, advanced configuration)
- Building any new code — this change is docs and static example files only
- Documenting features that don't exist yet as if they work — the README should be honest about current status

## Decisions

### D1: README scope and structure

**Choice**: A single `README.md` with sections: overview, prerequisites, quickstart, usage (with subsections for ingestion and server), npm scripts reference, and project status.

**Alternatives considered**:
- Separate `docs/` directory with multiple guides: Overkill for current project size. A single README is discoverable and sufficient.
- Extending CLAUDE.md: That file serves a different audience (AI assistants). Mixing human onboarding into it would dilute both purposes.

**Rationale**: README.md is the universal entry point. GitHub renders it on the repo page. One file, one audience, easy to maintain.

### D2: Petstore as the example API

**Choice**: Use a minimal Petstore-style OpenAPI spec (~3 endpoints, 2 schemas) and a companion markdown guide.

**Alternatives considered**:
- Real-world API (Stripe, GitHub): Too large, licensing concerns, distracts from the setup flow.
- Completely custom API: More work to create, no name recognition.

**Rationale**: Petstore is the canonical OpenAPI example — developers recognize it instantly. Keeping it minimal (subset of the full Petstore spec) means the example files are readable in full and fast to ingest.

### D3: apis.yml at repository root

**Choice**: Place `apis.yml` at the repo root, pre-configured to reference `examples/petstore-openapi.yml` and `examples/petstore-guide.md`.

**Rationale**: The ingestion CLI (Phase 3) reads `apis.yml` from CWD. Placing it at the root means `npm run ingest -- --all` works out of the box. The example entry serves double duty: it documents the format by example and provides a working first-run experience.

### D4: Honest status section in README

**Choice**: Include a "Project Status" section listing which phases are complete and which are in progress.

**Rationale**: A developer who clones the repo and finds that `npm run ingest` doesn't work yet will be frustrated unless told upfront. Honesty about current state builds trust and sets expectations.

## Risks / Trade-offs

- **README staleness** → As phases land, the README must be updated (e.g., removing "coming soon" from ingestion CLI). Mitigation: Keep status section compact and easy to update. Future change proposals that add features should include a README update task.
- **Example files may not match parser expectations** → If the OpenAPI parser or markdown parser have undocumented assumptions, the examples might not parse cleanly. Mitigation: Validate examples against existing parser tests before finalizing.
