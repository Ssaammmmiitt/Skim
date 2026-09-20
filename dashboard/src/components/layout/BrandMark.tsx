import { cn } from "@/lib/cn";
import { SkimLogo } from "./SkimLogo";

type BrandMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  hideText?: boolean;
};

export function BrandMark({ className, size = "md", hideText = false }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
      <SkimLogo size={size === "lg" ? 34 : size === "sm" ? 24 : 28} />
      {!hideText && (
        <span
          className={cn(
            "font-display font-bold tracking-tight text-foreground",
            size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg"
          )}
        >
          Skim
        </span>
      )}
    </span>
  );
}

