## Context

Alexandria indexes supplementary markdown documentation alongside OpenAPI specs. These files include glossaries (term definitions), use-case documents (workflow descriptions), and general guides. The parser converts them into chunks that can be embedded and searched alongside endpoint chunks.

## Goals / Non-Goals

**Goals:**
- Parse markdown files into chunks split at h2/h3 boundaries
- Preserve heading hierarchy in chunk titles (e.g., "Authentication > OAuth Flow")
- Auto-detect chunk type from filename patterns and content
- Split oversized sections at paragraph boundaries
- Produce deterministic IDs and content hashes

**Non-Goals:**
- Parsing non-markdown formats (HTML, RST, etc.)
- Rendering markdown to HTML — chunks store raw markdown
- Handling frontmatter/YAML headers in markdown files
- Cross-file linking or reference resolution

## Decisions

### D1: AST-based splitting via unified/remark

**Choice**: Parse markdown into MDAST (Markdown Abstract Syntax Tree) using `unified` + `remark-parse`, then walk the tree to split at heading boundaries.

**Alternatives considered**:
- Regex-based splitting on `##` lines: Fragile — breaks on headings inside code blocks, doesn't handle nesting.
- Line-by-line streaming: Harder to reason about heading hierarchy.

**Rationale**: AST-based parsing correctly handles all edge cases (code blocks, nested content) and gives structured access to heading levels and text content.

### D2: Split at h2/h3, not h1

**Choice**: Use h2 and h3 as chunk boundaries. H1 is treated as the document title (part of heading hierarchy) but doesn't create a split.

**Rationale**: Most markdown docs have a single h1 (document title) with h2/h3 sections as the meaningful content divisions. Splitting at h1 would produce a single oversized chunk for the whole document.

### D3: Auto-detect chunk type from filename

**Choice**: Detect chunk type by matching filename patterns:
- Files containing "glossary" → `glossary` type
- Files containing "use-case" or "use_case" → `use-case` type
- Everything else → `guide` type

**Alternatives considered**:
- Require explicit type in frontmatter: Extra burden on documentation authors.
- Content analysis (NLP): Overcomplicated for MVP.

**Rationale**: Filename conventions are simple, reliable, and require zero configuration. The ingestion CLI can also override types if needed.

### D4: Paragraph-boundary splitting for oversized chunks

**Choice**: If a section's content exceeds a configurable max character count (default 3000), split at the nearest paragraph boundary (double newline).

**Rationale**: Keeps chunks within embedding model token limits while preserving readable boundaries. Paragraph splits are natural content boundaries.

## Risks / Trade-offs

- **Type detection accuracy** → Filename-based detection may misclassify files. Mitigation: `guide` is a safe default, and the ingestion CLI can override.
- **Heading hierarchy depth** → Deeply nested headings (h4+) are included in content but don't create splits. Mitigation: Most API docs don't go beyond h3.
