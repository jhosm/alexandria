import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getApis, searchHybrid } from '../../db/queries.js';
import { embedQuery } from '../../ingestion/embedder.js';
import { CHUNK_TYPES, type SearchOptions } from '../../shared/types.js';
import { formatSearchResults } from '../format.js';

export function registerSearchDocs(server: McpServer, db: Database.Database) {
  server.registerTool(
    'search-docs',
    {
      title: 'Search Documentation',
      description:
        'Search standalone documentation (architecture, guides, etc.). Use this when you need to understand architecture concepts, design patterns, or project conventions. Optionally filter by doc source name.',
      inputSchema: {
        query: z.string().describe('Natural language search query'),
        name: z
          .string()
          .optional()
          .describe(
            'Filter by doc source name (e.g. "arch"). If omitted, searches all doc sources.',
          ),
        types: z
          .array(z.enum(CHUNK_TYPES))
          .optional()
          .describe(
            'Filter by chunk types: overview, endpoint, schema, glossary, use-case, guide',
          ),
      },
    },
    async ({ query, name, types }) => {
      try {
        const apis = getApis(db);
        // Doc sources are entries without a spec path
        const docSources = apis.filter((a) => !a.specPath);

        let apiIds: string[];
        if (name) {
          if (docSources.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No documentation indexed. Run ingestion first.',
                },
              ],
              isError: true,
            };
          }
          const source = docSources.find((a) => a.name === name);
          if (!source) {
            const available = docSources.map((d) => d.name).join(', ');
            return {
              content: [
                {
                  type: 'text',
                  text: `Doc source "${name}" not found. Available: ${available}`,
                },
              ],
              isError: true,
            };
          }
          apiIds = [source.id];
        } else {
          if (docSources.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No documentation indexed. Run ingestion first.',
                },
              ],
              isError: true,
            };
          }
          apiIds = docSources.map((d) => d.id);
        }

        const options: SearchOptions = { apiIds };
        if (types) options.types = types;

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
