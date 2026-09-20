import { PageContainer } from "@/components/layout/PageContainer";
import { StatsStrip } from "@/components/dashboard/StatsStrip";
import { FeaturedStory } from "@/components/dashboard/FeaturedStory";
import { QuickJumpGrid } from "@/components/dashboard/QuickJumpGrid";
import { TrendingTopics } from "@/components/dashboard/TrendingTopics";
import { getDashboardStats } from "@/lib/topics-stats";
import { checkChatRateLimit } from "@/lib/chat/rate-limit";
import { fetchLatestDigest } from "@/lib/digests";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard | Skim" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [stats, chatLimit, digest] = await Promise.all([
    getDashboardStats(supabase),
    checkChatRateLimit(user.id),
    fetchLatestDigest(supabase),
  ]);

  // Derive trending topics array from the digest we already fetched
  const topicCounts: Record<string, number> = {};
  for (const article of digest.articles) {
    if (article.topic) {
      topicCounts[article.topic] = (topicCounts[article.topic] ?? 0) + 1;
    }
  }
  const trendingTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([topicId, count]) => ({ topicId, count }))
    .slice(0, 5); // top 5

  const featuredStory = digest.articles[0] ?? null;

  return (
    <PageContainer>
      <div className="mb-8 sm:mb-10 animate-slide-up">
        <p className="font-sans text-xs uppercase tracking-wider text-muted">
          Editorial Wire · Intelligence Briefing
        </p>
        <h1 className="mt-2 font-display font-bold tracking-tight text-3xl leading-tight text-on-canvas sm:text-4xl lg:text-[38px]">
          Dashboard
        </h1>
        <p className="mt-2 font-sans text-sm leading-relaxed text-secondary sm:text-base">
          Your daily tech intelligence briefing and system overview.
        </p>
      </div>

      <div className="flex flex-col gap-8 sm:gap-10">
        <StatsStrip
          todayCount={stats.todayCount}
          streak={stats.streak}
          topTopic={stats.topTopic}
          chatRemaining={chatLimit.remaining}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeaturedStory article={featuredStory} />
          </div>

          <div className="flex flex-col gap-8">
            <QuickJumpGrid />
            <TrendingTopics topics={trendingTopics} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
