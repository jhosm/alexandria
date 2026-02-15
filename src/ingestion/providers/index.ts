import type { EmbeddingProvider } from './types.js';
import { VoyageProvider } from './voyage.js';
import { OllamaProvider } from './ollama.js';
import { TransformersProvider } from './transformers.js';

export type { EmbeddingProvider } from './types.js';

const VALID_PROVIDERS = ['voyage', 'ollama', 'transformers'] as const;
type ProviderName = (typeof VALID_PROVIDERS)[number];

let instance: EmbeddingProvider | null = null;

function createProvider(name: ProviderName): EmbeddingProvider {
  switch (name) {
    case 'voyage':
      return new VoyageProvider();
    case 'ollama':
      return new OllamaProvider();
    case 'transformers':
      return new TransformersProvider();
  }
}

export function getProvider(): EmbeddingProvider {
  if (instance) return instance;

  const name = (process.env.EMBEDDING_PROVIDER || 'voyage') as string;

  if (!VALID_PROVIDERS.includes(name as ProviderName)) {
    throw new Error(
      `Invalid EMBEDDING_PROVIDER "${name}". Valid options: ${VALID_PROVIDERS.join(', ')}`,
    );
  }

  instance = createProvider(name as ProviderName);
  return instance;
}

export function resetProvider(): void {
  instance = null;
}
