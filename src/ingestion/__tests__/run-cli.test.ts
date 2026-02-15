import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTestDb } from '../../db/index.js';
import type { Chunk } from '../../shared/types.js';
import type Database from 'better-sqlite3';

vi.mock('../openapi-parser.js', () => ({
  parseOpenApiSpec: vi.fn(),
}));
vi.mock('../markdown-parser.js', () => ({
  parseMarkdownFile: vi.fn(),
}));
vi.mock('../embedder.js', () => ({
  embedDocuments: vi.fn(),
  getDimension: vi.fn().mockReturnValue(1024),
}));
vi.mock('../../db/index.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../db/index.js')>();
  return {
    ...original,
    getDb: vi.fn(),
    closeDb: vi.fn(),
  };
});

import { runCli, CliError } from '../index.js';
import { parseOpenApiSpec } from '../openapi-parser.js';
import { parseMarkdownFile } from '../markdown-parser.js';
import { embedDocuments } from '../embedder.js';
import { getDb, closeDb } from '../../db/index.js';

function makeChunk(id: string, apiId: string): Chunk {
  return {
    id,
    apiId,
    type: 'endpoint',
    title: `Chunk ${id}`,
    content: `Content for ${id}`,
    contentHash: `hash-${id}`,
  };
}

function fakeEmbedding(): Float32Array {
  return new Float32Array(1024);
}

