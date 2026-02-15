import SwaggerParser from '@apidevtools/swagger-parser';
import { createHash } from 'node:crypto';
import type { OpenAPIV3 } from 'openapi-types';
import type { Chunk } from '../shared/types.js';

type Doc = OpenAPIV3.Document;
type SchemaObject = OpenAPIV3.SchemaObject;
type ParameterObject = OpenAPIV3.ParameterObject;

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function renderSchema(schema: SchemaObject): string {
  const lines: string[] = [];

  if (schema.type === 'object' && schema.properties) {
    lines.push('- type: object');
    lines.push('  properties:');
    for (const [name, prop] of Object.entries(schema.properties)) {
      const p = prop as SchemaObject;
      const type = p.type ?? 'unknown';
      const desc = p.description ? ` - ${p.description}` : '';
      lines.push(`    - ${name} (${type})${desc}`);
    }
  } else if (schema.type === 'array' && 'items' in schema) {
    const items = schema.items as SchemaObject;
    lines.push(`- type: array of ${items.type ?? 'object'}`);
  } else if (schema.type) {
    lines.push(`- type: ${schema.type}`);
  }

  return lines.join('\n');
}

function buildOverviewChunk(doc: Doc, apiId: string): Chunk {
  const lines: string[] = [];
  lines.push(`# ${doc.info.title}`);
  lines.push(`\nVersion: ${doc.info.version}`);
  if (doc.info.description) {
    lines.push(`\n${doc.info.description}`);
  }
  if (doc.servers?.length) {
    lines.push('\n## Servers\n');
    for (const server of doc.servers) {
      const desc = server.description ? ` (${server.description})` : '';
      lines.push(`- ${server.url}${desc}`);
    }
  }

  const content = lines.join('\n');
  return {
    id: `${apiId}:overview`,
    apiId,
    type: 'overview',
    title: doc.info.title,
    content,
    contentHash: sha256(content),
  };
}

function buildEndpointChunks(doc: Doc, apiId: string): Chunk[] {
  const chunks: Chunk[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;

    const methods = [
      'get',
      'put',
      'post',
      'delete',
      'options',
      'head',
      'patch',
      'trace',
    ] as const;
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const lines: string[] = [];
      lines.push(`# ${method.toUpperCase()} ${path}`);
      if (operation.summary) {
        lines.push(`\n${operation.summary}`);
      }
      if (operation.description) {
        lines.push(`\n${operation.description}`);
      }

      // Parameters
      const params = operation.parameters as ParameterObject[] | undefined;
      if (params?.length) {
        lines.push('\n## Parameters\n');
        for (const param of params) {
          const required = param.required ? ' (required)' : '';
          const schema = param.schema as SchemaObject | undefined;
          const type = schema?.type ? ` : ${schema.type}` : '';
          lines.push(`- **${param.name}** [${param.in}]${type}${required}`);
        }
      }

      // Request body
      const requestBody = operation.requestBody as
        | OpenAPIV3.RequestBodyObject
        | undefined;
      if (requestBody?.content) {
        lines.push('\n## Request Body\n');
        for (const [mediaType, mediaObj] of Object.entries(
          requestBody.content,
        )) {
          lines.push(`Content-Type: ${mediaType}`);
          if (mediaObj.schema) {
            lines.push(renderSchema(mediaObj.schema as SchemaObject));
          }
        }
      }

      // Responses
      if (operation.responses) {
        lines.push('\n## Responses\n');
        for (const [status, response] of Object.entries(operation.responses)) {
          const resp = response as OpenAPIV3.ResponseObject;
          lines.push(`### ${status}: ${resp.description}`);
          if (resp.content) {
            for (const [mediaType, mediaObj] of Object.entries(resp.content)) {
              lines.push(`\nContent-Type: ${mediaType}`);
              if (mediaObj.schema) {
                lines.push(renderSchema(mediaObj.schema as SchemaObject));
              }
            }
          }
        }
      }

      const content = lines.join('\n');
      chunks.push({
        id: `${apiId}:endpoint:${method}:${path}`,
        apiId,
        type: 'endpoint',
        title: `${method.toUpperCase()} ${path}`,
        content,
        contentHash: sha256(content),
        metadata: {
          path,
          method,
          tags: operation.tags ?? [],
          operationId: operation.operationId ?? null,
        },
      });
    }
  }

  return chunks;
}

function buildSchemaChunks(doc: Doc, apiId: string): Chunk[] {
  const chunks: Chunk[] = [];
  const schemas = doc.components?.schemas;
  if (!schemas) return chunks;

  for (const [name, schema] of Object.entries(schemas)) {
    const s = schema as SchemaObject;
    const properties = s.properties;
    if (!properties) continue;

    const propertyCount = Object.keys(properties).length;
    if (propertyCount < 3) continue;

    const lines: string[] = [];
    lines.push(`# ${name}`);
    if (s.description) {
      lines.push(`\n${s.description}`);
    }
    lines.push('\n## Properties\n');
    for (const [propName, prop] of Object.entries(properties)) {
      const p = prop as SchemaObject;
      const type = p.type ?? 'unknown';
      const required = s.required?.includes(propName) ? ' (required)' : '';
      const desc = p.description ? ` - ${p.description}` : '';
      lines.push(`- **${propName}** (${type})${required}${desc}`);
    }

    const content = lines.join('\n');
    chunks.push({
      id: `${apiId}:schema:${name}`,
      apiId,
      type: 'schema',
      title: name,
      content,
      contentHash: sha256(content),
      metadata: {
        schemaName: name,
        propertyCount,
      },
    });
  }

  return chunks;
}

export async function parseOpenApiSpec(
  filePath: string,
  apiId: string,
): Promise<Chunk[]> {
  let raw: Record<string, unknown>;
  try {
    raw = (await SwaggerParser.dereference(filePath)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAPI spec for "${apiId}" at ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }

  if (
    !raw.openapi ||
    typeof raw.openapi !== 'string' ||
    !raw.openapi.startsWith('3.')
  ) {
    throw new Error(
      `Spec at ${filePath} is not OpenAPI 3.x (found: ${raw.openapi ?? raw.swagger ?? 'unknown'}). Only OpenAPI 3.x is supported.`,
    );
  }

  const doc = raw as unknown as Doc;
  const chunks: Chunk[] = [];
  chunks.push(buildOverviewChunk(doc, apiId));
  chunks.push(...buildEndpointChunks(doc, apiId));
  chunks.push(...buildSchemaChunks(doc, apiId));

  return chunks;
}
