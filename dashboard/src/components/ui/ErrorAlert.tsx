"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

function IconWarning() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-error"
    >
      <path
        d="M9 2L1 16h16L9 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 7v3M9 12.5v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ErrorAlertProps = {
  message: string;
  /** Optional short title above the message */
  title?: string;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** If true, shows a dismiss button */
  dismissible?: boolean;
};

export function ErrorAlert({
  message,
  title,
  className,
  onRetry,
  retryLabel = "Try again",
  dismissible = false,
}: ErrorAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        ui.errorBox,
        "flex flex-wrap items-start justify-between gap-3",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconWarning />
        <div className="min-w-0">
          {title ? (
            <p className="mb-0.5 text-sm font-semibold text-error">{title}</p>
          ) : null}
          <p className="text-sm">{message}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(ui.btnGhost, "shrink-0 px-4 py-2 text-xs")}
          >
            {retryLabel}
          </button>
        ) : null}
        {dismissible ? (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full opacity-60 hover:opacity-100"
            aria-label="Dismiss error"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
