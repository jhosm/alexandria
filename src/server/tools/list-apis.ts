import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { getApis } from '../../db/queries.js';

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

      if (apis.length === 0) {
        return { content: [{ type: 'text', text: 'No APIs indexed yet.' }] };
      }

      const lines = apis.map((api) => {
        const version = api.version ? ` (v${api.version})` : '';
        return `- **${api.name}**${version}`;
      });
      const text = `## Indexed APIs\n\n${lines.join('\n')}`;

      return { content: [{ type: 'text', text }] };
    },
  );
}
