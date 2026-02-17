import { program } from 'commander';
import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v5 as uuidV5 } from 'uuid';
import { getDb, closeDb } from '../db/index.js';
import {
  upsertChunk,
  deleteChunk,
  getChunksByApi,
  upsertApi,
} from '../db/queries.js';
import { parseOpenApiSpec } from './openapi-parser.js';
import { parseMarkdownFile } from './markdown-parser.js';
import { embedDocuments, getDimension } from './embedder.js';
import { loadRegistry } from './registry.js';
import type { Chunk, Api } from '../shared/types.js';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function apiId(name: string): string {
  return uuidV5(name, UUID_NAMESPACE);
}

export class CliError extends Error {
  constructor(message: string) {
    super(message);
  }
}

interface IngestResult {
  api: string;
  total: number;
  embedded: number;
  skipped: number;
  deleted: number;
}

function formatResult(r: IngestResult): string {
  return `  ${r.total} chunks: ${r.embedded} embedded, ${r.skipped} skipped, ${r.deleted} deleted`;
}

async function ingestChunks(
  name: string,
  chunks: Chunk[],
  api: Api,
): Promise<IngestResult> {
  const db = getDb(undefined, getDimension());

  // Incremental re-indexing — compare content hashes
  const existingChunks = getChunksByApi(db, api.id);
  const existingHashMap = new Map(
    existingChunks.map((c) => [c.id, c.contentHash]),
  );

  const changedChunks: Chunk[] = [];
  let skipped = 0;

  for (const chunk of chunks) {
    const existingHash = existingHashMap.get(chunk.id);
    if (existingHash === chunk.contentHash) {
      skipped++;
    } else {
      changedChunks.push(chunk);
    }
  }

  // Batch embed changed chunks (before any DB writes for atomicity)
  const embeddings = await embedDocuments(changedChunks.map((c) => c.content));

  // Atomic write: API registry + chunk upserts + orphan cleanup
  const currentIds = new Set(chunks.map((c) => c.id));
  const orphans = existingChunks.filter((c) => !currentIds.has(c.id));

  const writeAll = db.transaction(() => {
    upsertApi(db, api);
    for (let i = 0; i < changedChunks.length; i++) {
      upsertChunk(db, changedChunks[i], embeddings[i]);
    }
    for (const orphan of orphans) {
      deleteChunk(db, orphan.id);
    }
  });
  writeAll();

  return {
    api: name,
    total: chunks.length,
    embedded: changedChunks.length,
    skipped,
    deleted: orphans.length,
  };
}

async function parseMarkdownDir(dirPath: string, id: string): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      chunks.push(...(await parseMarkdownFile(join(dirPath, file), id)));
    }
  }
  return chunks;
}

export async function ingestApi(
  name: string,
  specPath: string,
  docsPath?: string,
): Promise<IngestResult> {
  const id = apiId(name);

  const chunks: Chunk[] = [];
  chunks.push(...(await parseOpenApiSpec(specPath, id)));
  if (docsPath) {
    chunks.push(...(await parseMarkdownDir(docsPath, id)));
  }

  const api: Api = {
    id,
    name,
    specPath: resolve(specPath),
    docsPath: docsPath ? resolve(docsPath) : undefined,
  };

  return ingestChunks(name, chunks, api);
}

export async function ingestDocs(
  name: string,
  docsPath: string,
): Promise<IngestResult> {
  if (!existsSync(docsPath)) {
    throw new Error(`docs path does not exist: ${docsPath}`);
  }

  const id = apiId(name);
  const chunks = await parseMarkdownDir(docsPath, id);

  const api: Api = {
    id,
    name,
    docsPath: resolve(docsPath),
  };

  return ingestChunks(name, chunks, api);
}

export interface CliOptions {
  api?: string;
  spec?: string;
  docs?: string;
  all?: boolean;
  registry?: string;
}

export async function runCli(opts: CliOptions): Promise<void> {
  try {
    if (opts.all) {
      const registryPath = resolve(
        opts.registry ?? process.env.ALEXANDRIA_REGISTRY_PATH ?? 'apis.yml',
      );
      if (!existsSync(registryPath)) {
        throw new CliError(`registry not found: ${registryPath}`);
      }
      const registry = loadRegistry(registryPath);
      const results: IngestResult[] = [];
      let failed = 0;

      async function processEntry(
        name: string,
        ingest: () => Promise<IngestResult>,
      ) {
        console.log(`Ingesting ${name}...`);
        try {
          const result = await ingest();
          results.push(result);
          console.log(formatResult(result));
        } catch (error) {
          if (error instanceof TypeError || error instanceof RangeError)
            throw error;
          if (
            error instanceof Error &&
            /SQLITE_(CORRUPT|READONLY|FULL|IOERR)/.test(error.message)
          )
            throw error;

          failed++;
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`  Error ingesting ${name}: ${msg}`);
          if (error instanceof Error && error.stack) {
            console.error(error.stack);
          }
        }
      }

      for (const entry of registry.apis) {
        await processEntry(entry.name, () =>
          ingestApi(entry.name, entry.spec, entry.docs),
        );
      }

      for (const entry of registry.docs) {
        await processEntry(entry.name, () =>
          ingestDocs(entry.name, entry.path),
        );
      }

      const entryCount = results.length;
      const totals = results.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          embedded: acc.embedded + r.embedded,
          skipped: acc.skipped + r.skipped,
          deleted: acc.deleted + r.deleted,
        }),
        { total: 0, embedded: 0, skipped: 0, deleted: 0 },
      );
      const countLabel = `${entryCount} entr${entryCount !== 1 ? 'ies' : 'y'} processed`;
      const chunkSummary = `${totals.total} chunks (${totals.embedded} embedded, ${totals.skipped} skipped, ${totals.deleted} deleted)`;
      const failSuffix = failed > 0 ? `, ${failed} failed` : '';
      console.log(`\nDone. ${countLabel}, ${chunkSummary}${failSuffix}`);

      if (failed > 0) {
        process.exitCode = 1;
      }
    } else if (opts.api && opts.spec) {
      console.log(`Ingesting ${opts.api}...`);
      const result = await ingestApi(opts.api, opts.spec, opts.docs);
      console.log(formatResult(result));
    } else {
      throw new CliError('provide --api and --spec, or --all');
    }
  } finally {
    closeDb();
  }
}

program
  .name('ingest')
  .description('Index API documentation into Alexandria')
  .option('--api <name>', 'API name')
  .option('--spec <path>', 'Path to OpenAPI spec file')
  .option('--docs <dir>', 'Path to markdown docs directory')
  .option('--all', 'Ingest all APIs from registry')
  .option('--registry <path>', 'Path to registry file (default: apis.yml)')
  .action(runCli);

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  program.parseAsync().catch((err) => {
    if (err instanceof CliError) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });
}
