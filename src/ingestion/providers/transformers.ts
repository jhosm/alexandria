import {
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';
import type { EmbeddingProvider } from './types.js';

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';
const DEFAULT_DIMENSION = 384;

export class TransformersProvider implements EmbeddingProvider {
  readonly dimension: number;
  private pipeline: FeatureExtractionPipeline | null = null;

  constructor() {
    const envDim = process.env.TRANSFORMERS_DIMENSION;
    this.dimension = envDim ? Number(envDim) : DEFAULT_DIMENSION;
  }

  private get model(): string {
    return process.env.TRANSFORMERS_MODEL || DEFAULT_MODEL;
  }

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (this.pipeline) return this.pipeline;

    try {
      // @ts-expect-error — pipeline() return type is a union too complex for TS to resolve
      this.pipeline = await pipeline('feature-extraction', this.model);
    } catch (error) {
      throw new Error(
        `Failed to load Transformers model "${this.model}": ${error instanceof Error ? error.message : error}`,
      );
    }
    return this.pipeline;
  }

  async embedDocuments(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    const pipe = await this.getPipeline();

    let output: { tolist(): number[][] };
    try {
      output = await pipe(texts, { pooling: 'mean', normalize: true });
    } catch (error) {
      throw new Error(
        `Transformers inference failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    const nested: number[][] = output.tolist();
    return nested.map((row) => new Float32Array(row));
  }

  async embedQuery(text: string): Promise<Float32Array> {
    const results = await this.embedDocuments([text]);
    if (results.length !== 1) {
      throw new Error(`Expected 1 query embedding, got ${results.length}`);
    }
    return results[0];
  }
}
