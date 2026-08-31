const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

type EmbedFn = (text: string) => Promise<number[]>;
type EmbeddingMode = "local" | "hf" | "off";

let embedderPromise: Promise<EmbedFn> | null = null;

function resolveEmbeddingMode(): EmbeddingMode {
  const configured = process.env.SKIM_EMBEDDING_MODE?.trim().toLowerCase();
  if (configured === "local" || configured === "hf" || configured === "off") {
    return configured;
  }
  // Local MiniLM + onnxruntime is unreliable on Vercel serverless  -  prefer HF API.
  if (process.env.VERCEL) return "hf";
  return "local";
}

function normalizeVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return values;
  return values.map((value) => value / norm);
}

function meanPool(tokenEmbeddings: number[][]): number[] {
  const dim = tokenEmbeddings[0]?.length ?? 0;
  if (!dim) {
    throw new Error("HF embedding response was empty");
  }

  const pooled = new Array(dim).fill(0);
  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dim; i++) {
      pooled[i] += token[i] ?? 0;
    }
  }
  for (let i = 0; i < dim; i++) {
    pooled[i] /= tokenEmbeddings.length;
  }
  return normalizeVector(pooled);
}

function parseHfEmbeddingPayload(payload: unknown): number[] {
  if (!Array.isArray(payload)) {
    throw new Error("HF embedding response was not an array");
  }

  if (payload.length === EMBEDDING_DIM && payload.every((v) => typeof v === "number")) {
    return normalizeVector(payload as number[]);
  }

  if (
    Array.isArray(payload[0]) &&
    (payload[0] as unknown[]).every((v) => typeof v === "number")
  ) {
    return meanPool(payload as number[][]);
  }

  throw new Error(`Unexpected HF embedding shape (length ${payload.length})`);
}

async function hfEmbedQuery(text: string): Promise<number[]> {
  const token = process.env.HF_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "HF_TOKEN is required for chat embeddings on Vercel. Add it in Vercel env vars."
    );
  }

  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
  ];

  let lastError: string | null = null;

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      lastError = `HF ${response.status}: ${bodyText.slice(0, 240)}`;
      continue;
    }

    try {
      const payload = JSON.parse(bodyText) as unknown;
      const vector = parseHfEmbeddingPayload(payload);
      if (vector.length !== EMBEDDING_DIM) {
        throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${vector.length}`);
      }
      return vector;
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : "Failed to parse HF embedding response";
    }
  }

  throw new Error(lastError ?? "HF embedding request failed");
}

async function loadLocalEmbedder(): Promise<EmbedFn> {
  const { pipeline } = await import("@xenova/transformers");
  const pipe = await pipeline("feature-extraction", MODEL_ID, {
    quantized: true,
  });

  return async (text: string) => {
    const output = await pipe(text, { pooling: "mean", normalize: true });
    const values = Array.from(output.data as Float32Array);
    if (values.length !== EMBEDDING_DIM) {
      throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${values.length}`);
    }
    return values;
  };
}

async function loadEmbedder(): Promise<EmbedFn> {
  const mode = resolveEmbeddingMode();
  if (mode === "off") {
    throw new Error("Query embeddings are disabled (SKIM_EMBEDDING_MODE=off)");
  }
  if (mode === "hf") {
    return hfEmbedQuery;
  }

  const local = await loadLocalEmbedder();

  return async (text: string) => {
    try {
      return await local(text);
    } catch (err) {
      if (!process.env.HF_TOKEN?.trim()) {
        throw err;
      }
      console.warn(
        "Local embedding failed, falling back to Hugging Face API:",
        err instanceof Error ? err.message : err
      );
      return hfEmbedQuery(text);
    }
  };
}

/**
 * Embed a query with all-MiniLM-L6-v2  -  same model + space as the pipeline.
 * On Vercel, uses Hugging Face Inference API (set HF_TOKEN).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  if (!embedderPromise) {
    embedderPromise = loadEmbedder();
  }

  const embed = await embedderPromise;
  return embed(trimmed);
}

/** Reset cached model (for tests). */
export function resetEmbedderCache(): void {
  embedderPromise = null;
}
