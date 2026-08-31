import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "@/lib/chat/embeddings";
import { buildRetrievalQueries, type HistoryTurn } from "@/lib/retrieval/query";
import {
  boostByImportance,
  reciprocalRankFusion,
  type RankedItem,
} from "@/lib/retrieval/rrf";

export type RetrievedArticle = {
  id: number;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  insight: string | null;
  topic: string | null;
  importance_score: number | null;
  key_takeaway: string | null;
  published_at: string | null;
  similarity: number | null;
  fts_rank: number | null;
  rrf_score: number | null;
  retrieval_method: "hybrid" | "vector" | "fts" | "keyword";
};

export type HybridOptions = {
  limit?: number;
  vectorWeight?: number;
  ftsWeight?: number;
  history?: HistoryTurn[];
};

function vectorLiteral(embedding: number[]): string {
  return "[" + embedding.join(",") + "]";
}

function mapRow(
  row: Record<string, unknown>,
  method: RetrievedArticle["retrieval_method"]
): RetrievedArticle {
  return {
    id: row.id as number,
    title: row.title as string,
    url: row.url as string,
    source: row.source as string,
    summary: (row.summary as string) ?? null,
    insight: (row.insight as string) ?? null,
    topic: (row.topic as string) ?? null,
    importance_score: (row.importance_score as number) ?? null,
    key_takeaway: (row.key_takeaway as string) ?? null,
    published_at: (row.published_at as string) ?? null,
    similarity: (row.similarity as number) ?? null,
    fts_rank: (row.fts_rank as number) ?? null,
    rrf_score: (row.rrf_score as number) ?? null,
    retrieval_method: method,
  };
}

/**
 * Hybrid retrieval: MiniLM semantic search + Postgres FTS, fused with RRF.
 * Falls back gracefully: hybrid RPC → in-process RRF → vector → FTS → ILIKE.
 */
export async function hybridRetrieve(
  supabase: SupabaseClient,
  message: string,
  options: HybridOptions = {}
): Promise<RetrievedArticle[]> {
  const limit = options.limit ?? 8;
  const vectorWeight = options.vectorWeight ?? 0.55;
  const ftsWeight = options.ftsWeight ?? 0.45;
  const history = options.history ?? [];

  const { vectorQuery, ftsQuery } = buildRetrievalQueries(message, history);

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embedQuery(vectorQuery);
  } catch (err) {
    console.warn(
      "Query embedding failed, using FTS/keyword only:",
      err instanceof Error ? err.message : err
    );
  }

  if (queryEmbedding) {
    const hybridRpc = await supabase.rpc("search_articles_hybrid", {
      query_embedding: vectorLiteral(queryEmbedding),
      query_text: ftsQuery,
      match_count: limit,
      vector_weight: vectorWeight,
      fts_weight: ftsWeight,
      rrf_k: 60,
    });

    if (!hybridRpc.error && hybridRpc.data?.length > 0) {
      return boostByImportance(
        (hybridRpc.data as Record<string, unknown>[]).map((row) =>
          mapRow(row, "hybrid")
        )
      ).slice(0, limit);
    }

    if (hybridRpc.error) {
      console.warn("Hybrid RPC unavailable, using in-process RRF:", hybridRpc.error.message);
      const inProcess = await hybridRetrieveInProcess(
        supabase,
        queryEmbedding,
        ftsQuery,
        { limit, vectorWeight, ftsWeight }
      );
      if (inProcess.length > 0) return inProcess;
    }
  }

  if (queryEmbedding) {
    const vectorOnly = await vectorSearch(supabase, queryEmbedding, limit);
    if (vectorOnly.length > 0) return vectorOnly;
  }

  const ftsOnly = await ftsSearch(supabase, ftsQuery, limit);
  if (ftsOnly.length > 0) return ftsOnly;

  return keywordFallback(supabase, ftsQuery, limit);
}

