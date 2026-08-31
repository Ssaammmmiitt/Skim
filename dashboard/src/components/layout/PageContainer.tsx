import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageSize = "sm" | "md" | "lg";

type PageContainerProps = {
  children: ReactNode;
  size?: PageSize;
  className?: string;
};

const SIZE_CLASS: Record<PageSize, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
};

export function PageContainer({
  children,
  size = "md",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 py-8 sm:py-10",
        SIZE_CLASS[size],
        className
      )}
    >
      {children}
    </div>
  );
}
