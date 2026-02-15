import type { Api, Chunk, SearchResult } from '../shared/types.js';

export function formatApiList(apis: Api[]): string {
  if (apis.length === 0) return 'No APIs indexed yet.';

  const lines = apis.map((api) => {
    const version = api.version ? ` (v${api.version})` : '';
    return `- **${api.name}**${version}`;
  });
  return `## Indexed APIs\n\n${lines.join('\n')}`;
}

export function formatSearchResults(
  results: SearchResult[],
  apiNames: Map<string, string>,
): string {
  if (results.length === 0) return 'No results found for your query.';

  const sections = results.map((r) => {
    const source = apiNames.get(r.chunk.apiId) ?? r.chunk.apiId;
    return `### ${r.chunk.title}\n\`${r.chunk.type}\` · ${source}\n\n${r.chunk.content}`;
  });
  return `## Search Results\n\n${sections.join('\n\n---\n\n')}`;
}

export function formatEndpointList(
  apiName: string,
  endpoints: Chunk[],
): string {
  if (endpoints.length === 0) return `No endpoints found for "${apiName}".`;

  const lines = endpoints.map((chunk) => {
    const meta = chunk.metadata as
      | { method?: string; path?: string }
      | undefined;
    const method = meta?.method?.toUpperCase() ?? '';
    const path = meta?.path ?? '';
    const summary = chunk.title;
    if (method && path) {
      return `- **${method}** \`${path}\` — ${summary}`;
    }
    return `- ${summary}`;
  });
  return `## ${apiName} Endpoints\n\n${lines.join('\n')}`;
}
