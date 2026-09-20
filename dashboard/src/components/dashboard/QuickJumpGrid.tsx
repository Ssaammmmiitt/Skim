import Link from "next/link";
import { Search, MessageSquare, Archive, Bookmark } from "lucide-react";

export function QuickJumpGrid() {
  const jumps = [
    {
      href: "/search",
      label: "Search",
      desc: "Find past stories",
      icon: Search,
    },
    {
      href: "/chat",
      label: "Chat",
      desc: "Ask the feed",
      icon: MessageSquare,
    },
    {
      href: "/archive",
      label: "Archive",
      desc: "Past digests",
      icon: Archive,
    },
    {
      href: "/bookmarks",
      label: "Saved",
      desc: "Bookmarked stories",
      icon: Bookmark,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {jumps.map((j) => {
        const Icon = j.icon;
        return (
          <Link
            key={j.href}
            href={j.href}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-surface-raised bg-surface p-5 transition-all duration-200 hover:border-hairline/60 hover:shadow-[0_0_12px_rgba(44,52,63,0.5)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-on-dark/20 bg-surface/80 text-on-canvas">
              <Icon size={18} strokeWidth={1.5} className="transition-transform group-hover:scale-105" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-normal text-on-canvas transition-colors">
                {j.label}
              </p>
              <p className="mt-0.5 text-xs font-normal text-muted">{j.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
