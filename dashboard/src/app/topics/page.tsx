import { PageContainer } from "@/components/layout/PageContainer";
import { TopicCard } from "@/components/topics/TopicCard";
import { getTopicStats } from "@/lib/topics-stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Topics | Skim" };

export default async function TopicsIndexPage() {
  const supabase = await createClient();
  const stats = await getTopicStats(supabase);

  return (
    <PageContainer>
      <div className="mb-8 sm:mb-10 animate-slide-up">
        <p className="font-sans text-xs uppercase tracking-wider text-muted">
          Corpus Taxonomy
        </p>
        <h1 className="mt-2 font-display font-bold tracking-tight text-3xl leading-tight text-on-canvas sm:text-4xl">
          Topics Explorer
        </h1>
        <p className="mt-2 font-sans text-sm leading-relaxed text-secondary sm:text-base">
          Browse curated tech and AI stories by category across the last 7 days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <TopicCard key={stat.id} stat={stat} />
        ))}
      </div>
    </PageContainer>
  );
}
