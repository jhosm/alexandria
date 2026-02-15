## Why

API documentation includes more than just endpoints — glossaries, use cases, and guides provide essential context that helps LLMs give complete answers. We need a markdown parser that splits these docs into well-structured chunks with heading hierarchy preserved, complementing the OpenAPI endpoint chunks.

## What Changes

- AST-based markdown splitting by headings (h2/h3) with heading hierarchy preservation
- Automatic chunk type detection based on file name and content: `glossary`, `use-case`, or `guide`
- Paragraph-boundary splitting for oversized sections (chunks exceeding a configurable max size)
- Content hashing and deterministic chunk IDs for incremental re-indexing

## Capabilities

### New Capabilities

- `markdown-chunking`: Parses markdown files into typed `Chunk[]` with heading hierarchy, auto-detected chunk types (glossary, use-case, guide), paragraph-boundary splitting for large sections, and content hashes

### Modified Capabilities

(none)

## Impact

- **Code**: Creates `src/ingestion/markdown-parser.ts` and test files with fixtures
- **Dependencies**: Uses `unified`, `remark-parse`, `mdast-util-to-string`, `unist-util-visit` (already in package.json)
- **Types**: Imports `Chunk` and `ChunkType` from `src/shared/types.ts`
- **Downstream**: Used by ingestion-cli (Change 5) to process documentation directories
