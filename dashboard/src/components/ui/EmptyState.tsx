import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  /** Optional SVG icon element shown above the title */
  icon?: ReactNode;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-border-pulse rounded-2xl border border-dashed border-surface-raised bg-surface/50 px-6 py-12 text-center sm:px-8 sm:py-16"
      )}
    >
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-muted text-cyan-bright">
          {icon}
        </div>
      ) : null}
      <p className={ui.eyebrow}>{eyebrow}</p>
      <h2 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">
        {title}
      </h2>
      <p className={cn("mx-auto mt-3 max-w-md", ui.body)}>{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
