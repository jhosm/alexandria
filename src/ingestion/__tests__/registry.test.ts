import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadRegistry } from '../registry.js';

const TMP_DIR = join(import.meta.dirname, 'fixtures', 'tmp-registry');

function writeYaml(filename: string, content: string): string {
  mkdirSync(TMP_DIR, { recursive: true });
  const path = join(TMP_DIR, filename);
  writeFileSync(path, content);
  return path;
}

function cleanup(): void {
  rmSync(TMP_DIR, { recursive: true, force: true });
}

describe('loadRegistry', () => {
  afterEach(cleanup);

  it('parses valid registry with name, spec, and docs', () => {
    const path = writeYaml(
      'valid.yml',
      `apis:
  - name: petstore
    spec: ./specs/petstore/openapi.yaml
    docs: ./specs/petstore/docs/
`,
    );

    const entries = loadRegistry(path);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('petstore');
    expect(entries[0].spec).toBe(
      resolve(TMP_DIR, './specs/petstore/openapi.yaml'),
    );
    expect(entries[0].docs).toBe(resolve(TMP_DIR, './specs/petstore/docs/'));
  });

  it('parses entry without optional docs field', () => {
    const path = writeYaml(
      'no-docs.yml',
      `apis:
  - name: payments
    spec: ./specs/payments/openapi.yaml
`,
    );

    const entries = loadRegistry(path);
    expect(entries).toHaveLength(1);
    expect(entries[0].docs).toBeUndefined();
  });

  it('parses multiple entries', () => {
    const path = writeYaml(
      'multi.yml',
      `apis:
  - name: a
    spec: ./a.yaml
  - name: b
    spec: ./b.yaml
    docs: ./b-docs/
`,
    );

    const entries = loadRegistry(path);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('a');
    expect(entries[1].name).toBe('b');
    expect(entries[1].docs).toBeDefined();
  });

  it('resolves paths relative to registry file location', () => {
    const path = writeYaml(
      'resolve.yml',
      `apis:\n  - name: x\n    spec: ../other/spec.yaml\n`,
    );

    const entries = loadRegistry(path);
    expect(entries[0].spec).toBe(resolve(TMP_DIR, '../other/spec.yaml'));
  });

  it('throws on missing top-level apis array', () => {
    const path = writeYaml('bad-root.yml', `something_else: true\n`);
    expect(() => loadRegistry(path)).toThrow('expected top-level "apis" array');
  });

  it('throws on empty file', () => {
    const path = writeYaml('empty.yml', '');
    expect(() => loadRegistry(path)).toThrow('expected top-level "apis" array');
  });

  it('throws on entry with missing name', () => {
    const path = writeYaml('no-name.yml', `apis:\n  - spec: ./a.yaml\n`);
    expect(() => loadRegistry(path)).toThrow('missing or invalid "name"');
  });

  it('throws on entry with missing spec', () => {
    const path = writeYaml('no-spec.yml', `apis:\n  - name: test\n`);
    expect(() => loadRegistry(path)).toThrow('missing or invalid "spec"');
  });

  it('throws on entry with non-string docs', () => {
    const path = writeYaml(
      'bad-docs.yml',
      `apis:\n  - name: test\n    spec: ./a.yaml\n    docs: 123\n`,
    );
    expect(() => loadRegistry(path)).toThrow('"docs" must be a string');
  });

  it('throws when file does not exist', () => {
    expect(() => loadRegistry('/nonexistent/apis.yml')).toThrow();
  });
});
