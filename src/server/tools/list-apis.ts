import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { getApis } from '../../db/queries.js';
import { formatApiList } from '../format.js';

export function registerListApis(server: McpServer, db: Database.Database) {
  server.registerTool(
    'list-apis',
    {
      title: 'List APIs',
      description:
        'List all indexed API documentation sources with their names and versions',
    },
    () => {
      const apis = getApis(db);
      return { content: [{ type: 'text', text: formatApiList(apis) }] };
    },
  );
}
