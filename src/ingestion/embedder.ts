const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3-lite';
const BATCH_SIZE = 128;

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

  const json = await response.json();

  if (!json.data || !Array.isArray(json.data) || json.data.length !== texts.length) {
    throw new Error(
      `Voyage API returned unexpected response: expected ${texts.length} embeddings, got ${json.data?.length ?? 'no data field'}`,
    );
  }

  return json.data.map((d: { embedding?: number[] }, i: number) => {
    if (!Array.isArray(d.embedding) || d.embedding.length === 0) {
      throw new Error(`Voyage API returned invalid embedding at index ${i}`);
    }
    return new Float32Array(d.embedding);
  });
}

export async function embedDocuments(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const results: Float32Array[] = [];

  const totalBatches = Math.ceil(texts.length / BATCH_SIZE);
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    try {
      const embeddings = await callVoyageApi(batch, 'document');
      results.push(...embeddings);
    } catch (error) {
      throw new Error(
        `Embedding failed on batch ${batchNum}/${totalBatches} (texts ${i}-${i + batch.length - 1}): ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return results;
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const results = await callVoyageApi([text], 'query');
  if (results.length !== 1) {
    throw new Error(`Expected 1 query embedding, got ${results.length}`);
  }
  return results[0];
}
