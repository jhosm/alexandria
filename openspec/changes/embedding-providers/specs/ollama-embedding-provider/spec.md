## ADDED Requirements

### Requirement: Ollama embedding via native API

The Ollama provider SHALL POST to `{OLLAMA_URL}/api/embed` with a JSON body containing `model` and `input` (array of strings). It SHALL parse the response `embeddings` array into `Float32Array` instances.

#### Scenario: Embed documents via Ollama

- **WHEN** `embedDocuments` is called with 3 texts
- **THEN** it SHALL POST to `/api/embed` with `{ model, input: [text1, text2, text3] }` and return 3 Float32Array embeddings

#### Scenario: Embed a query via Ollama

- **WHEN** `embedQuery` is called with a single text
- **THEN** it SHALL POST to `/api/embed` with `{ model, input: [text] }` and return a single Float32Array

### Requirement: Ollama configuration

The provider SHALL read `OLLAMA_URL` (default `http://localhost:11434`) and `OLLAMA_MODEL` (default `nomic-embed-text`) from environment variables.

#### Scenario: Default configuration

- **WHEN** the Ollama provider is created with no `OLLAMA_URL` or `OLLAMA_MODEL` set
- **THEN** it SHALL use `http://localhost:11434` as the URL and `nomic-embed-text` as the model

#### Scenario: Custom configuration

- **WHEN** `OLLAMA_URL` is set to `http://gpu-server:11434` and `OLLAMA_MODEL` is set to `mxbai-embed-large`
- **THEN** the provider SHALL use those values for all API calls

### Requirement: Ollama dimension

The provider SHALL expose its `dimension` property based on the configured model. For `nomic-embed-text` the dimension SHALL be 768.

#### Scenario: Default model dimension

- **WHEN** the Ollama provider is created with the default model `nomic-embed-text`
- **THEN** `dimension` SHALL be 768

### Requirement: Ollama error handling

The provider SHALL throw descriptive errors when the Ollama server is unreachable or returns a non-200 response.

#### Scenario: Connection refused

- **WHEN** the Ollama server is not running
- **THEN** the provider SHALL throw an error indicating it could not connect to the Ollama server at the configured URL

#### Scenario: API error response

- **WHEN** the Ollama API returns a non-200 status
- **THEN** the provider SHALL throw an error including the status code and response body

### Requirement: Ollama empty input

The provider SHALL return an empty array when `embedDocuments` is called with no texts, without making an API call.

#### Scenario: Empty input

- **WHEN** `embedDocuments` is called with an empty array
- **THEN** it SHALL return an empty array without contacting the Ollama server
