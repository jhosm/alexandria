import { describe, it, expect } from 'vitest';
import {
  formatApiList,
  formatSearchResults,
  formatEndpointList,
} from '../format.js';
import type { Api, Chunk, SearchResult } from '../../shared/types.js';

function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    id: 'chunk-1',
    apiId: 'api-1',
    type: 'endpoint',
    title: 'GET /pets - List all pets',
    content: 'Returns a list of pets.',
    contentHash: 'abc123',
    ...overrides,
  };
}

describe('formatApiList', () => {
  it('returns empty-state message when no APIs', () => {
    expect(formatApiList([])).toBe('No APIs indexed yet.');
  });

  it('formats single API with version', () => {
    const apis: Api[] = [{ id: '1', name: 'petstore', version: '1.0.0' }];
    const result = formatApiList(apis);
    expect(result).toContain('## Indexed APIs');
    expect(result).toContain('- **petstore** (v1.0.0)');
  });

  it('formats API without version', () => {
    const apis: Api[] = [{ id: '1', name: 'payments' }];
    const result = formatApiList(apis);
    expect(result).toContain('- **payments**');
    expect(result).not.toContain('(v');
  });

  it('formats multiple APIs', () => {
    const apis: Api[] = [
      { id: '1', name: 'alpha', version: '2.0' },
      { id: '2', name: 'beta' },
    ];
    const result = formatApiList(apis);
    expect(result).toContain('- **alpha** (v2.0)');
    expect(result).toContain('- **beta**');
  });
});

describe('formatSearchResults', () => {
  it('returns empty-state message when no results', () => {
    expect(formatSearchResults([], new Map())).toBe(
      'No results found for your query.',
    );
  });

  it('formats result with title, type badge, API name, and content', () => {
    const results: SearchResult[] = [
      {
        chunk: makeChunk({ apiId: 'api-1', type: 'endpoint' }),
        score: 0.5,
      },
    ];
    const apiNames = new Map([['api-1', 'petstore']]);
    const result = formatSearchResults(results, apiNames);

    expect(result).toContain('## Search Results');
    expect(result).toContain('### GET /pets - List all pets');
    expect(result).toContain('`endpoint`');
    expect(result).toContain('petstore');
    expect(result).toContain('Returns a list of pets.');
  });

  it('falls back to apiId when name not in map', () => {
    const results: SearchResult[] = [
      { chunk: makeChunk({ apiId: 'unknown-id' }), score: 0.3 },
    ];
    const result = formatSearchResults(results, new Map());
    expect(result).toContain('unknown-id');
  });

  it('separates multiple results with horizontal rules', () => {
    const results: SearchResult[] = [
      { chunk: makeChunk({ id: '1', title: 'First' }), score: 0.5 },
      { chunk: makeChunk({ id: '2', title: 'Second' }), score: 0.4 },
    ];
    const result = formatSearchResults(results, new Map());
    expect(result).toContain('---');
    expect(result).toContain('### First');
    expect(result).toContain('### Second');
  });
});

describe('formatEndpointList', () => {
  it('returns empty-state message when no endpoints', () => {
    expect(formatEndpointList('petstore', [])).toBe(
      'No endpoints found for "petstore".',
    );
  });

  it('formats endpoint with method, path, and summary', () => {
    const endpoints = [
      makeChunk({
        title: 'GET /pets - List all pets',
        metadata: { method: 'get', path: '/pets' },
      }),
    ];
    const result = formatEndpointList('petstore', endpoints);

    expect(result).toContain('## petstore Endpoints');
    expect(result).toContain('- **GET** `/pets`');
    expect(result).toContain('GET /pets - List all pets');
  });

  it('uppercases the HTTP method', () => {
    const endpoints = [
      makeChunk({ metadata: { method: 'post', path: '/users' } }),
    ];
    const result = formatEndpointList('api', endpoints);
    expect(result).toContain('**POST**');
  });

  it('falls back to title-only when metadata missing', () => {
    const endpoints = [makeChunk({ title: 'Some endpoint' })];
    const result = formatEndpointList('api', endpoints);
    expect(result).toContain('- Some endpoint');
    expect(result).not.toContain('**');
  });

  it('formats multiple endpoints', () => {
    const endpoints = [
      makeChunk({
        id: '1',
        title: 'GET /pets',
        metadata: { method: 'get', path: '/pets' },
      }),
      makeChunk({
        id: '2',
        title: 'POST /pets',
        metadata: { method: 'post', path: '/pets' },
      }),
    ];
    const result = formatEndpointList('petstore', endpoints);
    expect(result).toContain('**GET** `/pets`');
    expect(result).toContain('**POST** `/pets`');
  });
});
