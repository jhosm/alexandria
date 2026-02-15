import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import yaml from 'js-yaml';

export interface ApiEntry {
  name: string;
  spec: string;
  docs?: string;
}

interface RawRegistry {
  apis?: unknown[];
}

export function loadRegistry(registryPath: string): ApiEntry[] {
  const raw = readFileSync(registryPath, 'utf-8');
  const parsed = yaml.load(raw) as RawRegistry;

  if (!parsed || !Array.isArray(parsed.apis)) {
    throw new Error(
      `Invalid apis.yml: expected top-level "apis" array in ${registryPath}`,
    );
  }

  const baseDir = dirname(resolve(registryPath));

  return parsed.apis.map((entry, i) => {
    const e = entry as Record<string, unknown>;
    if (!e.name || typeof e.name !== 'string') {
      throw new Error(`apis.yml entry ${i}: missing or invalid "name"`);
    }
    if (!e.spec || typeof e.spec !== 'string') {
      throw new Error(
        `apis.yml entry ${i} (${e.name}): missing or invalid "spec"`,
      );
    }

    const result: ApiEntry = {
      name: e.name,
      spec: resolve(baseDir, e.spec),
    };

    if (e.docs) {
      if (typeof e.docs !== 'string') {
        throw new Error(
          `apis.yml entry ${i} (${e.name}): "docs" must be a string`,
        );
      }
      result.docs = resolve(baseDir, e.docs);
    }

    return result;
  });
}
