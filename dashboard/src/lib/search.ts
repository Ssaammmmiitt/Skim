import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchResult } from "@/lib/types";

const DEFAULT_COLUMNS =
  "id, title, url, source, published_at, topic, importance_score, summary, insight";

type SearchOptions = {
  limit?: number;
  columns?: string;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

async function searchWithFullText(
  supabase: SupabaseClient,
  query: string,
  columns: string,
  limit: number
) {
  return supabase
    .from("articles")
    .select(columns)
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .order("published_at", { ascending: false })
    .limit(limit);
}

async function searchWithIlike(
  supabase: SupabaseClient,
  query: string,
  columns: string,
  limit: number
) {
  const pattern = `%${escapeIlike(query)}%`;
  return supabase
    .from("articles")
    .select(columns)
    .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
    .order("published_at", { ascending: false })
    .limit(limit);
}

export async function searchArticles(
  supabase: SupabaseClient,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const limit = options.limit ?? 20;
  const columns = options.columns ?? DEFAULT_COLUMNS;

  const fullTextResult = await searchWithFullText(
    supabase,
    trimmed,
    columns,
    limit
  );

  if (!fullTextResult.error) {
    return (fullTextResult.data ?? []) as unknown as SearchResult[];
  }

  const fallback = await searchWithIlike(supabase, trimmed, columns, limit);
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return (fallback.data ?? []) as unknown as SearchResult[];
}
