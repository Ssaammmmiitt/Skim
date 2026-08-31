import Link from "next/link";
import { DigestCard } from "@/components/digest/DigestCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <EmptyState
        eyebrow={isToday ? "No digest yet" : "No digest found"}
        title={
          isToday
            ? "Today's briefing hasn't been sent yet"
            : `Nothing for ${formatDigestDate(digest.date)}`
        }
        description={
          isToday
            ? "The pipeline runs daily around 00:15 UTC. Check back after the next run, or browse past digests in the archive."
            : "Try another date in the archive, or wait for the pipeline to backfill this day."
        }
        action={
          isToday ? (
            <Link href="/archive" className="skim-btn-ghost inline-block">
              Browse archive
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="skim-eyebrow">
            {digest.subject ?? "Daily briefing"}
          </p>
          <h1 className="skim-heading mt-2">
            {formatDigestDate(digest.date)}
          </h1>
        </div>
        <div className="text-right text-sm text-muted">
          <p>{digest.story_count} stories</p>
          {sentLabel ? <p className="text-xs">Sent {sentLabel}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {digest.articles.map((article, index) => (
          <DigestCard key={article.id} article={article} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}
