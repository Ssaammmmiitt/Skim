import Link from "next/link";
import { TopicBadge } from "@/components/digest/TopicBadge";
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

/** Importance score color */
function scoreColor(score: number): string {
  if (score >= 8) return "text-cyan-bright";
  if (score >= 5) return "text-[#fbbf24]";
  return "text-muted";
}

type DigestCardProps = {
  article: DigestArticle;
  rank: number;
};

export function DigestCard({ article, rank }: DigestCardProps) {
  const isFeature = rank <= 3;

  return (
    <article
      className={cn(
        ui.cardInteractive,
        "group relative flex h-full flex-col overflow-hidden p-4 sm:p-5",
        // Cyan left accent stripe for top-3 stories
        isFeature && "border-l-[3px] border-l-cyan-core"
      )}
    >
      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={ui.meta}>#{rank}</span>
        <TopicBadge topic={article.topic} />
        <span className={ui.meta}>{formatSource(article.source)}</span>
        {article.published_at ? (
          <span className={ui.meta}>· {timeAgo(article.published_at)}</span>
        ) : null}
      </div>

      {/* Title */}
      <h2
        className={cn(
          ui.subheading,
          "mt-3 transition-colors group-hover:text-cyan-glow"
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
        <p className="mt-2 text-sm font-medium text-subtle sm:text-base">
          {article.key_takeaway}
        </p>
      ) : null}

      {/* Body text */}
      {article.insight ? (
        <p className={cn(ui.body, "mt-3 flex-1")}>{article.insight}</p>
      ) : article.summary ? (
        <p className={cn(ui.body, "mt-3 flex-1")}>{article.summary}</p>
      ) : (
        <div className="flex-1" />
      )}

      {/* Footer row */}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-surface-raised pt-4">
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(ui.link, "inline-flex min-h-[44px] items-center")}
          aria-label={`Read more about ${article.title}`}
        >
          Read more →
        </Link>
        {article.importance_score != null ? (
          <span
            className={cn(
              ui.meta,
              "tabular-nums",
              scoreColor(article.importance_score)
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
