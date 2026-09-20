"use client";

import type { DigestTheme } from "@/lib/auth/types";
import {
  EMAIL_THEME_META,
  SAMPLE_PREVIEW_STORY,
  formatFlags,
} from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";

type EmailThemePreviewProps = {
  theme: DigestTheme;
  format: import("@/lib/auth/types").DigestFormat;
  selected?: boolean;
  onSelect?: () => void;
};

export function EmailThemePreview({
  theme,
  format,
  selected,
  onSelect,
}: EmailThemePreviewProps) {
  const meta = EMAIL_THEME_META[theme];
  const flags = formatFlags(format);
  const story = SAMPLE_PREVIEW_STORY;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition",
        selected
          ? "border-foreground bg-surface-raised"
          : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
      )}
    >
      <div
        className="overflow-hidden rounded-xl border"
        style={{
          borderColor: theme === "cyan" ? "#2c343f" : "#e4e4e7",
          backgroundColor: meta.preview.pageBg,
        }}
      >
        <div
          className="border-b px-3 py-2"
          style={{
            backgroundColor: meta.preview.headerBg,
            borderColor: meta.preview.accent,
          }}
        >
          <p
            className="text-[9px] font-normal uppercase tracking-wider"
            style={{ color: meta.preview.accent }}
          >
            Skim · {meta.label}
          </p>
          <p className="text-xs font-normal" style={{ color: meta.preview.text }}>
            Daily Digest
          </p>
        </div>
        <div className="space-y-1 p-3" style={{ backgroundColor: meta.preview.cardBg }}>
          <p
            className="text-[8px] font-normal uppercase"
            style={{ color: meta.preview.accent }}
          >
            #{story.rank} · {story.topic_label}
          </p>
          <p
            className="line-clamp-2 text-xs font-normal leading-tight"
            style={{ color: meta.preview.text }}
          >
            {story.title}
          </p>
          {flags.show_takeaways ? (
            <p className="line-clamp-1 text-[9px] font-normal" style={{ color: meta.preview.text }}>
              {story.key_takeaway}
            </p>
          ) : null}
          {flags.show_insights ? (
            <p className="line-clamp-2 text-[9px] font-normal" style={{ color: meta.preview.meta }}>
              {story.insight}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm font-normal capitalize text-foreground">{theme}</p>
      <p className="mt-0.5 text-xs font-normal text-secondary">{meta.description}</p>
      <ul className="mt-3 flex flex-wrap gap-1">
        {meta.traits.map((trait) => (
          <li
            key={trait}
            className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-[10px] font-normal text-secondary"
          >
            {trait}
          </li>
        ))}
      </ul>
    </button>
  );
}
