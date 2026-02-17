export const CHUNK_TYPES = [
  'overview',
  'endpoint',
  'schema',
  'glossary',
  'use-case',
  'guide',
] as const;

export type ChunkType = (typeof CHUNK_TYPES)[number];

export interface Chunk {
  id: string;
  apiId: string;
  type: ChunkType;
  title: string;
  content: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

export interface Api {
  id: string;
  name: string;
  version?: string;
  specPath?: string;
  docsPath?: string;
  sourceHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchOptions {
  apiId?: string;
  apiIds?: string[];
  types?: ChunkType[];
  limit?: number;
}
