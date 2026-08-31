import type { ReactNode } from "react";

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
    <div className="skim-card-dashed px-8 py-16 text-center">
      <p className="skim-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-md skim-body">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
