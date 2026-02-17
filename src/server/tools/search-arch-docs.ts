import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApis, searchHybrid } from '../../db/queries.js';
import { embedQuery } from '../../ingestion/embedder.js';
import { CHUNK_TYPES, type SearchOptions } from '../../shared/types.js';
import { formatSearchResults } from '../format.js';

export function registerSearchArchDocs(
  server: McpServer,
  db: Database.Database,
) {
  server.registerTool(
    'search-arch-docs',
    {
      title: 'Search Architecture Documentation',
      description:
        'Search architecture documentation. Use this when you need to understand architecture concepts, write code to expose an API, or write code to consume an API.',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        types: z
          .array(z.enum(CHUNK_TYPES))
          .optional()
          .describe(
            'Filter by chunk types: overview, endpoint, schema, glossary, use-case, guide',
          ),
      },
    },
    async ({ query, types }) => {
      try {
        const apis = getApis(db);
        const arch = apis.find((a) => a.name === 'arch');
        if (!arch) {
          return {
            content: [
              {
                type: 'text',
                text: 'Architecture documentation not indexed. Run ingestion first.',
              },
            ],
            isError: true,
          };
        }

        const options: SearchOptions = { apiId: arch.id };
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
