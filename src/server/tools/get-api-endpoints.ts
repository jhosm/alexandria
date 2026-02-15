import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApis, getChunksByApi } from '../../db/queries.js';

export function registerGetApiEndpoints(
  server: McpServer,
  db: Database.Database,
) {
  server.registerTool(
    'get-api-endpoints',
    {
      title: 'Get API Endpoints',
      description:
        'List all endpoints for a specific API, showing HTTP method, path, and summary',
      inputSchema: {
        apiName: z.string().describe('Name of the API to list endpoints for'),
      },
    },
    ({ apiName }) => {
      const api = getApis(db).find((a) => a.name === apiName);
      if (!api) {
        return {
          content: [{ type: 'text', text: `API "${apiName}" not found.` }],
        };
      }

      const endpoints = getChunksByApi(db, api.id, 'endpoint');

      if (endpoints.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No endpoints found for "${apiName}".`,
            },
          ],
        };
      }

      const lines = endpoints.map((chunk) => {
        const meta = chunk.metadata as
          | { method?: string; path?: string }
          | undefined;
        const method = meta?.method?.toUpperCase() ?? '';
        const path = meta?.path ?? '';
        // Title is e.g. "GET /pets - List all pets"
        const summary = chunk.title;
        if (method && path) {
          return `- **${method}** \`${path}\` — ${summary}`;
        }
        return `- ${summary}`;
      });

      const text = `## ${apiName} Endpoints\n\n${lines.join('\n')}`;
      return { content: [{ type: 'text', text }] };
    },
  );
}
