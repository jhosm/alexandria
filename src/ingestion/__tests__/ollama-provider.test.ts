import { describe, it, expect, vi, afterEach } from 'vitest';
import { OllamaProvider } from '../providers/ollama.js';

describe('OllamaProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OLLAMA_URL;
    delete process.env.OLLAMA_MODEL;
  });

  it('sends correct URL and body, returns Float32Array results', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          embeddings: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OllamaProvider();
    const results = await provider.embedDocuments(['hello', 'world']);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:11434/api/embed');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('nomic-embed-text');
    expect(body.input).toEqual(['hello', 'world']);

    expect(results).toHaveLength(2);
    expect(results[0]).toBeInstanceOf(Float32Array);
    expect(results[0]).toEqual(new Float32Array([0.1, 0.2, 0.3]));
    expect(results[1]).toEqual(new Float32Array([0.4, 0.5, 0.6]));
  });

  it('embedQuery sends single text and returns single Float32Array', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ embeddings: [[0.7, 0.8, 0.9]] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OllamaProvider();
    const result = await provider.embedQuery('search term');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input).toEqual(['search term']);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toEqual(new Float32Array([0.7, 0.8, 0.9]));
  });

  it('returns empty array for empty input without calling fetch', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OllamaProvider();
    const results = await provider.embedDocuments([]);

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws descriptive error on connection failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fetch failed'));
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OllamaProvider();
    await expect(provider.embedDocuments(['test'])).rejects.toThrow(
      'Failed to connect to Ollama at http://localhost:11434: fetch failed',
    );
  });

  it('throws with status and body on non-200 response', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response('model not found', { status: 404 }));
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OllamaProvider();
    await expect(provider.embedDocuments(['test'])).rejects.toThrow(
      'Ollama API error (404): model not found',
    );
  });

  it('uses custom OLLAMA_URL and OLLAMA_MODEL from env', async () => {
    process.env.OLLAMA_URL = 'http://myhost:9999';
    process.env.OLLAMA_MODEL = 'custom-model';

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ embeddings: [[0.1]] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OllamaProvider();
    await provider.embedDocuments(['test']);

    expect(mockFetch.mock.calls[0][0]).toBe('http://myhost:9999/api/embed');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('custom-model');
  });
});
