import type { ReactNode } from "react";
import * as ui from "@/lib/tailwind-ui";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className={`${ui.cardDashed} px-6 py-12 text-center sm:px-8 sm:py-16`}>
      <p className={ui.eyebrow}>{eyebrow}</p>
      <h2 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">
        {title}
      </h2>
      <p className={`mx-auto mt-3 max-w-md ${ui.body}`}>{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
