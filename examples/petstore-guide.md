# Petstore API Guide

The Petstore API lets you manage a catalog of pets available for adoption. This guide covers authentication, common workflows, and quickstart examples.

## Authentication

All API requests require a valid API key passed in the `X-API-Key` header:

```
X-API-Key: your-api-key
```

Keys are issued per-organization. Contact your administrator to obtain one.

## Quick Start

List available pets with a simple GET request:

```bash
curl https://petstore.example.com/v1/pets \
  -H "X-API-Key: $API_KEY"
```

Create a new pet:

```bash
curl -X POST https://petstore.example.com/v1/pets \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Buddy", "tag": "dog"}'
```

## Error Handling

The API returns standard HTTP status codes. Error responses include a JSON body with `code`, `message`, and optional `details`:

```json
{
  "code": 404,
  "message": "Pet not found",
  "details": "No pet with ID 'abc-123' exists"
}
```

Common error codes:

- **400** — Invalid request (missing required fields, bad format)
- **401** — Missing or invalid API key
- **404** — Resource not found
- **500** — Internal server error
