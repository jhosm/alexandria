import type { EmbeddingProvider } from './types.js';

const DEFAULT_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'bge-large';
const DEFAULT_DIMENSION = 1024;

export class OllamaProvider implements EmbeddingProvider {
  readonly dimension: number;

  constructor() {
    const envDim = process.env.OLLAMA_DIMENSION;
    this.dimension = envDim ? Number(envDim) : DEFAULT_DIMENSION;
  }

  private get url(): string {
    return process.env.OLLAMA_URL || DEFAULT_URL;
  }

  private get model(): string {
    return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  }

  async embedDocuments(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    let response: Response;
    try {
      response = await fetch(`${this.url}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: texts }),
      });
    } catch (error) {
      throw new Error(
        `Failed to connect to Ollama at ${this.url}: ${error instanceof Error ? error.message : error}`,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${body}`);
    }

    const json = await response.json();

    if (!json.embeddings || !Array.isArray(json.embeddings)) {
      throw new Error(
        'Ollama API returned unexpected response: missing embeddings array',
      );
    }

    if (json.embeddings.length !== texts.length) {
      throw new Error(
        `Ollama API returned unexpected response: expected ${texts.length} embeddings, got ${json.embeddings.length}`,
      );
    }

    return json.embeddings.map((e: number[], i: number) => {
      if (!Array.isArray(e) || e.length === 0) {
        throw new Error(`Ollama API returned invalid embedding at index ${i}`);
      }
      return new Float32Array(e);
    });
  }

  async embedQuery(text: string): Promise<Float32Array> {
    const results = await this.embedDocuments([text]);
    if (results.length !== 1) {
      throw new Error(`Expected 1 query embedding, got ${results.length}`);
    }
    return results[0];
  }
}
