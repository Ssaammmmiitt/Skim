import { cn } from "@/lib/cn";

type SpeechmarkOrbProps = {
  className?: string;
  size?: "sm" | "md";
};

export function SpeechmarkOrb({ className, size = "md" }: SpeechmarkOrbProps) {
  return (
    <span
      className={cn(
        "speechmark-orb",
        size === "sm" && "h-6 w-6 text-sm",
        className
      )}
      aria-hidden
    >
      &ldquo;
    </span>
  );
}

type BrandMarkProps = {
  className?: string;
  inverted?: boolean;
};

export function BrandMark({ className, inverted = false }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SpeechmarkOrb />
      <span
        className={cn(
          "text-lg font-extrabold uppercase tracking-display",
          inverted ? "text-on-dark" : "text-foreground"
        )}
      >
        Skim
      </span>
    </span>
  );
}
