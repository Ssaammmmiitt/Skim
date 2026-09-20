import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional badge shown next to the title (e.g. "Live", "8 stories") */
  badge?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-10 animate-slide-up", className)}>
      <p className={ui.eyebrow}>{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={ui.heading}>{title}</h1>
          {badge ? (
            <span className="translate-y-[-1px]">{badge}</span>
          ) : null}
        </div>
        {action}
      </div>
      {description ? (
        <p className={cn("mt-3 max-w-2xl", ui.body)}>{description}</p>
      ) : null}
    </header>
  );
}
