import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type ErrorAlertProps = {
  message: string;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorAlert({
  message,
  className,
  onRetry,
  retryLabel = "Try again",
}: ErrorAlertProps) {
  return (
    <div
      className={cn(
        ui.errorBox,
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
      role="alert"
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(ui.btnGhost, "shrink-0 px-4 py-2 text-xs")}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
