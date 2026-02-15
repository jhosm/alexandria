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
      try {
        const apis = getApis(db);
        return { content: [{ type: 'text', text: formatApiList(apis) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to list APIs: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
