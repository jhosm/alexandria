import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDb, closeDb } from '../db/index.js';
import { registerListApis } from './tools/list-apis.js';
import { registerSearchDocs } from './tools/search-docs.js';
import { registerGetApiEndpoints } from './tools/get-api-endpoints.js';

const server = new McpServer({
  name: 'alexandria',
  version: '0.1.0',
});

const db = getDb();

registerListApis(server, db);
registerSearchDocs(server, db);
registerGetApiEndpoints(server, db);

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
