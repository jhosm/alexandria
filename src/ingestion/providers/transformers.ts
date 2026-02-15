import {
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';
import type { EmbeddingProvider } from './types.js';

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

let pipelineInstance: FeatureExtractionPipeline | null = null;

function getModel(): string {
  return process.env.TRANSFORMERS_MODEL || DEFAULT_MODEL;
}

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipelineInstance) return pipelineInstance;

  const model = getModel();
  try {
    // @ts-expect-error — pipeline() return type is a union too complex for TS to resolve
    pipelineInstance = await pipeline('feature-extraction', model);
  } catch (error) {
    throw new Error(
      `Failed to load Transformers model "${model}": ${error instanceof Error ? error.message : error}`,
    );
  }
  return pipelineInstance;
}

export class TransformersProvider implements EmbeddingProvider {
  readonly dimension = 384;

  async embedDocuments(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    const pipe = await getPipeline();
    const output = await pipe(texts, { pooling: 'mean', normalize: true });
    const nested: number[][] = output.tolist();
    return nested.map((row) => new Float32Array(row));
  }

  async embedQuery(text: string): Promise<Float32Array> {
    const [result] = await this.embedDocuments([text]);
    return result;
  }
}
