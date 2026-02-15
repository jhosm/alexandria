const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3-lite';
const BATCH_SIZE = 128;

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error('VOYAGE_API_KEY environment variable is not set');
  }
  return key;
}

async function callVoyageApi(
  texts: string[],
  inputType: 'document' | 'query',
): Promise<Float32Array[]> {
  const apiKey = getApiKey();

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage API error (${response.status}): ${body}`);
  }

  const json = (await response.json()) as VoyageEmbeddingResponse;
  return json.data.map(d => new Float32Array(d.embedding));
}

export async function embedDocuments(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const results: Float32Array[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await callVoyageApi(batch, 'document');
    results.push(...embeddings);
  }

  return results;
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const [embedding] = await callVoyageApi([text], 'query');
  return embedding;
}
