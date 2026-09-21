"use client";

import type { DigestSummaryStyle } from "@/lib/auth/types";
import { DIGEST_SUMMARY_STYLES } from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";

type SummaryStyleSelectorProps = {
  value: DigestSummaryStyle;
  onChange: (value: DigestSummaryStyle) => void;
};

export function SummaryStyleSelector({ value, onChange }: SummaryStyleSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(["prose", "bullet_points", "card"] as DigestSummaryStyle[]).map((key) => {
        const meta = DIGEST_SUMMARY_STYLES[key];
        const selected = value === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "group relative w-full rounded-2xl border p-5 text-left transition-all duration-200",
              selected
                ? "border-foreground bg-surface-raised shadow-sm"
                : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
            )}
          >
            {/* Selected checkmark */}
            <div
              className={cn(
                "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200",
                selected
                  ? "border-foreground bg-foreground text-canvas scale-100 opacity-100"
                  : "border-border bg-surface scale-75 opacity-0"
              )}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path
                  d="M2 5l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Icon */}
            <span className="mb-3 block text-2xl leading-none">{meta.icon}</span>

            {/* Mock content lines */}
            <div className="mb-4 space-y-1.5 rounded-xl border border-border bg-canvas p-3">
              {meta.mockLines.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-[11px] leading-relaxed text-secondary",
                    key === "prose" && "line-clamp-3"
                  )}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Label & description */}
            <p className="text-sm font-normal text-foreground">{meta.label}</p>
            <p className="mt-0.5 text-xs font-normal text-secondary">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