describe('runCli', () => {
  let db: Database.Database;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let savedExitCode: number | undefined;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db);
    vi.mocked(embedDocuments).mockImplementation(async (texts) =>
      texts.map(() => fakeEmbedding()),
    );
    vi.mocked(parseOpenApiSpec).mockResolvedValue([]);
    vi.mocked(parseMarkdownFile).mockResolvedValue([]);

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    db.close();
    process.exitCode = savedExitCode;
    vi.restoreAllMocks();
  });

  it('throws CliError when no arguments provided', async () => {
    await expect(runCli({})).rejects.toThrow(
      'provide --api and --spec, or --all',
    );
    await expect(runCli({})).rejects.toBeInstanceOf(CliError);
    expect(closeDb).toHaveBeenCalled();
  });

  it('throws CliError when --api is provided without --spec', async () => {
    await expect(runCli({ api: 'foo' })).rejects.toThrow(
      'provide --api and --spec, or --all',
    );
    expect(closeDb).toHaveBeenCalled();
  });

  it('throws CliError when --spec is provided without --api', async () => {
    await expect(runCli({ spec: '/some/path.yaml' })).rejects.toThrow(
      'provide --api and --spec, or --all',
    );
  });

  it('throws CliError when --all is used without apis.yml', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-runcli-'));
    const origCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      await expect(runCli({ all: true })).rejects.toThrow('apis.yml not found');
      await expect(runCli({ all: true })).rejects.toBeInstanceOf(CliError);
      expect(closeDb).toHaveBeenCalled();
    } finally {
      process.chdir(origCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('ingests single API with --api and --spec', async () => {
    vi.mocked(parseOpenApiSpec).mockImplementation(async (_path, apiId) => [
      makeChunk('c1', apiId),
    ]);

    const fixtures = import.meta.dirname + '/fixtures';
    await runCli({ api: 'testapi', spec: fixtures + '/sample-openapi.yaml' });

    expect(logSpy).toHaveBeenCalledWith('Ingesting testapi...');
    expect(logSpy).toHaveBeenCalledWith(
      '  1 chunks: 1 embedded, 0 skipped, 0 deleted',
    );
    expect(closeDb).toHaveBeenCalled();
  });

  it('ingests single API with --api, --spec, and --docs', async () => {
    vi.mocked(parseOpenApiSpec).mockImplementation(async (_path, apiId) => [
      makeChunk('s1', apiId),
    ]);
    let idx = 0;
    vi.mocked(parseMarkdownFile).mockImplementation(async (_path, apiId) => [
      makeChunk(`d${idx++}`, apiId),
    ]);

    const fixtures = import.meta.dirname + '/fixtures';
    await runCli({
      api: 'testapi',
      spec: fixtures + '/sample-openapi.yaml',
      docs: fixtures,
    });

    expect(logSpy).toHaveBeenCalledWith('Ingesting testapi...');
    expect(logSpy).toHaveBeenCalledWith(
      '  3 chunks: 3 embedded, 0 skipped, 0 deleted',
    );
  });

  it('propagates embedding errors in single-API mode and calls closeDb', async () => {
    vi.mocked(parseOpenApiSpec).mockImplementation(async (_path, apiId) => [
      makeChunk('c1', apiId),
    ]);
    vi.mocked(embedDocuments).mockRejectedValue(new Error('Voyage API 429'));

    const fixtures = import.meta.dirname + '/fixtures';
    await expect(
      runCli({ api: 'testapi', spec: fixtures + '/sample-openapi.yaml' }),
    ).rejects.toThrow('Voyage API 429');
    expect(closeDb).toHaveBeenCalled();
  });

  it('--all processes registry and prints summary', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-runcli-'));
    const origCwd = process.cwd();
    try {
      // Create a minimal apis.yml pointing to our fixtures
      const fixtures = import.meta.dirname + '/fixtures';
      writeFileSync(
        join(tmpDir, 'apis.yml'),
        `apis:\n  - name: pets\n    spec: ${fixtures}/sample-openapi.yaml\n`,
      );

      vi.mocked(parseOpenApiSpec).mockImplementation(async (_path, apiId) => [
        makeChunk('e1', apiId),
        makeChunk('e2', apiId),
      ]);

      process.chdir(tmpDir);
      await runCli({ all: true });

      expect(logSpy).toHaveBeenCalledWith('Ingesting pets...');
      expect(logSpy).toHaveBeenCalledWith(
        '  2 chunks: 2 embedded, 0 skipped, 0 deleted',
      );
      // Summary line
      const summaryCalls = logSpy.mock.calls.map((c) => c[0]);
      expect(
        summaryCalls.some((s: string) => s.includes('Done. 1 API processed')),
      ).toBe(true);
      expect(closeDb).toHaveBeenCalled();
    } finally {
      process.chdir(origCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('--all with empty registry prints summary with zero APIs', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-runcli-'));
    const origCwd = process.cwd();
    try {
      writeFileSync(join(tmpDir, 'apis.yml'), 'apis: []\n');
      process.chdir(tmpDir);
      await runCli({ all: true });
      const summaryCalls = logSpy.mock.calls.map((c) => c[0]);
      expect(
        summaryCalls.some((s: string) => s.includes('Done. 0 APIs processed')),
      ).toBe(true);
    } finally {
      process.chdir(origCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('--all handles per-API errors and sets exitCode 1', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-runcli-'));
    const origCwd = process.cwd();
    try {
      const fixtures = import.meta.dirname + '/fixtures';
      writeFileSync(
        join(tmpDir, 'apis.yml'),
        `apis:\n  - name: good\n    spec: ${fixtures}/sample-openapi.yaml\n  - name: bad\n    spec: ./nonexistent.yaml\n`,
      );

      vi.mocked(parseOpenApiSpec).mockImplementation(async (path, apiId) => {
        if (path.includes('nonexistent')) throw new Error('file not found');
        return [makeChunk('c1', apiId)];
      });

      process.chdir(tmpDir);
      await runCli({ all: true });

      // Good API succeeds
      expect(logSpy).toHaveBeenCalledWith('Ingesting good...');
      expect(logSpy).toHaveBeenCalledWith(
        '  1 chunks: 1 embedded, 0 skipped, 0 deleted',
      );
      // Bad API fails but doesn't stop
      expect(errorSpy).toHaveBeenCalledWith(
        '  Error ingesting bad: file not found',
      );
      // Summary includes failure
      const summaryCalls = logSpy.mock.calls.map((c) => c[0]);
      expect(
        summaryCalls.some(
          (s: string) =>
            s.includes('1 API processed') && s.includes('1 failed'),
        ),
      ).toBe(true);
      expect(process.exitCode).toBe(1);
    } finally {
      process.chdir(origCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('--all re-throws unrecoverable errors', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'alexandria-runcli-'));
    const origCwd = process.cwd();
    try {
      const fixtures = import.meta.dirname + '/fixtures';
      writeFileSync(
        join(tmpDir, 'apis.yml'),
        `apis:\n  - name: bad\n    spec: ${fixtures}/sample-openapi.yaml\n`,
      );

      vi.mocked(parseOpenApiSpec).mockImplementation(async () => {
        throw new TypeError('Cannot read properties of undefined');
      });

      process.chdir(tmpDir);
      await expect(runCli({ all: true })).rejects.toThrow(TypeError);
      expect(closeDb).toHaveBeenCalled();
    } finally {
      process.chdir(origCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
