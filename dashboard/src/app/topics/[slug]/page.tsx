import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DigestFeed } from "@/components/digest/DigestFeed";
import { getTopicFeed, SLUG_TO_TOPIC } from "@/lib/topics-stats";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const topicId = SLUG_TO_TOPIC[slug];
  const topicLabel = TOPIC_OPTIONS.find((t) => t.id === topicId)?.label ?? "Topic";
  return { title: `${topicLabel} | Skim` };
}

export default async function TopicDetailPage({ params }: Props) {
  const { slug } = await params;
  const topicId = SLUG_TO_TOPIC[slug];

  if (!topicId) {
    notFound();
  }

  const topicLabel = TOPIC_OPTIONS.find((t) => t.id === topicId)?.label ?? "Topic";
  const supabase = await createClient();
  const articles = await getTopicFeed(supabase, topicId);

  // We reuse DigestFeed which takes a DigestResponse shape
  const dummyDigest = {
    date: new Date().toISOString().split("T")[0],
    articles,
    sent_at: null,
    story_count: articles.length,
    subject: null,
  };

  return (
    <PageContainer>
      <div className="mb-8 md:mb-12 animate-slide-up">
        <p className="font-sans text-xs uppercase tracking-wider text-muted">
          Topic Wire Feed
        </p>
        <h1 className="mt-2 font-display font-bold tracking-tight text-3xl text-foreground sm:text-4xl">
          {topicLabel}
        </h1>
        <p className="mt-2 font-sans text-sm text-secondary sm:text-base">
          Top stories in this category from the last 7 days.
        </p>
      </div>

      <DigestFeed digest={dummyDigest} />
    </PageContainer>
  );
}
