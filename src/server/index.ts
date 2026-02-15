import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDb, closeDb } from '../db/index.js';
import { getDimension } from '../ingestion/embedder.js';
import { registerListApis } from './tools/list-apis.js';
import { registerSearchDocs } from './tools/search-docs.js';
import { registerGetApiEndpoints } from './tools/get-api-endpoints.js';

const server = new McpServer({
  name: 'alexandria',
  version: '0.1.0',
});

let db;
try {
  db = getDb(undefined, getDimension());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Alexandria startup failed: ${message}\n`);
  process.exit(1);
}

registerListApis(server, db);
registerSearchDocs(server, db);
registerGetApiEndpoints(server, db);

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `Alexandria failed to start MCP transport: ${message}\n`,
  );
  closeDb();
  process.exit(1);
}

async function shutdown() {
  try {
    await server.close();
  } catch {
    // Best-effort server shutdown
  }
  try {
    closeDb();
  } catch {
    // Best-effort DB close
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
