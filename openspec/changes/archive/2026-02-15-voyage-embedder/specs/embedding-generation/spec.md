## ADDED Requirements

### Requirement: Batch document embedding

The system SHALL provide an `embedDocuments(texts: string[])` function that sends texts to the Voyage AI API with `input_type: "document"` and `model: "voyage-3-lite"`, returning an array of 1024-dimension number arrays. It SHALL batch texts into groups of 128 per API request.

#### Scenario: Embed a batch of document texts

- **WHEN** `embedDocuments` is called with 10 texts
- **THEN** it SHALL make one API call to Voyage with `input_type: "document"` and return 10 embedding arrays each of length 1024

#### Scenario: Batch splitting for large input

- **WHEN** `embedDocuments` is called with 200 texts
- **THEN** it SHALL make 2 API calls (128 + 72 texts) and return 200 embedding arrays

#### Scenario: Empty input

- **WHEN** `embedDocuments` is called with an empty array
- **THEN** it SHALL return an empty array without making any API calls

### Requirement: Single query embedding

The system SHALL provide an `embedQuery(text: string)` function that sends a single text to the Voyage AI API with `input_type: "query"` and `model: "voyage-3-lite"`, returning a single 1024-dimension number array.

#### Scenario: Embed a search query

- **WHEN** `embedQuery` is called with "how to authenticate users"
- **THEN** it SHALL make one API call with `input_type: "query"` and return a single embedding array of length 1024

### Requirement: API key configuration

The embedder SHALL read the Voyage API key from the `VOYAGE_API_KEY` environment variable. If the variable is not set, functions SHALL throw an error with a descriptive message.

#### Scenario: Missing API key

- **WHEN** `embedDocuments` or `embedQuery` is called without `VOYAGE_API_KEY` set
- **THEN** it SHALL throw an error indicating the API key is missing

### Requirement: API error handling

When the Voyage API returns a non-200 response, the embedder SHALL throw an error including the HTTP status code and response body.

#### Scenario: API returns error

- **WHEN** the Voyage API returns a 429 rate limit error
- **THEN** the embedder SHALL throw an error containing the status code and error details

### Requirement: Correct API endpoint and payload format

The embedder SHALL POST to `https://api.voyageai.com/v1/embeddings` with JSON body containing `model`, `input` (array of strings), and `input_type`. The API key SHALL be sent in the `Authorization: Bearer` header.

#### Scenario: Correct request format

- **WHEN** an embedding request is made
- **THEN** the request SHALL use POST method, Content-Type application/json, Bearer token authorization, and include model, input, and input_type in the body
