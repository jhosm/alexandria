## 1. Test Fixtures

- [ ] 1.1 Create `src/ingestion/__tests__/fixtures/sample-glossary.md` — a glossary markdown file with h2 sections defining API terms
- [ ] 1.2 Create `src/ingestion/__tests__/fixtures/sample-use-cases.md` — a use-case markdown file with h2/h3 sections describing workflows, including one large section for split testing

## 2. Core Parser

- [ ] 2.1 Create `src/ingestion/markdown-parser.ts` with `parseMarkdownFile(filePath, apiId)` function signature
- [ ] 2.2 Implement AST parsing via unified + remark-parse
- [ ] 2.3 Implement heading-based splitting at h2/h3 boundaries with hierarchy preservation
- [ ] 2.4 Implement auto-detection of chunk type from filename (glossary, use-case, guide)
- [ ] 2.5 Implement paragraph-boundary splitting for sections exceeding max character count (default 3000)
- [ ] 2.6 Implement deterministic chunk ID generation (`{apiId}:doc:{filename}:{heading-path}`)
- [ ] 2.7 Implement SHA-256 content hashing

## 3. Tests

- [ ] 3.1 Create `src/ingestion/__tests__/markdown-parser.test.ts`
- [ ] 3.2 Test: glossary.md produces chunks with type `glossary`
- [ ] 3.3 Test: use-cases.md produces chunks with type `use-case`
- [ ] 3.4 Test: heading hierarchy is preserved in chunk titles
- [ ] 3.5 Test: large sections are split at paragraph boundaries
- [ ] 3.6 Test: content hashes are deterministic (parse twice, compare)
- [ ] 3.7 Test: chunk metadata contains filePath, headings, and chunkIndex
