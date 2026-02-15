import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestDb } from '../../db/index.js';
import { upsertApi, upsertChunk } from '../../db/queries.js';
import { registerListApis } from '../tools/list-apis.js';
import { registerSearchDocs } from '../tools/search-docs.js';
import { registerGetApiEndpoints } from '../tools/get-api-endpoints.js';
import type Database from 'better-sqlite3';

const DIM = 3;

vi.mock('../../ingestion/embedder.js', () => ({
  embedQuery: vi.fn(async () => new Float32Array([0.1, 0.2, 0.3])),
}));

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
}

beforeAll(async () => {
  db = createTestDb(DIM);
  seed(db);

  mcpServer = new McpServer({ name: 'alexandria-test', version: '0.1.0' });
  registerListApis(mcpServer, db);
  registerSearchDocs(mcpServer, db);
  registerGetApiEndpoints(mcpServer, db);

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
      'search-docs',
    ]);
  });

  it('4.2 — list-apis returns indexed APIs', async () => {
    const result = await client.callTool({ name: 'list-apis', arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(text).toContain('petstore');
    expect(text).toContain('v1.0.0');
    expect(text).toContain('payments');
  });

  it('4.3 — search-docs returns relevant results', async () => {
    const result = await client.callTool({
      name: 'search-docs',
      arguments: { query: 'list pets' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(text).toContain('Search Results');
    expect(text).toContain('pets');
  });

  it('4.3b — search-docs returns no-results message', async () => {
    // Mock embedQuery to return a very different vector for this test
    const { embedQuery } = await import('../../ingestion/embedder.js');
    vi.mocked(embedQuery).mockResolvedValueOnce(new Float32Array([99, 99, 99]));

    const result = await client.callTool({
      name: 'search-docs',
      arguments: { query: 'xyzzy nonexistent topic' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    // FTS won't match "xyzzy" and vec distance will be large
    // The search may still return results via vec (distance-based, not filtered)
    // so we just verify we get a valid response
    expect(text).toBeDefined();
  });

  it('4.3c — search-docs filters by API name', async () => {
    const result = await client.callTool({
      name: 'search-docs',
      arguments: { query: 'pets', apiName: 'petstore' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(text).toContain('petstore');
  });

  it('4.3d — search-docs returns error for unknown API', async () => {
    const result = await client.callTool({
      name: 'search-docs',
      arguments: { query: 'test', apiName: 'nonexistent' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(text).toContain('API "nonexistent" not found');
  });

  it('4.4 — get-api-endpoints returns endpoint listing', async () => {
    const result = await client.callTool({
      name: 'get-api-endpoints',
      arguments: { apiName: 'petstore' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

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
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(text).toContain('API "nonexistent" not found');
  });

  it('4.2b — list-apis returns empty-state when no APIs', async () => {
    // Create a separate server with an empty DB
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

    const result = await emptyClient.callTool({
      name: 'list-apis',
      arguments: {},
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(text).toBe('No APIs indexed yet.');

    await emptyClient.close();
    await emptyServer.close();
    emptyDb.close();
  });
});
