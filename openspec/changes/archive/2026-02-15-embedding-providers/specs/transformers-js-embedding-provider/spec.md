## ADDED Requirements

### Requirement: Transformers.js in-process embedding

The Transformers.js provider SHALL use `@huggingface/transformers` to create a `feature-extraction` pipeline and embed texts with `pooling: 'mean'` and `normalize: true`. It SHALL convert the output tensor to `Float32Array` instances.

#### Scenario: Embed documents via Transformers.js

- **WHEN** `embedDocuments` is called with 3 texts
- **THEN** it SHALL run the feature-extraction pipeline on each text and return 3 Float32Array embeddings

#### Scenario: Embed a query via Transformers.js

- **WHEN** `embedQuery` is called with a single text
- **THEN** it SHALL run the feature-extraction pipeline and return a single Float32Array

### Requirement: Lazy pipeline initialization

The provider SHALL create the Transformers.js pipeline lazily on the first embedding call. The pipeline SHALL be reused for all subsequent calls within the same process.

#### Scenario: First call initializes the pipeline

- **WHEN** `embedDocuments` is called for the first time
- **THEN** it SHALL create the pipeline (which may download the model) before producing embeddings

#### Scenario: Subsequent calls reuse the pipeline

- **WHEN** `embedDocuments` is called a second time
- **THEN** it SHALL reuse the existing pipeline without re-initialization

### Requirement: Transformers.js configuration

The provider SHALL read `TRANSFORMERS_MODEL` from the environment (default `Xenova/all-MiniLM-L6-v2`).

#### Scenario: Default model

- **WHEN** the provider is created with no `TRANSFORMERS_MODEL` set
- **THEN** it SHALL use `Xenova/all-MiniLM-L6-v2`

#### Scenario: Custom model

- **WHEN** `TRANSFORMERS_MODEL` is set to `Xenova/bge-small-en-v1.5`
- **THEN** the provider SHALL use that model for the pipeline

### Requirement: Transformers.js dimension

The provider SHALL expose its `dimension` property based on the configured model. For `Xenova/all-MiniLM-L6-v2` the dimension SHALL be 384.

#### Scenario: Default model dimension

- **WHEN** the provider is created with the default model
- **THEN** `dimension` SHALL be 384

### Requirement: Transformers.js empty input

The provider SHALL return an empty array when `embedDocuments` is called with no texts, without initializing the pipeline.

#### Scenario: Empty input

- **WHEN** `embedDocuments` is called with an empty array
- **THEN** it SHALL return an empty array without creating the pipeline

### Requirement: Transformers.js error handling

The provider SHALL throw a descriptive error if the model fails to load or the pipeline produces unexpected output.

#### Scenario: Model load failure

- **WHEN** the configured model cannot be downloaded or loaded
- **THEN** the provider SHALL throw an error indicating the model name and the underlying failure reason
