import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageSize = "sm" | "md" | "lg" | "xl";

type PageContainerProps = {
  children: ReactNode;
  size?: PageSize;
  className?: string;
};

const SIZE_CLASS: Record<PageSize, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
};

export function PageContainer({
  children,
  size = "lg",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 md:px-8 2xl:px-12",
        SIZE_CLASS[size],
        className
      )}
    >
      {children}
    </div>
  );
}
