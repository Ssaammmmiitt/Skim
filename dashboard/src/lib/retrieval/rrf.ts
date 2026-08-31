/**
 * Reciprocal Rank Fusion for hybrid retrieval.
 * score(d) = Σ weight / (k + rank_i(d))
 */

export type RankedItem = {
  id: number;
  rank: number;
  similarity?: number | null;
  fts_rank?: number | null;
  payload: Record<string, unknown>;
};

export type RrfOptions = {
  vectorWeight?: number;
  ftsWeight?: number;
  k?: number;
};

export type FusedResult = {
  id: number;
  rrf_score: number;
  similarity: number | null;
  fts_rank: number | null;
  payload: Record<string, unknown>;
};

export function reciprocalRankFusion(
  vectorItems: RankedItem[],
  ftsItems: RankedItem[],
  options: RrfOptions = {}
): FusedResult[] {
  const vectorWeight = options.vectorWeight ?? 0.55;
  const ftsWeight = options.ftsWeight ?? 0.45;
  const k = options.k ?? 60;

  const fused = new Map<number, FusedResult>();

  for (const item of vectorItems) {
    const contribution = vectorWeight / (k + item.rank);
    const existing = fused.get(item.id);
    if (existing) {
      existing.rrf_score += contribution;
      existing.similarity = item.similarity ?? existing.similarity;
      existing.payload = { ...existing.payload, ...item.payload };
    } else {
      fused.set(item.id, {
        id: item.id,
        rrf_score: contribution,
        similarity: item.similarity ?? null,
        fts_rank: item.fts_rank ?? null,
        payload: { ...item.payload },
      });
    }
  }

  for (const item of ftsItems) {
    const contribution = ftsWeight / (k + item.rank);
    const existing = fused.get(item.id);
    if (existing) {
      existing.rrf_score += contribution;
      existing.fts_rank = item.fts_rank ?? existing.fts_rank;
      existing.payload = { ...existing.payload, ...item.payload };
    } else {
      fused.set(item.id, {
        id: item.id,
        rrf_score: contribution,
        similarity: item.similarity ?? null,
        fts_rank: item.fts_rank ?? null,
        payload: { ...item.payload },
      });
    }
  }

  return Array.from(fused.values()).sort((a, b) => b.rrf_score - a.rrf_score);
}

/** Boost RRF by agent importance score (0–10). */
export function boostByImportance<T extends { importance_score: number | null; rrf_score: number | null }>(
  articles: T[]
): T[] {
  return [...articles]
    .map((article) => ({
      ...article,
      rrf_score:
        (article.rrf_score ?? 0) *
        (1 + (article.importance_score ?? 5) / 25),
    }))
    .sort((a, b) => (b.rrf_score ?? 0) - (a.rrf_score ?? 0));
}
