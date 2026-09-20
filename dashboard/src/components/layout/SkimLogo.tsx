import { cn } from "@/lib/cn";

type SkimLogoProps = {
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  wireDot?: boolean;
};

const SIZE_MAP = {
  xs: 20,
  sm: 24,
  md: 28,
  lg: 36,
  xl: 48,
};

export function SkimLogo({
  size = "md",
  className,
  wireDot = true,
}: SkimLogoProps) {
  const dim = typeof size === "number" ? size : SIZE_MAP[size];

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200 group-hover:scale-105", className)}
      aria-hidden="true"
    >
      {/* Outer rounded bezel */}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7"
        className="fill-surface stroke-hairline"
        strokeWidth="1.25"
      />

      {/* Top wire scan bar & curve */}
      <path
        d="M8.5 11h11a3.5 3.5 0 0 1 3.5 3.5v0a3.5 3.5 0 0 1-3.5 3.5H12"
        className="stroke-foreground"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom wire scan bar & curve */}
      <path
        d="M23.5 21h-11a3.5 3.5 0 0 1-3.5-3.5v0a3.5 3.5 0 0 1 3.5-3.5h8"
        className="stroke-foreground"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Live Wire Beacon Dot */}
      {wireDot && (
        <circle
          cx="23.5"
          cy="8.5"
          r="2.25"
          className="fill-wire"
        />
      )}
    </svg>
  );
}
