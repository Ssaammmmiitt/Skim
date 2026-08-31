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
        "w-full rounded-card border p-4 text-left transition",
        selected
          ? "border-cyan-core bg-cyan-muted"
          : "border-surface-raised bg-surface hover:border-cyan-deep"
      )}
    >
      <p className="font-medium capitalize text-foreground">{format}</p>
      <p className="mt-1 text-sm text-secondary">{DIGEST_FORMATS[format]}</p>
      <ul className="mt-3 space-y-1">
        {includes.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs text-secondary">
            <span className="text-cyan-bright">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </button>
  );
}
