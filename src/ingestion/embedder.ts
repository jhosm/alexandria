import { getProvider } from './providers/index.js';

export async function embedDocuments(texts: string[]): Promise<Float32Array[]> {
  return getProvider().embedDocuments(texts);
}

export async function embedQuery(text: string): Promise<Float32Array> {
  return getProvider().embedQuery(text);
}
