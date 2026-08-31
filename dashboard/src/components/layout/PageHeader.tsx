import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      <p className={ui.eyebrow}>{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className={ui.heading}>{title}</h1>
        {action}
      </div>
      {description ? (
        <p className={cn("mt-2 max-w-2xl", ui.body)}>{description}</p>
      ) : null}
    </header>
  );
}
