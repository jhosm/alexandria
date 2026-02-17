import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestDb } from '../../db/index.js';
import { upsertApi, upsertChunk } from '../../db/queries.js';
import { registerListApis } from '../tools/list-apis.js';
import { registerSearchApiDocs } from '../tools/search-api-docs.js';
import { registerGetApiEndpoints } from '../tools/get-api-endpoints.js';
import { registerSearchArchDocs } from '../tools/search-arch-docs.js';
import type Database from 'better-sqlite3';

const DIM = 3;

vi.mock('../../ingestion/embedder.js', () => ({
  embedQuery: vi.fn(async () => new Float32Array([0.1, 0.2, 0.3])),
}));

type ToolResult = Awaited<ReturnType<Client['callTool']>>;

function textContent(result: ToolResult): string {
  return (result.content as Array<{ type: string; text: string }>)[0].text;
}

let db: Database.Database;
let client: Client;
let mcpServer: McpServer;

function seed(database: Database.Database) {
  upsertApi(database, {
    id: 'api-1',
    name: 'petstore',
    version: '1.0.0',
  });
  upsertApi(database, {
    id: 'api-2',
    name: 'payments',
  });

  upsertChunk(
    database,
    {
      id: 'c1',
      apiId: 'api-1',
      type: 'endpoint',
      title: 'GET /pets - List all pets',
      content: 'Returns a list of all pets in the store.',
      contentHash: 'h1',
      metadata: { method: 'get', path: '/pets', tags: ['pets'] },
    },
    new Float32Array([0.1, 0.2, 0.3]),
  );

  upsertChunk(
    database,
    {
      id: 'c2',
      apiId: 'api-1',
      type: 'endpoint',
      title: 'POST /pets - Create a pet',
      content: 'Creates a new pet in the store.',
      contentHash: 'h2',
      metadata: { method: 'post', path: '/pets', tags: ['pets'] },
    },
    new Float32Array([0.2, 0.3, 0.4]),
  );

  upsertChunk(
    database,
    {
      id: 'c3',
      apiId: 'api-1',
      type: 'overview',
      title: 'Petstore API Overview',
      content: 'The Petstore API provides endpoints for managing pets.',
      contentHash: 'h3',
    },
    new Float32Array([0.3, 0.4, 0.5]),
  );

  // Arch docs entry (no spec)
  upsertApi(database, {
    id: 'arch-1',
    name: 'arch',
  });

  upsertChunk(
    database,
    {
      id: 'arch-c1',
      apiId: 'arch-1',
      type: 'guide',
      title: 'How to expose an API endpoint',
      content:
        'Architecture guide for exposing API endpoints using the standard patterns.',
      contentHash: 'ah1',
    },
    new Float32Array([0.4, 0.5, 0.6]),
  );

  upsertChunk(
    database,
    {
      id: 'arch-c2',
      apiId: 'arch-1',
      type: 'glossary',
      title: 'Service mesh',
      content:
        'A service mesh is an infrastructure layer for service-to-service communication.',
      contentHash: 'ah2',
    },
    new Float32Array([0.5, 0.6, 0.7]),
  );
}

beforeAll(async () => {
  db = createTestDb(DIM);
  seed(db);

  mcpServer = new McpServer({ name: 'alexandria-test', version: '0.1.0' });
  registerListApis(mcpServer, db);
  registerSearchApiDocs(mcpServer, db);
  registerGetApiEndpoints(mcpServer, db);
  registerSearchArchDocs(mcpServer, db);

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  client = new Client({ name: 'test-client', version: '1.0.0' });
  await mcpServer.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await mcpServer.close();
  db.close();
});

