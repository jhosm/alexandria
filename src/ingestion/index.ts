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
import { embedDocuments } from './embedder.js';
import { loadRegistry } from './registry.js';
import type { Chunk, Api } from '../shared/types.js';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function apiId(name: string): string {
  return uuidV5(name, UUID_NAMESPACE);
}

interface IngestResult {
  api: string;
  total: number;
  embedded: number;
  skipped: number;
  deleted: number;
}

export async function ingestApi(
  name: string,
  specPath: string,
  docsPath?: string,
): Promise<IngestResult> {
  const id = apiId(name);
  const db = getDb();

  // 2.2: Parse spec + docs → collect all chunks
  const chunks: Chunk[] = [];
  chunks.push(...(await parseOpenApiSpec(specPath, id)));

  if (docsPath && existsSync(docsPath)) {
    const files = readdirSync(docsPath).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      chunks.push(...(await parseMarkdownFile(join(docsPath, file), id)));
    }
  }

  // 2.3: Incremental re-indexing — compare content hashes
  const existingChunks = getChunksByApi(db, id);
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

  // 2.7: API registry upsert (must precede chunk upserts due to FK constraint)
  const api: Api = {
    id,
    name,
    specPath: resolve(specPath),
    docsPath: docsPath ? resolve(docsPath) : undefined,
  };
  upsertApi(db, api);

  // 2.4: Batch embed changed chunks
  let embeddings: Float32Array[] = [];
  if (changedChunks.length > 0) {
    embeddings = await embedDocuments(changedChunks.map((c) => c.content));
  }

  // 2.5: Transactional upsert of embedded chunks
  const upsertAll = db.transaction(() => {
    for (let i = 0; i < changedChunks.length; i++) {
      upsertChunk(db, changedChunks[i], embeddings[i]);
    }
  });
  upsertAll();

  // 2.6: Orphan cleanup — delete chunks not in current parse results
  const currentIds = new Set(chunks.map((c) => c.id));
  const orphans = existingChunks.filter((c) => !currentIds.has(c.id));
  const deleteOrphans = db.transaction(() => {
    for (const orphan of orphans) {
      deleteChunk(db, orphan.id);
    }
  });
  deleteOrphans();

  return {
    api: name,
    total: chunks.length,
    embedded: changedChunks.length,
    skipped,
    deleted: orphans.length,
  };
}

program.name('ingest').description('Index API documentation into Alexandria');

program
  .option('--api <name>', 'API name')
  .option('--spec <path>', 'Path to OpenAPI spec file')
  .option('--docs <dir>', 'Path to markdown docs directory')
  .option('--all', 'Ingest all APIs from apis.yml')
  .action(
    async (opts: {
      api?: string;
      spec?: string;
      docs?: string;
      all?: boolean;
    }) => {
      if (opts.all) {
        const registryPath = resolve('apis.yml');
        if (!existsSync(registryPath)) {
          console.error('Error: apis.yml not found');
          process.exit(1);
        }
        const entries = loadRegistry(registryPath);
        const results: IngestResult[] = [];
        let failed = 0;
        for (const entry of entries) {
          console.log(`Ingesting ${entry.name}...`);
          try {
            const result = await ingestApi(entry.name, entry.spec, entry.docs);
            results.push(result);
            console.log(
              `  ${result.total} chunks: ${result.embedded} embedded, ${result.skipped} skipped, ${result.deleted} deleted`,
            );
          } catch (error) {
            failed++;
            console.error(
              `  Error ingesting ${entry.name}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }

        const totals = results.reduce(
          (acc, r) => ({
            total: acc.total + r.total,
            embedded: acc.embedded + r.embedded,
            skipped: acc.skipped + r.skipped,
            deleted: acc.deleted + r.deleted,
          }),
          { total: 0, embedded: 0, skipped: 0, deleted: 0 },
        );
        console.log(
          `\nDone. ${results.length} API${results.length !== 1 ? 's' : ''} processed, ${totals.total} chunks (${totals.embedded} embedded, ${totals.skipped} skipped, ${totals.deleted} deleted)${failed > 0 ? `, ${failed} failed` : ''}`,
        );
      } else if (opts.api && opts.spec) {
        console.log(`Ingesting ${opts.api}...`);
        const result = await ingestApi(opts.api, opts.spec, opts.docs);
        console.log(
          `  ${result.total} chunks: ${result.embedded} embedded, ${result.skipped} skipped, ${result.deleted} deleted`,
        );
      } else {
        console.error('Error: provide --api and --spec, or --all');
        process.exit(1);
      }

      closeDb();
    },
  );

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  program.parse();
}
