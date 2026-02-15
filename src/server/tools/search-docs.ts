import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApis, searchHybrid } from '../../db/queries.js';
import { embedQuery } from '../../ingestion/embedder.js';
import type { ChunkType, SearchOptions } from '../../shared/types.js';
import { formatSearchResults } from '../format.js';

const VALID_TYPES: ChunkType[] = [
  'overview',
  'endpoint',
  'schema',
  'glossary',
  'use-case',
  'guide',
];

export function registerSearchDocs(server: McpServer, db: Database.Database) {
  server.registerTool(
    'search-docs',
    {
      title: 'Search Documentation',
      description:
        'Search indexed API documentation using natural language. Returns relevant chunks ranked by hybrid search (vector + full-text).',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        apiName: z
          .string()
          .optional()
          .describe('Filter results to a specific API by name'),
        types: z
          .array(z.enum(VALID_TYPES as [ChunkType, ...ChunkType[]]))
          .optional()
          .describe(
            'Filter by chunk types: overview, endpoint, schema, glossary, use-case, guide',
          ),
      },
    },
    async ({ query, apiName, types }) => {
      const options: SearchOptions = {};

      if (apiName) {
        const api = getApis(db).find((a) => a.name === apiName);
        if (!api) {
          return {
            content: [{ type: 'text', text: `API "${apiName}" not found.` }],
          };
        }
        options.apiId = api.id;
      }

      if (types) {
        options.types = types;
      }

      const queryEmbedding = await embedQuery(query);
      const results = searchHybrid(db, query, queryEmbedding, options);

      const apis = getApis(db);
      const apiNames = new Map(apis.map((a) => [a.id, a.name]));
      const text = formatSearchResults(results, apiNames);

      return { content: [{ type: 'text', text }] };
    },
  );
}
