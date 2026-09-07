import Link from "next/link";
import { DigestCard } from "@/components/digest/DigestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import * as ui from "@/lib/tailwind-ui";
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
            <Link href="/archive" className={ui.btnGhost}>
              Browse archive
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      {/* Feed header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={ui.eyebrow}>{digest.subject ?? "Daily briefing"}</p>
          <h1 className={`${ui.heading} mt-2`}>
            {formatDigestDate(digest.date)}
          </h1>
        </div>
        <div className="text-right">
          <p className={ui.meta}>{digest.story_count} stories</p>
          {sentLabel ? (
            <p className="mt-1 text-xs text-muted">Sent {sentLabel}</p>
          ) : null}
        </div>
      </div>

      {/* StoryStream timeline — desktop shows dashed rail, mobile stacks */}
      <div className="relative">
        {/* Dashed vertical rail — hidden on mobile */}
        <div
          className="absolute inset-y-0 left-[7.5rem] hidden w-px border-l border-dashed border-cyan-deep md:block"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-5">
          {digest.articles.map((article, index) => (
            <div key={article.id} className="group animate-on-scroll">
              {/* Layout: timestamp | rail dot | card */}
              <div className="flex items-start gap-0 md:gap-4">
                {/* Timestamp column (md+) */}
                <div className="hidden w-28 shrink-0 pt-5 text-right md:block">
                  <span className={ui.timelineTimestamp}>
                    {article.published_at
                      ? new Date(article.published_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : `#${index + 1}`}
                  </span>
                </div>

                {/* Rail dot (md+) */}
                <div className="relative hidden shrink-0 items-start pt-5 md:flex">
                  <div
                    className="h-2 w-2 rounded-full border-2 border-cyan-core bg-canvas ring-4 ring-canvas"
                    aria-hidden="true"
                  />
                </div>

                {/* Card */}
                <div className="min-w-0 flex-1">
                  <DigestCard article={article} rank={index + 1} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
