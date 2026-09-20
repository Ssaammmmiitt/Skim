import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 group", className)}>
      <span
        className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface font-display font-bold text-sm text-on-canvas shadow-sm"
        aria-hidden
      >
        S
        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-wire" />
      </span>
      <span className="font-display font-bold text-lg tracking-tight text-on-canvas">
        Skim
      </span>
    </span>
  );
}

