import type { EmbeddingProvider } from './types.js';

const DEFAULT_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'nomic-embed-text';

export class OllamaProvider implements EmbeddingProvider {
  readonly dimension = 768;

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
    return json.embeddings.map((e: number[]) => new Float32Array(e));
  }

  async embedQuery(text: string): Promise<Float32Array> {
    const results = await this.embedDocuments([text]);
    return results[0];
  }
}
