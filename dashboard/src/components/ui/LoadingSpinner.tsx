import { cn } from "@/lib/cn";

type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export function LoadingSpinner({
  label = "Loading…",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 py-8 text-sm text-muted",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-surface-raised border-t-cyan-bright"
        aria-hidden
      />
      {label}
    </div>
  );
}
