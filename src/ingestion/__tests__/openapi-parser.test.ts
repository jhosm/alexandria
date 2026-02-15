import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { parseOpenApiSpec } from '../openapi-parser.js';

const FIXTURE_PATH = resolve(import.meta.dirname, 'fixtures/sample-openapi.yaml');
const API_ID = 'petstore';

describe('parseOpenApiSpec', () => {
  it('produces expected chunk count', async () => {
    const chunks = await parseOpenApiSpec(FIXTURE_PATH, API_ID);
    // 1 overview + 3 endpoints + 1 schema (Pet has 4 props, PetInput has 2)
    expect(chunks).toHaveLength(5);
  });

  it('produces correct chunk types', async () => {
    const chunks = await parseOpenApiSpec(FIXTURE_PATH, API_ID);
    const types = chunks.map(c => c.type);
    expect(types.filter(t => t === 'overview')).toHaveLength(1);
    expect(types.filter(t => t === 'endpoint')).toHaveLength(3);
    expect(types.filter(t => t === 'schema')).toHaveLength(1);
  });

  it('endpoint chunks contain correct metadata', async () => {
    const chunks = await parseOpenApiSpec(FIXTURE_PATH, API_ID);
    const endpoints = chunks.filter(c => c.type === 'endpoint');

    const listPets = endpoints.find(c => c.metadata?.operationId === 'listPets');
    expect(listPets).toBeDefined();
    expect(listPets!.metadata).toEqual({
      path: '/pets',
      method: 'get',
      tags: ['pets'],
      operationId: 'listPets',
    });

    const createPet = endpoints.find(c => c.metadata?.operationId === 'createPet');
    expect(createPet).toBeDefined();
    expect(createPet!.metadata).toEqual({
      path: '/pets',
      method: 'post',
      tags: ['pets'],
      operationId: 'createPet',
    });

    const getPet = endpoints.find(c => c.metadata?.operationId === 'getPet');
    expect(getPet).toBeDefined();
    expect(getPet!.metadata).toEqual({
      path: '/pets/{petId}',
      method: 'get',
      tags: ['pets'],
      operationId: 'getPet',
    });
  });

  it('schema chunks only generated for schemas with 3+ properties', async () => {
    const chunks = await parseOpenApiSpec(FIXTURE_PATH, API_ID);
    const schemas = chunks.filter(c => c.type === 'schema');

    // Pet (4 properties) should be included
    expect(schemas).toHaveLength(1);
    expect(schemas[0].metadata?.schemaName).toBe('Pet');
    expect(schemas[0].metadata?.propertyCount).toBe(4);

    // PetInput (2 properties) should not be included
    const petInput = schemas.find(c => c.metadata?.schemaName === 'PetInput');
    expect(petInput).toBeUndefined();
  });

  it('content hashes are deterministic', async () => {
    const first = await parseOpenApiSpec(FIXTURE_PATH, API_ID);
    const second = await parseOpenApiSpec(FIXTURE_PATH, API_ID);

    expect(first).toHaveLength(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].contentHash).toBe(second[i].contentHash);
    }
  });

  it('chunk IDs follow expected format', async () => {
    const chunks = await parseOpenApiSpec(FIXTURE_PATH, API_ID);

    const overview = chunks.find(c => c.type === 'overview');
    expect(overview!.id).toBe('petstore:overview');

    const endpoints = chunks.filter(c => c.type === 'endpoint');
    for (const ep of endpoints) {
      const { method, path } = ep.metadata as { method: string; path: string };
      expect(ep.id).toBe(`petstore:endpoint:${method}:${path}`);
    }

    const schemas = chunks.filter(c => c.type === 'schema');
    for (const sc of schemas) {
      expect(sc.id).toBe(`petstore:schema:${sc.metadata?.schemaName}`);
    }
  });

  it('throws with context when spec file does not exist', async () => {
    await expect(parseOpenApiSpec('/nonexistent.yaml', 'test-api')).rejects.toThrow(
      'Failed to parse OpenAPI spec for "test-api" at /nonexistent.yaml',
    );
  });

  it('rejects Swagger 2.0 specs with clear error', async () => {
    const swagger2Path = resolve(import.meta.dirname, 'fixtures/swagger2-temp.yaml');
    await writeFile(swagger2Path, 'swagger: "2.0"\ninfo:\n  title: Old\n  version: "1.0"\npaths: {}');
    try {
      await expect(parseOpenApiSpec(swagger2Path, 'old-api')).rejects.toThrow(
        'not OpenAPI 3.x',
      );
    } finally {
      await unlink(swagger2Path);
    }
  });

  it('overview chunk contains title and version', async () => {
    const chunks = await parseOpenApiSpec(FIXTURE_PATH, API_ID);
    const overview = chunks.find(c => c.type === 'overview')!;

    expect(overview.title).toBe('Pet Store API');
    expect(overview.content).toContain('Pet Store API');
    expect(overview.content).toContain('1.2.0');
  });
});
