import { cn } from "@/lib/cn";

type ProgressBarProps = {
  /** 0–100 */
  value: number;
  /** Optional accessible label */
  label?: string;
  className?: string;
  /** If true, shows percentage text */
  showLabel?: boolean;
};

/**
 * Animated progress bar with cyan gradient fill.
 * Uses a CSS transition for smooth fill animation.
 */
export function ProgressBar({
  value,
  label = "Progress",
  className,
  showLabel = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {showLabel ? (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-xs text-secondary">{label}</span>
          <span className="font-mono text-xs font-semibold tabular-nums text-wire">
            {clamped.toFixed(0)}%
          </span>
        </div>
      ) : null}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-wire transition-all duration-700 ease-out"
          style={{
            width: `${clamped}%`,
          }}
        />
      </div>
    </div>
  );
}
