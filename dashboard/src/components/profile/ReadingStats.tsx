import { Bookmark, Flame, MessageSquare, BookOpen } from "lucide-react";

type ReadingStatsProps = {
  stats: {
    bookmarks: number;
    streak: number;
    chatQueries: number;
    topicsRead: number;
  };
};

export function ReadingStats({ stats }: ReadingStatsProps) {
  const items = [
    {
      label: "Bookmarks",
      value: stats.bookmarks,
      icon: Bookmark,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Current Streak",
      value: `${stats.streak} days`,
      icon: Flame,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "AI Queries",
      value: stats.chatQueries,
      icon: MessageSquare,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Topics Explored",
      value: stats.topicsRead,
      icon: BookOpen,
      color: "text-wire",
      bg: "bg-wire/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground">
              <Icon size={18} aria-hidden />
            </div>
            <div>
              <p className="text-3xl font-normal tracking-normal text-foreground">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-normal text-secondary">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
