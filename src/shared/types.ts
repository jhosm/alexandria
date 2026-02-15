export type ChunkType =
  | 'overview'
  | 'endpoint'
  | 'schema'
  | 'glossary'
  | 'use-case'
  | 'guide';

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
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchOptions {
  apiId?: string;
  types?: ChunkType[];
  limit?: number;
}
