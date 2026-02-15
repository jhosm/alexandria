# Payments API Glossary

Common terms and definitions used throughout the Payments API.

## API Key

An API key is a unique identifier used to authenticate requests to the API. Each API key is associated with a specific account and can be scoped to limit access to certain resources or operations.

API keys should be kept secret and never exposed in client-side code. If a key is compromised, it should be revoked immediately and a new one generated.

## Rate Limit

A rate limit is a restriction on the number of API requests a client can make within a given time window. Rate limits protect the API from abuse and ensure fair usage across all consumers.

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response. The `Retry-After` header indicates how long to wait before making another request.

## Webhook

A webhook is an HTTP callback that delivers real-time notifications when specific events occur. Instead of polling the API for changes, webhooks push data to your configured endpoint automatically.

Webhook payloads are signed with HMAC-SHA256 using your webhook secret. Always verify the signature before processing the payload to ensure it was sent by the API.

## Idempotency Key

An idempotency key is a unique value sent with a request to ensure that the same operation is not performed more than once. This is critical for payment operations where duplicate charges must be avoided.

Include the `Idempotency-Key` header with a UUID in any POST request. The API will return the cached response for duplicate keys within a 24-hour window.
