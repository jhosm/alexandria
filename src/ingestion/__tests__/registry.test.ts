import { describe, it, expect, afterEach } from 'vitest';
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

    const result = loadRegistry(path);
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0].name).toBe('petstore');
    expect(result.apis[0].spec).toBe(
      resolve(TMP_DIR, './specs/petstore/openapi.yaml'),
    );
    expect(result.apis[0].docs).toBe(
      resolve(TMP_DIR, './specs/petstore/docs/'),
    );
    expect(result.docs).toHaveLength(0);
  });

  it('parses entry without optional docs field', () => {
    const path = writeYaml(
      'no-docs.yml',
      `apis:
  - name: payments
    spec: ./specs/payments/openapi.yaml
`,
    );

    const result = loadRegistry(path);
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0].docs).toBeUndefined();
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

    const result = loadRegistry(path);
    expect(result.apis).toHaveLength(2);
    expect(result.apis[0].name).toBe('a');
    expect(result.apis[1].name).toBe('b');
    expect(result.apis[1].docs).toBeDefined();
  });

  it('resolves paths relative to registry file location', () => {
    const path = writeYaml(
      'resolve.yml',
      `apis:\n  - name: x\n    spec: ../other/spec.yaml\n`,
    );

    const result = loadRegistry(path);
    expect(result.apis[0].spec).toBe(resolve(TMP_DIR, '../other/spec.yaml'));
  });

  it('throws on missing top-level apis or docs array', () => {
    const path = writeYaml('bad-root.yml', `something_else: true\n`);
    expect(() => loadRegistry(path)).toThrow(
      'expected top-level "apis" or "docs" array',
    );
  });

  it('throws on empty file', () => {
    const path = writeYaml('empty.yml', '');
    expect(() => loadRegistry(path)).toThrow(
      'expected top-level "apis" or "docs" array',
    );
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

  // --- docs section tests ---

  it('parses docs-only registry', () => {
    const path = writeYaml(
      'docs-only.yml',
      `docs:
  - name: arch
    path: ./docs/arch
`,
    );

    const result = loadRegistry(path);
    expect(result.apis).toHaveLength(0);
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0].name).toBe('arch');
    expect(result.docs[0].path).toBe(resolve(TMP_DIR, './docs/arch'));
  });

  it('parses mixed registry with apis and docs', () => {
    const path = writeYaml(
      'mixed.yml',
      `apis:
  - name: petstore
    spec: ./specs/petstore.yaml
docs:
  - name: arch
    path: ./docs/arch
`,
    );

    const result = loadRegistry(path);
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0].name).toBe('petstore');
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0].name).toBe('arch');
  });

  it('throws on doc entry with missing name', () => {
    const path = writeYaml('doc-no-name.yml', `docs:\n  - path: ./docs/arch\n`);
    expect(() => loadRegistry(path)).toThrow(
      'docs entry 0: missing or invalid "name"',
    );
  });

  it('throws on doc entry with missing path', () => {
    const path = writeYaml('doc-no-path.yml', `docs:\n  - name: arch\n`);
    expect(() => loadRegistry(path)).toThrow(
      'docs entry 0 (arch): missing or invalid "path"',
    );
  });

  it('resolves doc entry path relative to registry file', () => {
    const path = writeYaml(
      'doc-resolve.yml',
      `docs:\n  - name: arch\n    path: ../docs/arch\n`,
    );

    const result = loadRegistry(path);
    expect(result.docs[0].path).toBe(resolve(TMP_DIR, '../docs/arch'));
  });

  it('throws on duplicate name across apis and docs sections', () => {
    const path = writeYaml(
      'dup-cross.yml',
      `apis:
  - name: payments
    spec: ./payments.yaml
docs:
  - name: payments
    path: ./docs/payments
`,
    );
    expect(() => loadRegistry(path)).toThrow('duplicate name "payments"');
  });

  it('throws on duplicate name within docs section', () => {
    const path = writeYaml(
      'dup-docs.yml',
      `docs:
  - name: arch
    path: ./docs/arch
  - name: arch
    path: ./docs/arch2
`,
    );
    expect(() => loadRegistry(path)).toThrow('duplicate name "arch"');
  });
});
