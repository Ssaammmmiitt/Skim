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
    className: "border-border bg-surface-raised text-foreground",
  },
  vector: {
    label: "Semantic",
    className: "border-border bg-surface-raised text-foreground",
  },
  fts: {
    label: "Full-text",
    className: "border-border bg-surface-raised text-foreground",
  },
  keyword: {
    label: "Keyword",
    className: "border-border bg-surface-raised text-foreground",
  },
};

function RetrievalBadge({ method }: { method?: string }) {
  if (!method) return null;
  const info = METHOD_LABELS[method];
  if (!info) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-normal",
        info.className
      )}
    >
      {info.label}
    </span>
  );
}

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-normal text-muted">{pct}%</span>
    </div>
  );
}

export function SourceCitation({ sources, retrievalMethod }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <details className="mt-3 rounded-2xl border border-border bg-surface-raised/40">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs font-normal text-foreground">
        Sources ({sources.length})
        <RetrievalBadge method={retrievalMethod} />
      </summary>
      <ul className="space-y-3 border-t border-border px-4 py-3">
        {sources.map((source, idx) => (
          <li key={source.id} className="text-sm font-normal">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-normal text-secondary">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-normal text-foreground hover:underline"
                >
                  {source.title}
                </a>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <TopicBadge topic={source.topic} />
                  <span className="text-xs font-normal text-muted">
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
