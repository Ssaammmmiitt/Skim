import type { ChatSource } from "@/lib/types";
import { TopicBadge } from "@/components/digest/TopicBadge";
import { cn } from "@/lib/cn";

type SourceCitationProps = {
  sources: ChatSource[];
  retrievalMethod?: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const METHOD_LABELS: Record<string, { label: string; className: string }> = {
  hybrid: {
    label: "Hybrid",
    className: "border-purple-500/30 bg-purple-500/20 text-purple-300",
  },
  vector: {
    label: "Semantic",
    className: "border-cyan-500/30 bg-cyan-500/20 text-cyan-300",
  },
  fts: {
    label: "Full-text",
    className: "border-blue-500/30 bg-blue-500/20 text-blue-300",
  },
  keyword: {
    label: "Keyword",
    className: "border-amber-500/30 bg-amber-500/20 text-amber-300",
  },
};

function RetrievalBadge({ method }: { method?: string }) {
  if (!method) return null;
  const info = METHOD_LABELS[method];
  if (!info) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-medium",
        info.className
      )}
    >
      {info.label}
    </span>
  );
}

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const barColor =
    pct >= 70 ? "bg-success" : pct >= 40 ? "bg-cyan-bright" : "bg-warning";

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-pill bg-surface">
        <div
          className={cn("h-full rounded-pill", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted">{pct}%</span>
    </div>
  );
}

export function SourceCitation({ sources, retrievalMethod }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <details className="mt-3 rounded-xl border border-surface-raised bg-canvas/60">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cyan-bright">
        Sources ({sources.length})
        <RetrievalBadge method={retrievalMethod} />
      </summary>
      <ul className="space-y-2.5 border-t border-surface-raised px-4 py-3">
        {sources.map((source, idx) => (
          <li key={source.id} className="text-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-secondary">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-cyan-glow hover:underline"
                >
                  {source.title}
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <TopicBadge topic={source.topic} />
                  <span className="text-xs text-muted">
                    {source.source.replace(/_/g, " ")}
                    {source.published_at
                      ? ` · ${formatDate(source.published_at)}`
                      : null}
                  </span>
                  {source.similarity != null && source.similarity > 0 ? (
                    <SimilarityBar value={source.similarity} />
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
