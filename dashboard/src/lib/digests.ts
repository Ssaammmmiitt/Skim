import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigestArticle, DigestResponse } from "@/lib/types";

const ARTICLE_COLUMNS =
  "id, title, url, source, published_at, summary, topic, importance_score, insight, key_takeaway";

export function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

export async function fetchDigestDates(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from("digests")
    .select("digest_date")
    .order("digest_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.digest_date as string);
}

export async function fetchDigest(
  supabase: SupabaseClient,
  date: string
): Promise<DigestResponse> {
  const { data: digest, error: digestError } = await supabase
    .from("digests")
    .select("digest_date, sent_at, article_ids, story_count, subject")
    .eq("digest_date", date)
    .maybeSingle();

  if (digestError) {
    throw new Error(digestError.message);
  }

  if (!digest) {
    return {
      date,
      articles: [],
      sent_at: null,
      subject: null,
      story_count: 0,
    };
  }

  const articleIds = (digest.article_ids ?? []) as number[];
  if (articleIds.length === 0) {
    return {
      date: digest.digest_date,
      articles: [],
      sent_at: digest.sent_at,
      subject: digest.subject,
      story_count: digest.story_count,
    };
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .in("id", articleIds);

  if (articlesError) {
    throw new Error(articlesError.message);
  }

  const byId = new Map(
    (articles ?? []).map((article) => [article.id, article as DigestArticle])
  );
  const ordered = articleIds
    .map((id) => byId.get(id))
    .filter((article): article is DigestArticle => article != null);

  return {
    date: digest.digest_date,
    articles: ordered,
    sent_at: digest.sent_at,
    subject: digest.subject,
    story_count: digest.story_count,
  };
}
