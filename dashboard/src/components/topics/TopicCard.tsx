import Link from "next/link";
import { TopicSparkline } from "./TopicSparkline";
import type { TopicStat } from "@/lib/topics-stats";

type TopicCardProps = {
  stat: TopicStat;
};

export function TopicCard({ stat }: TopicCardProps) {
  return (
    <Link
      href={`/topics/${stat.slug}`}
      className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-6 transition-all hover:border-foreground/30 hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-border bg-surface-raised px-3 py-1 font-mono text-xs font-medium text-foreground">
          {stat.label}
        </span>
        <span className="font-mono text-xs text-secondary">
          {stat.count} {stat.count === 1 ? "story" : "stories"}
        </span>
      </div>

      <div className="mt-8 opacity-80 transition-opacity group-hover:opacity-100">
        <TopicSparkline
          data={stat.weeklyData}
          color="text-foreground/70"
        />
      </div>
    </Link>
  );
}
