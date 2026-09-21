"use client";

import type { DigestFontStyle } from "@/lib/auth/types";
import { DIGEST_FONT_STYLES } from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";

type FontStyleSelectorProps = {
  value: DigestFontStyle;
  onChange: (value: DigestFontStyle) => void;
};

export function FontStyleSelector({ value, onChange }: FontStyleSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(["sans", "serif", "mono"] as DigestFontStyle[]).map((key) => {
        const meta = DIGEST_FONT_STYLES[key];
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
            {/* Selected checkmark badge */}
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

            {/* Font sample */}
            <p
              className="mb-3 text-lg leading-snug text-foreground"
              style={{ fontFamily: meta.fontFamily }}
            >
              {meta.sampleHeadline}
            </p>

            {/* Label & description */}
            <p className="text-sm font-normal text-foreground">{meta.label}</p>
            <p className="mt-0.5 text-xs font-normal text-secondary">{meta.description}</p>

            {/* Font stack pill */}
            <p
              className="mt-3 truncate rounded-md bg-surface px-2 py-1 text-[10px] font-normal text-muted"
              style={{ fontFamily: meta.fontFamily }}
            >
              {key === "sans" ? "Inter, system-ui" : key === "serif" ? "Georgia, Times" : "Courier New"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
