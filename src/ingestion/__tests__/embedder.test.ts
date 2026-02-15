import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { embedDocuments, embedQuery } from '../embedder.js';

function makeResponse(embeddings: number[][]): Response {
  return new Response(
    JSON.stringify({
      data: embeddings.map(e => ({ embedding: e })),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('embedder', () => {
  beforeEach(() => {
    process.env.VOYAGE_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.VOYAGE_API_KEY;
    vi.restoreAllMocks();
  });

  it('embedDocuments sends input_type "document" and returns vectors', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeResponse([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
    );
    vi.stubGlobal('fetch', mockFetch);

    const results = await embedDocuments(['hello', 'world']);

    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input).toEqual(['hello', 'world']);
    expect(body.input_type).toBe('document');
    expect(body.model).toBe('voyage-3-lite');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(new Float32Array([0.1, 0.2, 0.3]));
    expect(results[1]).toEqual(new Float32Array([0.4, 0.5, 0.6]));
  });

  it('embedQuery sends input_type "query" and returns a single vector', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeResponse([[0.7, 0.8, 0.9]]),
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await embedQuery('search term');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input).toEqual(['search term']);
    expect(body.input_type).toBe('query');

    expect(result).toEqual(new Float32Array([0.7, 0.8, 0.9]));
  });

  it('splits inputs into batches of 128', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeResponse(Array.from({ length: 128 }, () => [0.1])))
      .mockResolvedValueOnce(makeResponse(Array.from({ length: 72 }, () => [0.2])));
    vi.stubGlobal('fetch', mockFetch);

    const texts = Array.from({ length: 200 }, (_, i) => `text-${i}`);
    const results = await embedDocuments(texts);

    expect(mockFetch.mock.calls.length).toBe(2);

    const firstBatch = JSON.parse(mockFetch.mock.calls[0][1].body).input;
    const secondBatch = JSON.parse(mockFetch.mock.calls[1][1].body).input;
    expect(firstBatch).toHaveLength(128);
    expect(secondBatch).toHaveLength(72);

    expect(results).toHaveLength(200);
  });

  it('returns empty array for empty input without calling API', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const results = await embedDocuments([]);

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws descriptive error when VOYAGE_API_KEY is missing', async () => {
    delete process.env.VOYAGE_API_KEY;

    await expect(embedDocuments(['test'])).rejects.toThrow(
      'VOYAGE_API_KEY environment variable is not set',
    );
  });

  it('throws on non-200 API response with status code', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('rate limit exceeded', { status: 429 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(embedDocuments(['test'])).rejects.toThrow('Voyage API error (429)');
  });

  it('rejects entirely when a mid-batch API call fails', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeResponse(Array.from({ length: 128 }, () => [0.1])))
      .mockResolvedValueOnce(new Response('rate limit exceeded', { status: 429 }));
    vi.stubGlobal('fetch', mockFetch);

    const texts = Array.from({ length: 200 }, (_, i) => `text-${i}`);
    await expect(embedDocuments(texts)).rejects.toThrow(
      'Embedding failed on batch 2/2 (texts 128-199)',
    );
  });

  it('throws when API returns wrong number of embeddings', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeResponse([[0.1, 0.2]]),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(embedDocuments(['hello', 'world'])).rejects.toThrow(
      'expected 2 embeddings, got 1',
    );
  });

  it('throws when API returns empty embedding array', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [{ embedding: [] }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(embedDocuments(['test'])).rejects.toThrow(
      'invalid embedding at index 0',
    );
  });

  it('embedQuery throws when API returns empty data', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(embedQuery('test')).rejects.toThrow(
      'expected 1 embeddings, got 0',
    );
  });

  it('returns Float32Array instances', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeResponse([[0.1, 0.2], [0.3, 0.4]]))
      .mockResolvedValueOnce(makeResponse([[0.5, 0.6]]));
    vi.stubGlobal('fetch', mockFetch);

    const results = await embedDocuments(['a', 'b']);
    expect(results[0]).toBeInstanceOf(Float32Array);
    expect(results[1]).toBeInstanceOf(Float32Array);

    const queryResult = await embedQuery('q');
    expect(queryResult).toBeInstanceOf(Float32Array);
  });
});
