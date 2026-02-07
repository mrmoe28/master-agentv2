/**
 * Local text embeddings via Transformers.js (all-MiniLM-L6-v2). No API key required.
 */

import { pipeline } from "@xenova/transformers";
import { EmbeddingError, getErrorMessage } from "@/utils/errors";

const modelId = "Xenova/all-MiniLM-L6-v2";

let pipe: Awaited<ReturnType<typeof pipeline>> | null = null;
let pipelineLoadError: Error | null = null;

/**
 * Get or initialize the embedding pipeline.
 * @throws EmbeddingError if pipeline initialization fails
 */
async function getPipeline() {
  // If we previously failed to load, throw the cached error
  if (pipelineLoadError) {
    throw new EmbeddingError(
      `Embedding pipeline previously failed to load: ${pipelineLoadError.message}`,
      pipelineLoadError
    );
  }

  if (!pipe) {
    try {
      console.log(`[Embeddings] Loading model ${modelId}...`);
      pipe = await pipeline("feature-extraction", modelId, {
        quantized: true,
      });
      console.log("[Embeddings] Model loaded successfully");
    } catch (err) {
      pipelineLoadError = err instanceof Error ? err : new Error(String(err));
      throw new EmbeddingError(
        `Failed to load embedding model ${modelId}: ${getErrorMessage(err)}`,
        err instanceof Error ? err : undefined
      );
    }
  }
  return pipe;
}

/**
 * Embed a single text. Returns normalized 384-dim vector.
 * @throws EmbeddingError if embedding fails
 */
export async function embedOne(text: string): Promise<number[]> {
  // Validate input
  if (!text || text.trim().length === 0) {
    console.warn("[Embeddings] Empty text provided, using placeholder");
    text = "[empty]";
  }

  try {
    const p = await getPipeline();
    const out = await p(text, { pooling: "mean", normalize: true } as any);
    return Array.from((out as { data: Float32Array }).data);
  } catch (err) {
    if (err instanceof EmbeddingError) throw err;

    throw new EmbeddingError(
      `Failed to embed text: ${getErrorMessage(err)}`,
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Embed a batch of texts. Returns array of 384-dim vectors.
 * @throws EmbeddingError if embedding fails
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Validate and sanitize inputs
  const sanitizedTexts = texts.map((t) => {
    if (!t || t.trim().length === 0) {
      return "[empty]";
    }
    return t;
  });

  try {
    const p = await getPipeline();
    const results: number[][] = [];

    for (const text of sanitizedTexts) {
      try {
        const out = await p(text, { pooling: "mean", normalize: true } as any);
        results.push(Array.from((out as { data: Float32Array }).data));
      } catch (textErr) {
        // Log individual text embedding error but continue with others
        console.error(`[Embeddings] Failed to embed text: ${getErrorMessage(textErr)}`);
        // Push zero vector as fallback for failed embedding
        results.push(new Array(384).fill(0));
      }
    }

    return results;
  } catch (err) {
    if (err instanceof EmbeddingError) throw err;

    throw new EmbeddingError(
      `Failed to embed batch of ${texts.length} texts: ${getErrorMessage(err)}`,
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * LanceDB embedding function interface: sourceColumn + embed(batch).
 */
export function createEmbeddingFunction(sourceColumn: string): {
  sourceColumn: string;
  embed: (batch: string[]) => Promise<number[][]>;
} {
  return {
    sourceColumn,
    embed: embedBatch,
  };
}
