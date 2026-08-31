import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="mb-8">
      <p className="skim-eyebrow">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="skim-heading">{title}</h1>
        {action}
      </div>
      {description ? (
        <p className="mt-2 max-w-2xl skim-body">{description}</p>
      ) : null}
    </header>
  );
}
