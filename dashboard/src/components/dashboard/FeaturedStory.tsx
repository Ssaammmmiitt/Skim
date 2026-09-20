import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DigestArticle } from "@/lib/types";
import { TOPIC_OPTIONS } from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";

type FeaturedStoryProps = {
  article: DigestArticle | null;
};

export function FeaturedStory({ article }: FeaturedStoryProps) {
  if (!article) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface/40 p-8 text-center">
        <p className="font-display font-bold text-lg text-secondary">
          No featured wire story available
        </p>
        <p className="mt-1 font-mono text-xs text-muted">Check back after the next briefing pipeline run.</p>
      </div>
    );
  }

  const topicLabel =
    TOPIC_OPTIONS.find((t) => t.id === article.topic)?.label ?? "Topic";

  return (
    <article className="group relative flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-surface-raised bg-surface p-6 sm:p-8 shadow-sm transition-all duration-200 hover:border-hairline hover:shadow-md">
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Breaking / Featured Wire Beacon */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-wire/30 bg-wire/10 px-3 py-0.5 text-xs font-mono font-medium text-wire">
            <span className="h-1.5 w-1.5 rounded-full bg-wire animate-pulse" aria-hidden />
            FEATURED WIRE
          </span>
          <span className="rounded-full border border-border-on-dark bg-surface-raised px-3 py-0.5 text-xs font-mono text-on-canvas">
            {topicLabel}
          </span>
          <span className="font-mono text-xs text-muted">
            {article.source}
          </span>
        </div>

        <h2 className="mt-5 font-display font-bold tracking-tight text-2xl leading-tight text-on-canvas sm:text-3xl lg:text-[32px]">
          {article.title}
        </h2>

        {article.insight && (
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            {article.insight}
          </p>
        )}

        <div className="mt-auto pt-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-on-dark bg-on-canvas-soft px-5 py-2.5 text-sm font-medium text-on-pill transition-all duration-200 hover:bg-on-canvas hover:text-on-pill-inverted"
          >
            Read story on {article.source}
            <ArrowRight size={15} />
          </Link>
          {article.importance_score != null ? (
            <span className="font-mono text-xs text-muted">
              Score: {article.importance_score.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

