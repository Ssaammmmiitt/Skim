import Link from "next/link";
import { TopicBadge } from "@/components/digest/TopicBadge";
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
    <article className="group relative pl-12">
      <div className="skim-timeline-rank" aria-hidden>
        {rank}
      </div>

      <div className="skim-card-interactive p-6">
        <div className="flex flex-wrap items-center gap-2">
          <TopicBadge topic={article.topic} />
          <span className="skim-meta">{formatSource(article.source)}</span>
          {article.published_at ? (
            <span className="skim-meta">· {timeAgo(article.published_at)}</span>
          ) : null}
        </div>

        <h2 className="skim-subheading mt-3 transition-colors group-hover:text-cyan-glow">
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
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
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            {article.insight}
          </p>
        ) : article.summary ? (
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            {article.summary}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-4">
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="skim-link"
          >
            Read more →
          </Link>
          {article.importance_score != null ? (
            <span className="skim-meta">
              Score {article.importance_score.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
