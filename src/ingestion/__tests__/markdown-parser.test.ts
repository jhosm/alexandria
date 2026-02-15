import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, unlink } from 'node:fs/promises';
import { parseMarkdownFile } from '../markdown-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');
const glossaryPath = resolve(fixturesDir, 'sample-glossary.md');
const useCasesPath = resolve(fixturesDir, 'sample-use-cases.md');
const apiId = 'test-api';

describe('parseMarkdownFile', () => {
  it('glossary.md produces chunks with type glossary', async () => {
    const chunks = await parseMarkdownFile(glossaryPath, apiId);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.type).toBe('glossary');
    }
  });

  it('use-cases.md produces chunks with type use-case', async () => {
    const chunks = await parseMarkdownFile(useCasesPath, apiId);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.type).toBe('use-case');
    }
  });

  it('heading hierarchy is preserved in chunk titles', async () => {
    const chunks = await parseMarkdownFile(useCasesPath, apiId);
    // h3 "Creating a Payment Intent" is under h2 "Processing a Payment"
    const subChunk = chunks.find(
      (c) => c.title === 'Creating a Payment Intent',
    );
    expect(subChunk).toBeDefined();
    const headings = subChunk!.metadata!.headings as string[];
    expect(headings).toEqual([
      'Payment Integration Use Cases',
      'Processing a Payment',
      'Creating a Payment Intent',
    ]);
  });

  it('large sections are split at paragraph boundaries', async () => {
    const chunks = await parseMarkdownFile(useCasesPath, apiId);
    // The "Implementing Refunds" h2 section body exceeds 3000 chars and should be split
    const refundChunks = chunks.filter(
      (c) =>
        c.title === 'Implementing Refunds' &&
        c.metadata?.chunkIndex !== undefined,
    );
    expect(refundChunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of refundChunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(3000);
    }
  });

  it('content hashes are deterministic', async () => {
    const first = await parseMarkdownFile(glossaryPath, apiId);
    const second = await parseMarkdownFile(glossaryPath, apiId);
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].contentHash).toBe(second[i].contentHash);
    }
  });

  it('chunk metadata contains filePath, headings, and chunkIndex for split chunks', async () => {
    const chunks = await parseMarkdownFile(useCasesPath, apiId);

    // All chunks should have filePath and headings
    for (const chunk of chunks) {
      expect(chunk.metadata).toBeDefined();
      expect(chunk.metadata!.filePath).toBe(useCasesPath);
      expect(Array.isArray(chunk.metadata!.headings)).toBe(true);
      expect((chunk.metadata!.headings as string[]).length).toBeGreaterThan(0);
    }

    // Split chunks should have chunkIndex
    const splitChunks = chunks.filter(
      (c) => c.metadata?.chunkIndex !== undefined,
    );
    expect(splitChunks.length).toBeGreaterThan(0);
    for (const chunk of splitChunks) {
      expect(typeof chunk.metadata!.chunkIndex).toBe('number');
    }

    // Non-split chunks should not have chunkIndex
    const normalChunks = chunks.filter(
      (c) => c.metadata?.chunkIndex === undefined,
    );
    expect(normalChunks.length).toBeGreaterThan(0);
  });

  it('captures h1 body content as a chunk', async () => {
    const chunks = await parseMarkdownFile(glossaryPath, apiId);
    const introChunk = chunks.find((c) => c.title === 'Payments API Glossary');
    expect(introChunk).toBeDefined();
    expect(introChunk!.content).toContain('Common terms and definitions');
  });

  it('preserves content after h4 headings within parent section', async () => {
    const tmpPath = resolve(fixturesDir, 'h4-temp-guide.md');
    await writeFile(
      tmpPath,
      [
        '# Guide',
        '',
        '## Section One',
        '',
        'Intro paragraph.',
        '',
        '#### Sub-detail',
        '',
        'This should not be lost.',
        '',
      ].join('\n'),
    );
    try {
      const chunks = await parseMarkdownFile(tmpPath, apiId);
      const section = chunks.find((c) => c.title === 'Section One');
      expect(section).toBeDefined();
      expect(section!.content).toContain('Sub-detail');
      expect(section!.content).toContain('This should not be lost.');
    } finally {
      await unlink(tmpPath);
    }
  });

  it('throws with context when file does not exist', async () => {
    await expect(
      parseMarkdownFile('/nonexistent.md', 'test-api'),
    ).rejects.toThrow(
      'Failed to read markdown file for "test-api" at /nonexistent.md',
    );
  });

  it('chunk IDs follow the expected format', async () => {
    const chunks = await parseMarkdownFile(glossaryPath, apiId);
    // Non-split chunk: {apiId}:doc:{filename}:{heading-path}
    const apiKeyChunk = chunks.find((c) => c.title === 'API Key');
    expect(apiKeyChunk).toBeDefined();
    expect(apiKeyChunk!.id).toBe(
      'test-api:doc:sample-glossary:payments-api-glossary/api-key',
    );

    // Split chunks: {apiId}:doc:{filename}:{heading-path}:{chunkIndex}
    const useCaseChunks = await parseMarkdownFile(useCasesPath, apiId);
    const splitChunks = useCaseChunks.filter(
      (c) => c.metadata?.chunkIndex !== undefined,
    );
    for (const chunk of splitChunks) {
      const idx = chunk.metadata!.chunkIndex as number;
      expect(chunk.id).toMatch(new RegExp(`:${idx}$`));
    }
  });
});