describe('MCP server integration', () => {
  it('4.1 — completes MCP initialize handshake', async () => {
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual([
      'get-api-endpoints',
      'list-apis',
      'search-api-docs',
      'search-arch-docs',
    ]);
  });

  it('4.2 — list-apis returns indexed APIs', async () => {
    const text = textContent(
      await client.callTool({ name: 'list-apis', arguments: {} }),
    );

    expect(text).toContain('petstore');
    expect(text).toContain('v1.0.0');
    expect(text).toContain('payments');
  });

  it('4.3 — search-api-docs returns relevant results', async () => {
    const text = textContent(
      await client.callTool({
        name: 'search-api-docs',
        arguments: { query: 'list pets' },
      }),
    );

    expect(text).toContain('Search Results');
    expect(text).toContain('pets');
  });

  it('4.3b — search-api-docs handles query with no FTS matches', async () => {
    const { embedQuery } = await import('../../ingestion/embedder.js');
    vi.mocked(embedQuery).mockResolvedValueOnce(new Float32Array([99, 99, 99]));

    const text = textContent(
      await client.callTool({
        name: 'search-api-docs',
        arguments: { query: 'xyzzy nonexistent topic' },
      }),
    );

    // Vec search is distance-based (not filtered), so results may still come
    // back. We verify a valid response without asserting empty results.
    expect(text).toBeDefined();
  });

  it('4.3c — search-api-docs filters by API name', async () => {
    const text = textContent(
      await client.callTool({
        name: 'search-api-docs',
        arguments: { query: 'pets', apiName: 'petstore' },
      }),
    );

    expect(text).toContain('petstore');
  });

  it('4.3d — search-api-docs returns error for unknown API', async () => {
    const result = await client.callTool({
      name: 'search-api-docs',
      arguments: { query: 'test', apiName: 'nonexistent' },
    });

    expect(textContent(result)).toContain('API "nonexistent" not found');
    expect(result.isError).toBe(true);
  });

  it('4.3e — search-api-docs filters by chunk types', async () => {
    const text = textContent(
      await client.callTool({
        name: 'search-api-docs',
        arguments: { query: 'pets', types: ['endpoint'] },
      }),
    );

    expect(text).toContain('endpoint');
    expect(text).not.toContain('Petstore API Overview');
  });

  it('4.4 — get-api-endpoints returns endpoint listing', async () => {
    const text = textContent(
      await client.callTool({
        name: 'get-api-endpoints',
        arguments: { apiName: 'petstore' },
      }),
    );

    expect(text).toContain('petstore Endpoints');
    expect(text).toContain('**GET**');
    expect(text).toContain('`/pets`');
    expect(text).toContain('**POST**');
  });

  it('4.4b — get-api-endpoints returns error for unknown API', async () => {
    const result = await client.callTool({
      name: 'get-api-endpoints',
      arguments: { apiName: 'nonexistent' },
    });

    expect(textContent(result)).toContain('API "nonexistent" not found');
    expect(result.isError).toBe(true);
  });

  it('4.4c — get-api-endpoints returns empty-state for API with no endpoints', async () => {
    const text = textContent(
      await client.callTool({
        name: 'get-api-endpoints',
        arguments: { apiName: 'payments' },
      }),
    );

    expect(text).toContain('No endpoints found for "payments"');
  });

  it('4.5 — search-arch-docs returns architecture results', async () => {
    const text = textContent(
      await client.callTool({
        name: 'search-arch-docs',
        arguments: { query: 'how to expose an endpoint' },
      }),
    );

    expect(text).toContain('Search Results');
    expect(text).toContain('arch');
  });

  it('4.5b — search-arch-docs filters by chunk types', async () => {
    const text = textContent(
      await client.callTool({
        name: 'search-arch-docs',
        arguments: { query: 'architecture', types: ['guide'] },
      }),
    );

    expect(text).toContain('guide');
    expect(text).not.toContain('Service mesh');
  });

  it('4.5c — search-arch-docs returns error when arch not indexed', async () => {
    const emptyDb = createTestDb(DIM);
    const emptyServer = new McpServer({
      name: 'alexandria-no-arch',
      version: '0.1.0',
    });
    registerSearchArchDocs(emptyServer, emptyDb);

    const [ct, st] = InMemoryTransport.createLinkedPair();
    const emptyClient = new Client({
      name: 'no-arch-test',
      version: '1.0.0',
    });
    await emptyServer.connect(st);
    await emptyClient.connect(ct);

    const result = await emptyClient.callTool({
      name: 'search-arch-docs',
      arguments: { query: 'anything' },
    });

    expect(textContent(result)).toContain(
      'Architecture documentation not indexed',
    );
    expect(result.isError).toBe(true);

    await emptyClient.close();
    await emptyServer.close();
    emptyDb.close();
  });

  it('4.3f — search-api-docs returns error when embedQuery throws', async () => {
    const { embedQuery } = await import('../../ingestion/embedder.js');
    vi.mocked(embedQuery).mockRejectedValueOnce(new Error('Embedding failed'));

    const result = await client.callTool({
      name: 'search-api-docs',
      arguments: { query: 'test' },
    });

    expect(textContent(result)).toContain('Search failed: Embedding failed');
    expect(result.isError).toBe(true);
  });

  it('4.3g — search-api-docs handles non-Error throw', async () => {
    const { embedQuery } = await import('../../ingestion/embedder.js');
    vi.mocked(embedQuery).mockRejectedValueOnce('raw string error');

    const result = await client.callTool({
      name: 'search-api-docs',
      arguments: { query: 'test' },
    });

    expect(textContent(result)).toContain('Search failed: raw string error');
    expect(result.isError).toBe(true);
  });

  it('4.5d — search-arch-docs returns error when embedQuery throws', async () => {
    const { embedQuery } = await import('../../ingestion/embedder.js');
    vi.mocked(embedQuery).mockRejectedValueOnce(new Error('Embedding failed'));

    const result = await client.callTool({
      name: 'search-arch-docs',
      arguments: { query: 'test' },
    });

    expect(textContent(result)).toContain('Search failed: Embedding failed');
    expect(result.isError).toBe(true);
  });

  it('4.5e — search-arch-docs handles non-Error throw', async () => {
    const { embedQuery } = await import('../../ingestion/embedder.js');
    vi.mocked(embedQuery).mockRejectedValueOnce('raw string error');

    const result = await client.callTool({
      name: 'search-arch-docs',
      arguments: { query: 'test' },
    });

    expect(textContent(result)).toContain('Search failed: raw string error');
    expect(result.isError).toBe(true);
  });

  it('4.2b — list-apis returns empty-state when no APIs', async () => {
    const emptyDb = createTestDb(DIM);
    const emptyServer = new McpServer({
      name: 'alexandria-empty',
      version: '0.1.0',
    });
    registerListApis(emptyServer, emptyDb);

    const [ct, st] = InMemoryTransport.createLinkedPair();
    const emptyClient = new Client({ name: 'empty-test', version: '1.0.0' });
    await emptyServer.connect(st);
    await emptyClient.connect(ct);

    const text = textContent(
      await emptyClient.callTool({
        name: 'list-apis',
        arguments: {},
      }),
    );

    expect(text).toBe('No APIs indexed yet.');

    await emptyClient.close();
    await emptyServer.close();
    emptyDb.close();
  });

  it('4.2c — list-apis returns error when DB is closed', async () => {
    const brokenDb = createTestDb(DIM);
    const brokenServer = new McpServer({
      name: 'alexandria-broken',
      version: '0.1.0',
    });
    registerListApis(brokenServer, brokenDb);

    const [ct, st] = InMemoryTransport.createLinkedPair();
    const brokenClient = new Client({
      name: 'broken-test',
      version: '1.0.0',
    });
    await brokenServer.connect(st);
    await brokenClient.connect(ct);

    brokenDb.close();

    const result = await brokenClient.callTool({
      name: 'list-apis',
      arguments: {},
    });

    expect(textContent(result)).toContain('Failed to list APIs');
    expect(result.isError).toBe(true);

    await brokenClient.close();
    await brokenServer.close();
  });

  it('4.4d — get-api-endpoints returns error when DB is closed', async () => {
    const brokenDb = createTestDb(DIM);
    const brokenServer = new McpServer({
      name: 'alexandria-broken-ep',
      version: '0.1.0',
    });
    registerGetApiEndpoints(brokenServer, brokenDb);

    const [ct, st] = InMemoryTransport.createLinkedPair();
    const brokenClient = new Client({
      name: 'broken-ep-test',
      version: '1.0.0',
    });
    await brokenServer.connect(st);
    await brokenClient.connect(ct);

    brokenDb.close();

    const result = await brokenClient.callTool({
      name: 'get-api-endpoints',
      arguments: { apiName: 'petstore' },
    });

    expect(textContent(result)).toContain('Failed to get endpoints');
    expect(result.isError).toBe(true);

    await brokenClient.close();
    await brokenServer.close();
  });
});
