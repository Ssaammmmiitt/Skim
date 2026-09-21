"use client";

import type { DigestFontStyle, DigestTheme } from "@/lib/auth/types";
import {
  EMAIL_THEME_META,
  DIGEST_FONT_STYLES,
  SAMPLE_PREVIEW_STORY,
  formatFlags,
} from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";

type EmailThemePreviewProps = {
  theme: DigestTheme;
  format: import("@/lib/auth/types").DigestFormat;
  fontStyle?: DigestFontStyle;
  selected?: boolean;
  onSelect?: () => void;
};

export function EmailThemePreview({
  theme,
  format,
  fontStyle = "sans",
  selected,
  onSelect,
}: EmailThemePreviewProps) {
  const meta = EMAIL_THEME_META[theme];
  const flags = formatFlags(format);
  const story = SAMPLE_PREVIEW_STORY;
  const fontFamily = DIGEST_FONT_STYLES[fontStyle].fontFamily;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-2xl border p-4 text-left transition-all duration-200",
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
            : "border-border bg-surface scale-75 opacity-0 group-hover:scale-90 group-hover:opacity-30"
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

      {/* Mini email preview */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{
          borderColor: meta.preview.pageBg === "#0f1419" || meta.preview.pageBg.startsWith("#0") || meta.preview.pageBg.startsWith("#1")
            ? "#2c343f"
            : "#e4e4e7",
          backgroundColor: meta.preview.pageBg,
        }}
      >
        {/* Header */}
        <div
          className="border-b px-3 py-2"
          style={{
            backgroundColor: meta.preview.headerBg,
            borderColor: meta.preview.accent,
          }}
        >
          <p
            className="text-[9px] font-normal uppercase tracking-wider"
            style={{ color: meta.preview.accent, fontFamily }}
          >
            Skim · {meta.label}
          </p>
          <p className="text-xs font-normal" style={{ color: meta.preview.text, fontFamily }}>
            Daily Digest
          </p>
        </div>

        {/* Story card */}
        <div className="space-y-1 p-3" style={{ backgroundColor: meta.preview.cardBg }}>
          <p
            className="text-[8px] font-normal uppercase"
            style={{ color: meta.preview.accent }}
          >
            #{story.rank} · {story.topic_label}
          </p>
          <p
            className="line-clamp-2 text-xs font-normal leading-tight"
            style={{ color: meta.preview.text, fontFamily }}
          >
            {story.title}
          </p>
          {flags.show_takeaways ? (
            <p className="line-clamp-1 text-[9px] font-normal" style={{ color: meta.preview.text }}>
              {story.key_takeaway}
            </p>
          ) : null}
        </div>
      </div>

      {/* Label and description */}
      <p className="mt-3 text-sm font-normal capitalize text-foreground">{meta.label}</p>
      <p className="mt-0.5 text-xs font-normal text-secondary">{meta.description}</p>

      {/* Color swatches */}
      <div className="mt-3 flex items-center gap-1.5">
        {meta.swatches.map((color, i) => (
          <span
            key={i}
            className="h-3.5 w-3.5 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        ))}
      </div>
    </button>
  );
}