async function hybridRetrieveInProcess(
  supabase: SupabaseClient,
  embedding: number[],
  ftsQuery: string,
  options: { limit: number; vectorWeight: number; ftsWeight: number }
): Promise<RetrievedArticle[]> {
  const [vectorRows, ftsRows] = await Promise.all([
    vectorSearchRaw(supabase, embedding, options.limit * 2),
    ftsSearchRaw(supabase, ftsQuery, options.limit * 2),
  ]);

  if (vectorRows.length === 0 && ftsRows.length === 0) return [];

  const vectorItems: RankedItem[] = vectorRows.map((row, index) => ({
    id: row.id as number,
    rank: index + 1,
    similarity: row.similarity as number,
    payload: row,
  }));

  const ftsItems: RankedItem[] = ftsRows.map((row, index) => ({
    id: row.id as number,
    rank: index + 1,
    fts_rank: row.fts_rank as number,
    payload: row,
  }));

  const fused = reciprocalRankFusion(vectorItems, ftsItems, {
    vectorWeight: options.vectorWeight,
    ftsWeight: options.ftsWeight,
  });

  return boostByImportance(
    fused.slice(0, options.limit).map((item) =>
      mapRow(
        {
          ...item.payload,
          similarity: item.similarity,
          fts_rank: item.fts_rank,
          rrf_score: item.rrf_score,
        },
        "hybrid"
      )
    )
  );
}

async function vectorSearchRaw(
  supabase: SupabaseClient,
  embedding: number[],
  limit: number
): Promise<Record<string, unknown>[]> {
  const rpc = await supabase.rpc("search_articles_vector", {
    query_embedding: vectorLiteral(embedding),
    match_count: limit,
    match_threshold: 0.2,
  });

  if (!rpc.error && rpc.data?.length > 0) {
    return rpc.data as Record<string, unknown>[];
  }

  const legacy = await supabase.rpc("search_similar_articles", {
    query_embedding: vectorLiteral(embedding),
    match_count: limit,
    match_threshold: 0.2,
  });

  if (legacy.error || !legacy.data) return [];

  const ids = (legacy.data as { id: number }[]).map((r) => r.id);
  return enrichArticles(supabase, ids, legacy.data as Record<string, unknown>[]);
}

async function ftsSearchRaw(
  supabase: SupabaseClient,
  query: string,
  limit: number
): Promise<Record<string, unknown>[]> {
  const rpc = await supabase.rpc("search_articles_fts", {
    query_text: query,
    match_count: limit,
  });

  if (!rpc.error && rpc.data) {
    return rpc.data as Record<string, unknown>[];
  }

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, url, source, summary, insight, topic, importance_score, key_takeaway, published_at"
    )
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .limit(limit);

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row, index) => ({
    ...row,
    fts_rank: 1 / (index + 1),
  }));
}

async function enrichArticles(
  supabase: SupabaseClient,
  ids: number[],
  partial: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("articles")
    .select(
      "id, title, url, source, summary, insight, topic, importance_score, key_takeaway, published_at"
    )
    .in("id", ids);

  if (!data) {
    return partial;
  }

  const byId = new Map(
    (data as Record<string, unknown>[]).map((row) => [row.id as number, row])
  );
  const simById = new Map(
    partial.map((row) => [row.id as number, row.similarity as number])
  );

  const results: Record<string, unknown>[] = [];
  for (const id of ids) {
    const full = byId.get(id);
    if (!full) continue;
    results.push({ ...full, similarity: simById.get(id) ?? null });
  }
  return results;
}

async function vectorSearch(
  supabase: SupabaseClient,
  embedding: number[],
  limit: number
): Promise<RetrievedArticle[]> {
  const rows = await vectorSearchRaw(supabase, embedding, limit);
  return rows.map((row) => mapRow(row, "vector"));
}

async function ftsSearch(
  supabase: SupabaseClient,
  query: string,
  limit: number
): Promise<RetrievedArticle[]> {
  const rows = await ftsSearchRaw(supabase, query, limit);
  return rows.map((row) => mapRow(row, "fts"));
}

async function keywordFallback(
  supabase: SupabaseClient,
  query: string,
  limit: number
): Promise<RetrievedArticle[]> {
  const pattern = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, url, source, summary, insight, topic, importance_score, key_takeaway, published_at"
    )
    .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) =>
    mapRow(row, "keyword")
  );
}
