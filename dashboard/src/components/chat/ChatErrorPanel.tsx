"use client";

import type { ChatApiError } from "@/lib/types";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type ChatErrorPanelProps = {
  error: ChatApiError;
  onRetry?: () => void;
  className?: string;
};

const CODE_LABELS: Record<string, string> = {
  quota_exhausted: "Quota exhausted",
  rate_limited: "Rate limited",
  all_providers_failed: "All providers failed",
  config: "Not configured",
  empty_response: "Empty response",
  unknown: "Error",
};

function formatProvider(label: string): string {
  const [provider, model] = label.split(":");
  if (!model) return label;
  return `${provider} · ${model}`;
}

export function ChatErrorPanel({ error, onRetry, className }: ChatErrorPanelProps) {
  const codeLabel = error.error_code
    ? (CODE_LABELS[error.error_code] ?? "Error")
    : "Error";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface px-5 py-4",
        className
      )}
      role="alert"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-normal text-muted">
            {codeLabel}
          </p>
          <p className="mt-1 text-sm font-normal text-foreground">{error.error}</p>

          {error.retry_after_seconds != null && error.retry_after_seconds > 0 ? (
            <p className="mt-1 text-xs font-normal text-muted">
              Suggested wait: ~{error.retry_after_seconds}s before retrying
            </p>
          ) : null}

          {error.tried_providers && error.tried_providers.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-normal text-muted hover:text-secondary">
                Providers tried ({error.tried_providers.length})
              </summary>
              <ul className="mt-1 space-y-0.5 text-xs font-normal text-muted">
                {error.tried_providers.map((item) => (
                  <li key={item}>• {formatProvider(item)}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {error.details &&
          (process.env.NODE_ENV === "development" ||
            error.error_code === "config" ||
            error.error_code === "unknown") ? (
            <p className="mt-2 break-all font-mono text-[10px] text-muted">
              {error.details.slice(0, 280)}
              {error.details.length > 280 ? "…" : ""}
            </p>
          ) : null}
        </div>

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(ui.btnPrimary, "min-h-0 px-4 py-1.5 text-xs")}
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
