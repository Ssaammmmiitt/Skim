import Link from "next/link";
import { TopicBadge } from "@/components/digest/TopicBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { BookmarkButton } from "./BookmarkButton";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import type { DigestArticle } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  techcrunch: "TechCrunch",
  arstechnica: "Ars Technica",
  theverge: "The Verge",
  mit_tech_review: "MIT Tech Review",
};

function formatSource(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, " ");
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const published = new Date(iso);
  const diffMs = Date.now() - published.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return published.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DigestCardProps = {
  article: DigestArticle;
  rank: number;
};

export function DigestCard({ article, rank }: DigestCardProps) {
  return (
    <article
      className={cn(
        ui.cardInteractive,
        "group relative flex h-full flex-col overflow-hidden p-6 shadow-sm sm:p-7"
      )}
    >
      {/* Metadata row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {rank === 1 ? (
            <span className="inline-flex items-center rounded-full border border-wire/40 bg-wire/10 px-2 py-0.5 font-mono text-xs font-semibold text-wire">
              #01 WIRE
            </span>
          ) : (
            <span className={ui.meta}>#{rank < 10 ? `0${rank}` : rank}</span>
          )}
          <TopicBadge topic={article.topic} />
          <span className={ui.meta}>{formatSource(article.source)}</span>
          {article.published_at ? (
            <span className={ui.meta}>· {timeAgo(article.published_at)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <BookmarkButton articleId={article.id} />
          <CopyButton textToCopy={article.url} />
        </div>
      </div>

      {/* Title */}
      <h2
        className={cn(
          ui.subheading,
          "mt-4 font-display font-bold tracking-tight text-on-canvas transition-colors group-hover:text-muted"
        )}
      >
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {article.title}
        </Link>
      </h2>

      {/* Key takeaway */}
      {article.key_takeaway ? (
        <p className="mt-3 text-sm font-normal text-on-canvas/90 sm:text-base">
          {article.key_takeaway}
        </p>
      ) : null}

      {/* Body text */}
      {article.insight ? (
        <p className={cn(ui.body, "mt-3 flex-1 text-sm text-secondary sm:text-base")}>
          {article.insight}
        </p>
      ) : article.summary ? (
        <p className={cn(ui.body, "mt-3 flex-1 text-sm text-secondary sm:text-base")}>
          {article.summary}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      {/* Footer row */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-surface-raised pt-4">
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(ui.link, "inline-flex min-h-[44px] items-center")}
          aria-label={`Read full story: ${article.title}`}
        >
          Read full story →
        </Link>
        {article.importance_score != null ? (
          <span
            className={cn(
              ui.meta,
              "tabular-nums text-muted"
            )}
            title="Importance score"
          >
            ★ {article.importance_score.toFixed(1)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
