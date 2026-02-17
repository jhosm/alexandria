import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import yaml from 'js-yaml';

export interface ApiEntry {
  name: string;
  spec: string;
  docs?: string;
}

export interface DocEntry {
  name: string;
  path: string;
}

export interface RegistryResult {
  apis: ApiEntry[];
  docs: DocEntry[];
}

interface RawRegistry {
  apis?: unknown[];
  docs?: unknown[];
}

export function loadRegistry(registryPath: string): RegistryResult {
  const raw = readFileSync(registryPath, 'utf-8');
  const parsed = yaml.load(raw) as RawRegistry;

  if (!parsed || (!Array.isArray(parsed.apis) && !Array.isArray(parsed.docs))) {
    throw new Error(
      `Invalid apis.yml: expected top-level "apis" or "docs" array in ${registryPath}`,
    );
  }

  const baseDir = dirname(resolve(registryPath));

  const apis: ApiEntry[] = (parsed.apis ?? []).map((entry, i) => {
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

  const docs: DocEntry[] = (parsed.docs ?? []).map((entry, i) => {
    const e = entry as Record<string, unknown>;
    if (!e.name || typeof e.name !== 'string') {
      throw new Error(`apis.yml docs entry ${i}: missing or invalid "name"`);
    }
    if (!e.path || typeof e.path !== 'string') {
      throw new Error(
        `apis.yml docs entry ${i} (${e.name}): missing or invalid "path"`,
      );
    }
    return {
      name: e.name,
      path: resolve(baseDir, e.path),
    };
  });

  // Validate name uniqueness across both sections
  const allNames = new Map<string, string>();
  for (const a of apis) {
    if (allNames.has(a.name)) {
      throw new Error(
        `apis.yml: duplicate name "${a.name}" within apis section`,
      );
    }
    allNames.set(a.name, 'apis');
  }
  for (const d of docs) {
    const existing = allNames.get(d.name);
    if (existing) {
      throw new Error(
        `apis.yml: duplicate name "${d.name}" (appears in both ${existing} and docs sections)`,
      );
    }
    allNames.set(d.name, 'docs');
  }

  return { apis, docs };
}
