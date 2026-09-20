import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigestArticle } from "@/lib/types";

export async function getUserBookmarks(
  supabase: SupabaseClient,
  userId: string
): Promise<DigestArticle[]> {
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select(
        `
        article_id,
        articles (
          id, title, url, source, published_at, summary, topic, importance_score, insight, key_takeaway
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Bookmarks] Could not fetch user bookmarks:", error.message);
      return [];
    }

    // Flatten the join
    return (data ?? [])
      .map((row: any) => row.articles as DigestArticle)
      .filter((a) => a != null);
  } catch (err) {
    console.warn("[Bookmarks] Exception fetching bookmarks:", err);
    return [];
  }
}

export async function getBookmarkedIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<number>> {
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("article_id")
      .eq("user_id", userId);

    if (error) {
      console.warn("[Bookmarks] Could not fetch bookmarked IDs:", error.message);
      return new Set();
    }

    return new Set((data ?? []).map((row) => row.article_id));
  } catch (err) {
    console.warn("[Bookmarks] Exception fetching bookmarked IDs:", err);
    return new Set();
  }
}
