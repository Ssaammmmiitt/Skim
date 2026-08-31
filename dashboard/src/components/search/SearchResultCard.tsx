import Link from "next/link";
import { TopicBadge } from "@/components/digest/TopicBadge";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import type { SearchResult } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "Hacker News",
  techcrunch: "TechCrunch",
  arstechnica: "Ars Technica",
  theverge: "The Verge",
  mit_tech_review: "MIT Tech Review",
};

type SearchResultCardProps = {
  article: SearchResult;
  rank: number;
};

function formatSource(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, " ");
}

export function SearchResultCard({ article, rank }: SearchResultCardProps) {
  const pct =
    article.similarity != null ? Math.round(article.similarity * 100) : null;

  return (
    <article className={cn(ui.cardInteractive, "p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-muted">#{rank}</span>
        <TopicBadge topic={article.topic} />
        <span className={ui.meta}>{formatSource(article.source)}</span>
        {article.retrieval_method ? (
          <span className="rounded-full border border-surface-raised px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-glow">
            {article.retrieval_method}
          </span>
        ) : null}
        {pct != null ? (
          <span className="text-[10px] text-muted">{pct}% match</span>
        ) : null}
      </div>

      <h2 className="mt-3 text-lg font-bold leading-snug text-foreground sm:text-xl">
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-cyan-glow hover:underline"
        >
          {article.title}
        </Link>
      </h2>

      {article.key_takeaway ? (
        <p className="mt-2 text-sm font-medium text-subtle">
          {article.key_takeaway}
        </p>
      ) : null}

      {article.insight ? (
        <p className={cn(ui.body, "mt-2")}>{article.insight}</p>
      ) : article.summary ? (
        <p className={cn(ui.body, "mt-2")}>{article.summary}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-4">
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={ui.link}
        >
          Read article →
        </Link>
        {article.importance_score != null ? (
          <span className={ui.meta}>
            Score {article.importance_score.toFixed(1)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
