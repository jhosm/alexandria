import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Chunk, ChunkType } from '../shared/types.js';

const MAX_CHUNK_SIZE = 3000;

interface MdastNode {
  type: string;
  depth?: number;
  position: { start: { offset: number }; end: { offset: number } };
  children?: Array<{ value?: string; children?: Array<{ value?: string }> }>;
}

interface Section {
  headings: string[];
  contentStart: number;
  contentEnd: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectChunkType(filePath: string): ChunkType {
  const name = basename(filePath).toLowerCase();
  if (name.includes('glossary')) return 'glossary';
  if (name.includes('use-case') || name.includes('use_case')) return 'use-case';
  return 'guide';
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function extractHeadingText(node: { children: Array<{ value?: string; children?: Array<{ value?: string }> }> }): string {
  // Flatten inline children to get heading text
  return node.children.map((child: { value?: string; children?: Array<{ value?: string }> }) => {
    if (child.value) return child.value;
    if (child.children) return child.children.map((c: { value?: string }) => c.value ?? '').join('');
    return '';
  }).join('');
}

function splitAtParagraphBoundaries(content: string): string[] {
  const parts = content.split(/\n\n/);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current ? current + '\n\n' + part : part;
    if (candidate.length > MAX_CHUNK_SIZE && current) {
      chunks.push(current);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  // Hard-split any chunk that still exceeds MAX_CHUNK_SIZE (single giant paragraph)
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= MAX_CHUNK_SIZE) {
      result.push(chunk);
    } else {
      for (let i = 0; i < chunk.length; i += MAX_CHUNK_SIZE) {
        result.push(chunk.slice(i, i + MAX_CHUNK_SIZE));
      }
    }
  }
  return result;
}

export async function parseMarkdownFile(filePath: string, apiId: string): Promise<Chunk[]> {
  let source: string;
  try {
    source = await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read markdown file for "${apiId}" at ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
  const tree = unified().use(remarkParse).parse(source);
  const chunkType = detectChunkType(filePath);
  const filename = basename(filePath, '.md');

  // Walk top-level AST children to build sections split at h2/h3 boundaries
  let h1Title: string | undefined;
  let currentH2: string | undefined;
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  function finalizeSection(endOffset: number): void {
    if (currentSection && endOffset > currentSection.contentStart) {
      currentSection.contentEnd = endOffset;
      sections.push(currentSection);
    }
    currentSection = null;
  }

  for (const node of (tree as { children: MdastNode[] }).children) {
    if (node.type === 'heading') {
      const depth = node.depth!;
      const text = extractHeadingText(node as { children: Array<{ value?: string; children?: Array<{ value?: string }> }> });

      if (depth === 1) {
        h1Title = text;
        // Start a section for h1 body content (intro text before first h2)
        currentSection = {
          headings: [text],
          contentStart: node.position.end.offset,
          contentEnd: node.position.end.offset,
        };
        continue;
      }

      if (depth <= 3) {
        // Finalize previous section at the start of this heading
        finalizeSection(node.position.start.offset);

        if (depth === 2) {
          currentH2 = text;
          currentSection = {
            headings: [...(h1Title ? [h1Title] : []), text],
            contentStart: node.position.end.offset,
            contentEnd: node.position.end.offset,
          };
        } else {
          currentSection = {
            headings: [
              ...(h1Title ? [h1Title] : []),
              ...(currentH2 ? [currentH2] : []),
              text,
            ],
            contentStart: node.position.end.offset,
            contentEnd: node.position.end.offset,
          };
        }
      }
      // h4+ headings: treated as content within the current section (no split)
    }
    // Non-heading nodes extend the current section
  }

  // Finalize last section
  finalizeSection(source.length);

  // Convert sections to chunks
  const chunks: Chunk[] = [];

  for (const section of sections) {
    const content = source.slice(section.contentStart, section.contentEnd).trim();
    if (!content) continue;

    const title = section.headings[section.headings.length - 1];
    const headingPath = section.headings.map(slugify).join('/');
    const baseId = `${apiId}:doc:${filename}:${headingPath}`;

    if (content.length > MAX_CHUNK_SIZE) {
      const parts = splitAtParagraphBoundaries(content);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        chunks.push({
          id: `${baseId}:${i}`,
          apiId,
          type: chunkType,
          title,
          content: part,
          contentHash: hashContent(part),
          metadata: {
            filePath,
            headings: section.headings,
            chunkIndex: i,
          },
        });
      }
    } else {
      chunks.push({
        id: baseId,
        apiId,
        type: chunkType,
        title,
        content,
        contentHash: hashContent(content),
        metadata: {
          filePath,
          headings: section.headings,
        },
      });
    }
  }

  return chunks;
}
