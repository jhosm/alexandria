import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApiSpecContent, getApis } from '../../db/queries.js';

export function registerGetApiSpec(server: McpServer, db: Database.Database) {
  server.registerTool(
    'get-api-spec',
    {
      title: 'Get API Spec',
      description: 'Return the full raw OpenAPI specification for an API',
      inputSchema: {
        apiName: z.string().describe('Name of the API'),
      },
    },
    ({ apiName }) => {
      try {
        const api = getApis(db).find((a) => a.name === apiName);
        if (!api) {
          return {
            content: [{ type: 'text', text: `API "${apiName}" not found.` }],
            isError: true,
          };
        }

        const specContent = getApiSpecContent(db, apiName);
        if (!specContent) {
          return {
            content: [
              {
                type: 'text',
                text: `No spec content stored for "${apiName}".`,
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: 'text', text: specContent }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to get spec: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
