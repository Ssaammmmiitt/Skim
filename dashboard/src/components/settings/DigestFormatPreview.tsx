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
        "w-full rounded-2xl border p-5 text-left transition",
        selected
          ? "border-foreground bg-surface-raised"
          : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
      )}
    >
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
