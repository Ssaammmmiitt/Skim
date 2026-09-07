import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, type Profile } from "@/lib/auth/types";

export async function GET() {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();

    if (!isAdmin(profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // 1. Pipeline runs (last 14)
    const { data: pipelineData, error: pipelineError } = await supabase
      .from("pipeline_runs")
      .select("run_date, articles_ingested, articles_embedded, duration_seconds")
      .order("run_date", { ascending: false })
      .limit(14);

    if (pipelineError) throw pipelineError;

    // 2. Digests (last 14)
    const { data: digestData, error: digestError } = await supabase
      .from("digests")
      .select("digest_date, story_count")
      .order("digest_date", { ascending: false })
      .limit(14);

    if (digestError) throw digestError;

    // 3. Articles (last 1000 to compute distributions)
    const { data: articlesData, error: articlesError } = await supabase
      .from("articles")
      .select("source, topic, importance_score")
      .not("topic", "is", null)
      .not("importance_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (articlesError) throw articlesError;

    // Aggregate Topics
    const topicMap: Record<string, number> = {};
    const sourceMap: Record<string, number> = {};
    const scoreMap: Record<number, number> = {};

    for (const article of articlesData || []) {
      // Topics
      const topic = article.topic || "Unknown";
      topicMap[topic] = (topicMap[topic] || 0) + 1;

      // Sources
      const source = article.source || "Unknown";
      sourceMap[source] = (sourceMap[source] || 0) + 1;

      // Scores
      const score = Math.floor(article.importance_score || 0);
      scoreMap[score] = (scoreMap[score] || 0) + 1;
    }

    const topicDistribution = Object.entries(topicMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sourceDistribution = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Fill score distribution 1-10
    const scoreDistribution = Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: scoreMap[i + 1] || 0,
    }));

    return NextResponse.json({
      pipeline: pipelineData?.reverse() || [],
      digests: digestData?.reverse() || [],
      topics: topicDistribution,
      sources: sourceDistribution,
      scores: scoreDistribution,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
