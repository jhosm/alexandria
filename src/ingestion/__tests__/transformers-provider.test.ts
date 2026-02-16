import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPipeline = vi.fn();
const mockPipelineFn = vi.fn();

vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipelineFn,
}));

describe('TransformersProvider', () => {
  let originalModel: string | undefined;

  beforeEach(() => {
    originalModel = process.env.TRANSFORMERS_MODEL;
    vi.resetModules();
    mockPipelineFn.mockReset();
    mockPipeline.mockReset();
  });

  afterEach(() => {
    if (originalModel === undefined) {
      delete process.env.TRANSFORMERS_MODEL;
    } else {
      process.env.TRANSFORMERS_MODEL = originalModel;
    }
    delete process.env.TRANSFORMERS_DIMENSION;
    delete process.env.TRANSFORMERS_POOLING;
  });

  async function createProvider() {
    const mod = await import('../providers/transformers.js');
    return new mod.TransformersProvider();
  }

  it('embeds documents with correct model and returns Float32Array results', async () => {
    mockPipeline.mockResolvedValue({
      tolist: () => [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ],
    });
    mockPipelineFn.mockResolvedValue(mockPipeline);

    const provider = await createProvider();
    const results = await provider.embedDocuments(['hello', 'world']);

    expect(mockPipelineFn).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/bge-large-en-v1.5',
    );
    expect(mockPipeline).toHaveBeenCalledWith(['hello', 'world'], {
      pooling: 'cls',
      normalize: true,
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toBeInstanceOf(Float32Array);
    expect(results[1]).toBeInstanceOf(Float32Array);
    expect(Array.from(results[0])).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
      expect.closeTo(0.3),
    ]);
  });

  it('embeds query by delegating to embedDocuments', async () => {
    mockPipeline.mockResolvedValue({
      tolist: () => [[0.7, 0.8, 0.9]],
    });
    mockPipelineFn.mockResolvedValue(mockPipeline);

    const provider = await createProvider();
    const result = await provider.embedQuery('test query');

    expect(result).toBeInstanceOf(Float32Array);
    expect(Array.from(result)).toEqual([
      expect.closeTo(0.7),
      expect.closeTo(0.8),
      expect.closeTo(0.9),
    ]);
  });

  it('returns empty array for empty input without creating pipeline', async () => {
    const provider = await createProvider();
    const results = await provider.embedDocuments([]);

    expect(results).toEqual([]);
    expect(mockPipelineFn).not.toHaveBeenCalled();
  });

  it('reuses singleton pipeline on subsequent calls', async () => {
    mockPipeline.mockResolvedValue({
      tolist: () => [[0.1, 0.2, 0.3]],
    });
    mockPipelineFn.mockResolvedValue(mockPipeline);

    const provider = await createProvider();
    await provider.embedDocuments(['first']);
    await provider.embedDocuments(['second']);

    expect(mockPipelineFn).toHaveBeenCalledTimes(1);
  });

  it('throws descriptive error when model fails to load', async () => {
    mockPipelineFn.mockRejectedValue(new Error('network timeout'));

    const provider = await createProvider();

    await expect(provider.embedDocuments(['test'])).rejects.toThrow(
      'Failed to load Transformers model "Xenova/bge-large-en-v1.5": network timeout',
    );
  });

  it('uses TRANSFORMERS_MODEL env var when set', async () => {
    process.env.TRANSFORMERS_MODEL = 'custom/model';
    mockPipeline.mockResolvedValue({
      tolist: () => [[0.1, 0.2, 0.3]],
    });
    mockPipelineFn.mockResolvedValue(mockPipeline);

    const provider = await createProvider();
    await provider.embedDocuments(['hello']);

    expect(mockPipelineFn).toHaveBeenCalledWith(
      'feature-extraction',
      'custom/model',
    );
  });

  it('uses TRANSFORMERS_DIMENSION env var for dimension', async () => {
    process.env.TRANSFORMERS_DIMENSION = '768';
    const provider = await createProvider();
    expect(provider.dimension).toBe(768);
  });

  it('defaults dimension to 1024', async () => {
    const provider = await createProvider();
    expect(provider.dimension).toBe(1024);
  });

  it('uses TRANSFORMERS_POOLING env var when set', async () => {
    process.env.TRANSFORMERS_POOLING = 'mean';
    mockPipeline.mockResolvedValue({
      tolist: () => [[0.1, 0.2, 0.3]],
    });
    mockPipelineFn.mockResolvedValue(mockPipeline);

    const provider = await createProvider();
    await provider.embedDocuments(['hello']);

    expect(mockPipeline).toHaveBeenCalledWith(['hello'], {
      pooling: 'mean',
      normalize: true,
    });
  });

  it('throws descriptive error when inference fails', async () => {
    mockPipeline.mockRejectedValue(new Error('out of memory'));
    mockPipelineFn.mockResolvedValue(mockPipeline);

    const provider = await createProvider();
    await expect(provider.embedDocuments(['test'])).rejects.toThrow(
      'Transformers inference failed: out of memory',
    );
  });
});
