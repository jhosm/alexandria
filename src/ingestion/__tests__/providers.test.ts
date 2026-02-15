import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProvider, resetProvider } from '../providers/index.js';
import { VoyageProvider } from '../providers/voyage.js';
import { OllamaProvider } from '../providers/ollama.js';
import { TransformersProvider } from '../providers/transformers.js';

describe('getProvider', () => {
  let originalProvider: string | undefined;

  beforeEach(() => {
    originalProvider = process.env.EMBEDDING_PROVIDER;
    resetProvider();
  });

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.EMBEDDING_PROVIDER;
    } else {
      process.env.EMBEDDING_PROVIDER = originalProvider;
    }
    resetProvider();
  });

  it('defaults to VoyageProvider when EMBEDDING_PROVIDER is not set', () => {
    delete process.env.EMBEDDING_PROVIDER;
    expect(getProvider()).toBeInstanceOf(VoyageProvider);
  });

  it('returns VoyageProvider when EMBEDDING_PROVIDER=voyage', () => {
    process.env.EMBEDDING_PROVIDER = 'voyage';
    expect(getProvider()).toBeInstanceOf(VoyageProvider);
  });

  it('returns OllamaProvider when EMBEDDING_PROVIDER=ollama', () => {
    process.env.EMBEDDING_PROVIDER = 'ollama';
    expect(getProvider()).toBeInstanceOf(OllamaProvider);
  });

  it('returns TransformersProvider when EMBEDDING_PROVIDER=transformers', () => {
    process.env.EMBEDDING_PROVIDER = 'transformers';
    expect(getProvider()).toBeInstanceOf(TransformersProvider);
  });

  it('throws on invalid provider value', () => {
    process.env.EMBEDDING_PROVIDER = 'invalid';
    expect(() => getProvider()).toThrow(
      'Invalid EMBEDDING_PROVIDER "invalid". Valid options: voyage, ollama, transformers',
    );
  });

  it('returns the same instance on repeated calls (singleton)', () => {
    process.env.EMBEDDING_PROVIDER = 'voyage';
    const first = getProvider();
    const second = getProvider();
    expect(first).toBe(second);
  });

  it('returns a new instance after resetProvider()', () => {
    process.env.EMBEDDING_PROVIDER = 'voyage';
    const first = getProvider();
    resetProvider();
    const second = getProvider();
    expect(first).not.toBe(second);
    expect(second).toBeInstanceOf(VoyageProvider);
  });
});
