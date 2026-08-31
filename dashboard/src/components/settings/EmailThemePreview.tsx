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
        "w-full rounded-card border p-3 text-left transition",
        selected
          ? "border-cyan-core ring-1 ring-cyan-core"
          : "border-surface-raised hover:border-cyan-deep"
      )}
    >
      <div
        className="overflow-hidden rounded-lg border"
        style={{
          borderColor: theme === "cyan" ? "#243044" : "#e4e4e7",
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
            className="text-[9px] uppercase tracking-wider"
            style={{ color: meta.preview.accent }}
          >
            Skim · {meta.label}
          </p>
          <p className="text-xs font-bold" style={{ color: meta.preview.text }}>
            Daily Digest
          </p>
        </div>
        <div className="space-y-1 p-3" style={{ backgroundColor: meta.preview.cardBg }}>
          <p
            className="text-[8px] uppercase"
            style={{ color: meta.preview.accent }}
          >
            #{story.rank} · {story.topic_label}
          </p>
          <p
            className="line-clamp-2 text-[11px] font-semibold leading-tight"
            style={{ color: meta.preview.text }}
          >
            {story.title}
          </p>
          {flags.show_takeaways ? (
            <p className="line-clamp-1 text-[9px]" style={{ color: meta.preview.text }}>
              {story.key_takeaway}
            </p>
          ) : null}
          {flags.show_insights ? (
            <p className="line-clamp-2 text-[9px]" style={{ color: meta.preview.meta }}>
              {story.insight}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm font-medium capitalize text-foreground">{theme}</p>
      <p className="text-xs text-secondary">{meta.description}</p>
      <ul className="mt-2 flex flex-wrap gap-1">
        {meta.traits.map((trait) => (
          <li
            key={trait}
            className="rounded-pill bg-surface-raised px-2 py-0.5 text-[10px] text-muted"
          >
            {trait}
          </li>
        ))}
      </ul>
    </button>
  );
}
