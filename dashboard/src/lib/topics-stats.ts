import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigestArticle } from "@/lib/types";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";

export const TOPIC_SLUGS: Record<string, string> = Object.fromEntries(
  TOPIC_OPTIONS.map((t) => [t.id, t.id.replace(/_/g, "-")])
);

export const SLUG_TO_TOPIC: Record<string, string> = Object.fromEntries(
  TOPIC_OPTIONS.map((t) => [t.id.replace(/_/g, "-"), t.id])
);

export type TopicStat = {
  id: string;
  label: string;
  slug: string;
  count: number;
  weeklyData: { day: string; count: number }[];
};

export async function getTopicStats(
  supabase: SupabaseClient
): Promise<TopicStat[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("articles")
    .select("topic, digest_date")
    .gte("digest_date", sinceStr)
    .not("topic", "is", null);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { topic: string; digest_date: string }[];

  // Build per-topic, per-day counts
  const topicDayMap = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const topic = row.topic;
    const day = row.digest_date.split("T")[0];
    if (!topicDayMap.has(topic)) topicDayMap.set(topic, new Map());
    const dayMap = topicDayMap.get(topic)!;
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }

  return TOPIC_OPTIONS.filter((t) => t.id !== "other").map((t) => {
    const dayMap = topicDayMap.get(t.id) ?? new Map();
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const day = d.toISOString().split("T")[0];
      return { day, count: dayMap.get(day) ?? 0 };
    });
    const count = [...dayMap.values()].reduce((a, b) => a + b, 0);
    return {
      id: t.id,
      label: t.label,
      slug: TOPIC_SLUGS[t.id],
      count,
      weeklyData,
    };
  });
}

export async function getTopicFeed(
  supabase: SupabaseClient,
  topicId: string,
  limit = 12
): Promise<DigestArticle[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, url, source, published_at, summary, topic, importance_score, insight, key_takeaway"
    )
    .eq("topic", topicId)
    .gte("digest_date", sinceStr)
    .order("importance_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as DigestArticle[];
}

export async function getDashboardStats(supabase: SupabaseClient) {
  const [datesResult, latestDigestResult] = await Promise.all([
    supabase
      .from("digests")
      .select("digest_date, story_count")
      .order("digest_date", { ascending: false })
      .limit(60),
    supabase
      .from("digests")
      .select("digest_date")
      .order("digest_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const latestDate =
    latestDigestResult.data?.digest_date ??
    new Date().toISOString().split("T")[0];

  const [articlesResult, topTopicResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, topic", { count: "exact", head: false })
      .eq("digest_date", latestDate),
    supabase
      .from("articles")
      .select("topic")
      .eq("digest_date", latestDate)
      .not("topic", "is", null),
  ]);

  const todayCount = articlesResult.data?.length ?? 0;

  // Compute streak (active if most recent digest was today or yesterday UTC)
  const dates = (datesResult.data ?? []).map(
    (r: { digest_date: string }) => r.digest_date
  );
  let streak = 0;
  if (dates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    // If the latest digest is today or yesterday, count consecutive days
    if (dates[0] === today || dates[0] === yesterday) {
      const check = new Date(dates[0] + "T12:00:00Z");
      for (const d of dates) {
        const expected = check.toISOString().split("T")[0];
        if (d === expected) {
          streak++;
          check.setUTCDate(check.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  // Top topic for latest digest
  const topicCounts: Record<string, number> = {};
  for (const row of (topTopicResult.data ?? []) as { topic: string }[]) {
    if (row.topic) topicCounts[row.topic] = (topicCounts[row.topic] ?? 0) + 1;
  }
  const topTopic =
    Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { todayCount, streak, topTopic, latestDate };
}
