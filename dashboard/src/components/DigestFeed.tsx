import Link from "next/link";
import { DigestCard } from "@/components/DigestCard";
import type { DigestResponse } from "@/lib/types";

function formatDigestDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatSentAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

type DigestFeedProps = {
  digest: DigestResponse;
  isToday?: boolean;
};

export function DigestFeed({ digest, isToday = false }: DigestFeedProps) {
  const sentLabel = formatSentAt(digest.sent_at);

  if (digest.articles.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#243044] bg-[#1a2332]/50 px-8 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
          {isToday ? "No digest yet" : "No digest found"}
        </p>
        <h2 className="mt-3 text-2xl font-bold text-[#f0f9ff]">
          {isToday
            ? "Today's briefing hasn't been sent yet"
            : `Nothing for ${formatDigestDate(digest.date)}`}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#94a3b8]">
          {isToday
            ? "The pipeline runs daily around 00:15 UTC. Check back after the next run, or browse past digests in the archive."
            : "Try another date in the archive, or wait for the pipeline to backfill this day."}
        </p>
        {isToday ? (
          <Link
            href="/archive"
            className="mt-6 inline-block rounded-full border border-[#06b6d4] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#22d3ee] hover:bg-[#164e63]"
          >
            Browse archive
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {digest.subject ? (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
              {digest.subject}
            </p>
          ) : (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
              Daily briefing
            </p>
          )}
          <h1 className="mt-2 text-3xl font-bold text-[#f0f9ff] sm:text-4xl">
            {formatDigestDate(digest.date)}
          </h1>
        </div>
        <div className="text-right text-sm text-[#64748b]">
          <p>{digest.story_count} stories</p>
          {sentLabel ? <p className="text-xs">Sent {sentLabel}</p> : null}
        </div>
      </div>

      <div className="relative border-l border-dashed border-[#0891b2] pl-4">
        <div className="flex flex-col gap-4">
          {digest.articles.map((article, index) => (
            <DigestCard key={article.id} article={article} rank={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
