import type { ChatSource } from "@/lib/types";
import { TopicBadge } from "@/components/TopicBadge";

type SourceCitationProps = {
  sources: ChatSource[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <details className="mt-3 rounded-xl border border-[#243044] bg-[#0f1419]/60">
      <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#22d3ee]">
        Sources ({sources.length})
      </summary>
      <ul className="space-y-2 border-t border-[#243044] px-4 py-3">
        {sources.map((source) => (
          <li key={source.id} className="text-sm">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#f0f9ff] hover:text-[#67e8f9] hover:underline"
            >
              {source.title}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <TopicBadge topic={source.topic} />
              <span className="text-xs text-[#64748b]">
                {source.source.replace(/_/g, " ")}
                {source.published_at
                  ? ` · ${formatDate(source.published_at)}`
                  : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
