import { pipeline } from "@xenova/transformers";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

type EmbedFn = (text: string) => Promise<number[]>;

let embedderPromise: Promise<EmbedFn> | null = null;

async function loadEmbedder(): Promise<EmbedFn> {
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

/**
 * Embed a query with all-MiniLM-L6-v2 — same model + space as the pipeline.
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
