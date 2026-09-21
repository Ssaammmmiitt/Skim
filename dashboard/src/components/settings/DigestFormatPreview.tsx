import type { DigestFormat } from "@/lib/auth/types";
import { DIGEST_FORMATS, FORMAT_INCLUDES } from "@/lib/digest-preferences";
import { cn } from "@/lib/cn";

type DigestFormatPreviewProps = {
  format: DigestFormat;
  selected?: boolean;
  onSelect?: () => void;
};

export function DigestFormatPreview({
  format,
  selected,
  onSelect,
}: DigestFormatPreviewProps) {
  const includes = FORMAT_INCLUDES[format];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-2xl border p-5 text-left transition-all duration-200",
        selected
          ? "border-foreground bg-surface-raised shadow-sm"
          : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
      )}
    >
      {/* Animated checkmark badge in top-right */}
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

      <p className="text-base font-normal capitalize text-foreground">{format}</p>
      <p className="mt-1 text-xs font-normal text-secondary">{DIGEST_FORMATS[format]}</p>
      <ul className="mt-4 space-y-1.5">
        {includes.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs font-normal text-secondary">
            <span className="text-foreground">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </button>
  );
}
