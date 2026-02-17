# Embedding Models

Alexandria uses embedding models to convert text chunks into vectors for semantic search. This guide covers provider selection, model configuration, and the Transformers.js dtype/local-model options.

## Providers at a Glance

| Provider                 | Runs                      | Model                    | Dimensions | Setup                                                         |
| ------------------------ | ------------------------- | ------------------------ | ---------- | ------------------------------------------------------------- |
| `transformers` (default) | Locally, in-process       | BGE-large-en-v1.5 (ONNX) | 1024       | None — downloads model on first run                           |
| `ollama`                 | Locally, separate process | BGE-large                | 1024       | [Install Ollama](https://ollama.com), `ollama pull bge-large` |
| `voyage`                 | Cloud API                 | voyage-3-lite            | 1024       | `VOYAGE_API_KEY` required                                     |

Set the provider in `.env`:

```bash
EMBEDDING_PROVIDER=transformers   # transformers | ollama | voyage
```

Switching providers changes the vector space. After switching, re-index everything:

```bash
npm run ingest -- --all
```

## Transformers.js (Local ONNX)

The default provider runs entirely in-process using `@huggingface/transformers`. No external services needed.

### Dtype (Precision)

The `TRANSFORMERS_DTYPE` setting controls which ONNX model variant to load. This determines the precision/quantization of the model weights, which affects memory usage, speed, and quality.

```bash
TRANSFORMERS_DTYPE=fp32   # default if omitted
```

| Dtype   | File loaded            | Size (approx) | Quality                | Speed   | When to use                       |
| ------- | ---------------------- | ------------- | ---------------------- | ------- | --------------------------------- |
| `fp32`  | `model.onnx`           | ~1.3 GB       | Best                   | Slowest | Accuracy-critical, plenty of RAM  |
| `fp16`  | `model_fp16.onnx`      | ~650 MB       | Near-identical to fp32 | Faster  | Good default if RAM is limited    |
| `q8`    | `model_quantized.onnx` | ~330 MB       | Very close to fp32     | Fast    | Best balance of quality and speed |
| `q4`    | `model_q4.onnx`        | ~170 MB       | Slightly degraded      | Fastest | Low-memory environments           |
| `q4f16` | `model_q4f16.onnx`     | ~170 MB       | Similar to q4          | Fastest | Low-memory, fp16-capable hardware |

**How to choose:**

- **Start with `q8`** — negligible quality loss, ~4x smaller than fp32, noticeably faster.
- **Use `fp32`** only if you need maximum retrieval accuracy and have 2+ GB of RAM to spare.
- **Use `q4`** if you're on a constrained machine (CI, small VM, container).
- **`fp16`** is a middle ground but offers less size savings than `q8`.

Not all model repositories include every variant. Check which `.onnx` files exist in your model directory or on the HuggingFace model page.

### Local Model Path

By default, the library downloads the model from HuggingFace on first run and caches it. To use a pre-downloaded model instead:

```bash
TRANSFORMERS_MODEL_PATH=C:\Users\you\.cache\huggingface\transformers
```

When set, remote downloads are disabled. The directory must contain the model files directly (`config.json`, `tokenizer.json`, and the ONNX file matching your dtype).

**Expected directory structure:**

```
C:\Users\you\.cache\huggingface\transformers\
  config.json
  tokenizer.json
  tokenizer_config.json
  vocab.txt
  onnx\
    model.onnx            # ← loaded when dtype=fp32 (default)
    model_quantized.onnx  # ← loaded when dtype=q8
    model_fp16.onnx       # ← loaded when dtype=fp16
    ...
```

The library looks for ONNX files inside an `onnx/` subdirectory. If your model files are in the root instead of `onnx/`, move them:

```bash
# PowerShell
mkdir onnx
mv model*.onnx onnx/
```

### Pooling

Pooling reduces per-token embeddings into a single vector. Must match what the model was trained with.

```bash
TRANSFORMERS_POOLING=cls    # default
```

| Strategy | Description                      | Models                                        |
| -------- | -------------------------------- | --------------------------------------------- |
| `cls`    | Uses the `[CLS]` token embedding | BGE family (default)                          |
| `mean`   | Averages all token embeddings    | MiniLM, all-mpnet, most sentence-transformers |

Using the wrong pooling strategy produces poor search results without any error.

### Using a Different Model

You can swap the model entirely. Make sure `TRANSFORMERS_DIMENSION` and `TRANSFORMERS_POOLING` match.

```bash
TRANSFORMERS_MODEL=Xenova/all-MiniLM-L6-v2
TRANSFORMERS_DIMENSION=384
TRANSFORMERS_POOLING=mean
```

Common compatible models:

| Model                      | Dimensions | Pooling | Notes                                           |
| -------------------------- | ---------- | ------- | ----------------------------------------------- |
| `Xenova/bge-large-en-v1.5` | 1024       | cls     | Default. Strong general-purpose English.        |
| `Xenova/bge-base-en-v1.5`  | 768        | cls     | Smaller, faster, still good quality.            |
| `Xenova/all-MiniLM-L6-v2`  | 384        | mean    | Very fast, lower quality. Good for prototyping. |
| `Xenova/bge-small-en-v1.5` | 384        | cls     | Small BGE variant.                              |

After changing the model, re-index:

```bash
npm run ingest -- --all
```

## Ollama

Runs a model in a separate Ollama process. Useful if you already have Ollama running or want GPU acceleration.

```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434   # default
OLLAMA_MODEL=bge-large              # default
OLLAMA_DIMENSION=1024               # must match model
```

Pull the model first:

```bash
ollama pull bge-large
```

## Voyage AI

Cloud-hosted embeddings. Best quality, requires an API key, and sends data to Voyage's servers.

```bash
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=your-key-here
```

Uses `voyage-3-lite` (1024 dimensions). No other configuration needed.

## All Environment Variables

```bash
# Provider selection
EMBEDDING_PROVIDER=transformers         # transformers | ollama | voyage

# Transformers.js
TRANSFORMERS_MODEL=Xenova/bge-large-en-v1.5  # HuggingFace model ID
TRANSFORMERS_DIMENSION=1024                   # Must match model
TRANSFORMERS_POOLING=cls                      # cls | mean
TRANSFORMERS_DTYPE=fp32                       # fp32 | fp16 | q8 | q4 | q4f16
TRANSFORMERS_MODEL_PATH=                      # Local model directory (disables remote)

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=bge-large
OLLAMA_DIMENSION=1024

# Voyage AI
VOYAGE_API_KEY=
```
