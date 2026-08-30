import Link from "next/link";
import type { DigestArticle } from "@/lib/types";
import { TopicBadge } from "@/components/TopicBadge";

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
      <div
        className="absolute left-0 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-[#0891b2] bg-[#0f1419] text-xs font-semibold text-[#22d3ee]"
        aria-hidden
      >
        {rank}
      </div>

      <div className="rounded-[20px] border border-[#243044] bg-[#1a2332] p-6 transition-colors group-hover:border-[#0891b2]">
        <div className="flex flex-wrap items-center gap-2">
          <TopicBadge topic={article.topic} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
            {formatSource(article.source)}
          </span>
          {article.published_at ? (
            <span className="text-[11px] uppercase tracking-wider text-[#64748b]">
              · {timeAgo(article.published_at)}
            </span>
          ) : null}
        </div>

        <h2 className="mt-3 text-xl font-bold leading-snug text-[#f0f9ff] transition-colors group-hover:text-[#67e8f9]">
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
          <p className="mt-2 text-sm font-medium text-[#cbd5e1]">
            {article.key_takeaway}
          </p>
        ) : null}

        {article.insight ? (
          <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
            {article.insight}
          </p>
        ) : article.summary ? (
          <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
            {article.summary}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-4">
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-wider text-[#22d3ee] hover:text-[#67e8f9]"
          >
            Read more →
          </Link>
          {article.importance_score != null ? (
            <span className="text-[11px] uppercase tracking-wider text-[#64748b]">
              Score {article.importance_score.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
