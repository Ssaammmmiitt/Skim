"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type AdminPendingBannerProps = {
  count: number;
};

export function AdminPendingBanner({ count }: AdminPendingBannerProps) {
  const pathname = usePathname();

  if (count <= 0 || pathname.startsWith("/admin")) {
    return null;
  }

  const label =
    count === 1
      ? "1 user is waiting for approval"
      : `${count} users are waiting for approval`;

  return (
    <div
      className={cn(
        "border-b border-surface-raised bg-surface-raised/60 px-4 py-2.5 text-sm text-foreground",
        "flex flex-wrap items-center justify-center gap-3 sm:justify-between"
      )}
      role="status"
    >
      <p>
        <span className="font-mono text-xs uppercase font-medium text-wire">Admin notice:</span> {label}.
      </p>
      <Link
        href="/admin"
        className={cn(ui.btnPrimary, "px-4 py-1.5 text-xs")}
      >
        Review signups
      </Link>
    </div>
  );
}
