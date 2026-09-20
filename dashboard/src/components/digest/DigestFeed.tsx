"use client";

import Link from "next/link";
import { DigestCard } from "@/components/digest/DigestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion } from "framer-motion";
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={ui.eyebrow}>{digest.subject ?? "Daily briefing"}</p>
          <h1 className="mt-2 font-display font-bold tracking-tight text-2xl leading-tight text-on-canvas sm:text-3xl lg:text-[34px]">
            {formatDigestDate(digest.date)}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-muted">{digest.story_count} stories</p>
          {sentLabel ? (
            <p className="mt-1 font-mono text-xs text-muted">Sent {sentLabel}</p>
          ) : null}
        </div>
      </div>

      <motion.div 
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
          }
        }}
        initial="hidden"
        animate="show"
      >
        {digest.articles.map((article, index) => (
          <motion.div
            key={article.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
            }}
            className="flex h-full"
          >
            <DigestCard article={article} rank={index + 1} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
