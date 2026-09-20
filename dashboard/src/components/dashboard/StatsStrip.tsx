import { Newspaper, Trophy, Flame, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";

type StatsStripProps = {
  todayCount: number;
  streak: number;
  topTopic: string | null;
  chatRemaining: number;
};

export function StatsStrip({
  todayCount,
  streak,
  topTopic,
  chatRemaining,
}: StatsStripProps) {
  const topTopicLabel =
    TOPIC_OPTIONS.find((t) => t.id === topTopic)?.label ?? "Curated";

  const stats = [
    {
      label: "Latest Stories",
      value: todayCount,
      icon: Newspaper,
    },
    {
      label: "Top Topic",
      value: topTopicLabel,
      icon: Trophy,
    },
    {
      label: "Reading Streak",
      value: `${streak} days`,
      icon: Flame,
    },
    {
      label: "Chat Quota",
      value: `${chatRemaining} queries`,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-surface-raised bg-surface p-5 shadow-sm"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-on-dark/20 bg-surface/80 text-on-canvas"
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
            </div>
            <div>
              <p className="font-sans text-xs uppercase tracking-wider text-muted">
                {stat.label}
              </p>
              <p className="mt-1 font-display font-bold tracking-tight text-xl text-on-canvas sm:text-2xl">
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
