import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApis, getChunksByApi } from '../../db/queries.js';
import { formatEndpointList } from '../format.js';

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
      const text = formatEndpointList(apiName, endpoints);

      return { content: [{ type: 'text', text }] };
    },
  );
}
