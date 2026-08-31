import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-core text-sm font-bold text-black"
        aria-hidden
      >
        S
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        Skim
      </span>
    </span>
  );
}
