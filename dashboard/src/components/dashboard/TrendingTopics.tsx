import Link from "next/link";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { TOPIC_SLUGS } from "@/lib/topics-stats";
import { cn } from "@/lib/cn";

type TrendingTopicsProps = {
  // Ordered array of { topicId, count }
  topics: { topicId: string; count: number }[];
};

export function TrendingTopics({ topics }: TrendingTopicsProps) {
  if (!topics.length) return null;

  return (
    <div className="rounded-2xl border border-surface-raised bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-normal text-on-canvas">
          Trending Topics Today
        </h2>
        <Link
          href="/topics"
          className="text-xs font-normal text-muted transition hover:text-on-canvas"
        >
          View all →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {topics.map(({ topicId, count }) => {
          const t = TOPIC_OPTIONS.find((opt) => opt.id === topicId);
          if (!t) return null;

          return (
            <Link
              key={t.id}
              href={`/topics/${TOPIC_SLUGS[t.id]}`}
              className="group flex items-center gap-2 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs font-normal text-foreground transition-all duration-200 hover:border-foreground/40 hover:bg-surface-raised"
            >
              <span>{t.label}</span>
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full border border-hairline bg-surface-raised px-1 text-[10px] font-mono font-medium text-foreground">
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
