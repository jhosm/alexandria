import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApis, searchHybrid } from '../../db/queries.js';
import { embedQuery } from '../../ingestion/embedder.js';
import { CHUNK_TYPES, type SearchOptions } from '../../shared/types.js';
import { formatSearchResults } from '../format.js';

export function registerSearchApiDocs(
  server: McpServer,
  db: Database.Database,
) {
  server.registerTool(
    'search-api-docs',
    {
      title: 'Search API Documentation',
      description:
        'Search indexed API documentation — endpoints, schemas, request/response formats, and API behaviour. Use this when you need to find information about a specific API.',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        apiName: z
          .string()
          .optional()
          .describe('Filter results to a specific API by name'),
        types: z
          .array(z.enum(CHUNK_TYPES))
          .optional()
          .describe(
            'Filter by chunk types: overview, endpoint, schema, glossary, use-case, guide',
          ),
      },
    },
    async ({ query, apiName, types }) => {
      try {
        const apis = getApis(db);
        const options: SearchOptions = {};

        if (apiName) {
          const api = apis.find((a) => a.name === apiName);
          if (!api) {
            return {
              content: [{ type: 'text', text: `API "${apiName}" not found.` }],
              isError: true,
            };
          }
          options.apiId = api.id;
        }

        if (types) {
          options.types = types;
        }

        const queryEmbedding = await embedQuery(query);
        const results = searchHybrid(db, query, queryEmbedding, options);

        const apiNames = new Map(apis.map((a) => [a.id, a.name]));
        const text = formatSearchResults(results, apiNames);

        return { content: [{ type: 'text', text }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Search failed: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
