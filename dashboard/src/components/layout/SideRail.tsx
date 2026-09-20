"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { isNavActive, MAIN_NAV_ITEMS } from "@/lib/nav";
import { isAdmin, type Profile } from "@/lib/auth/types";
import type { NavProfile } from "./UserMenu";

import { BrandMark } from "./BrandMark";

type SideRailProps = {
  profile: NavProfile | null;
  pendingApprovalCount?: number;
};

export function SideRail({ profile, pendingApprovalCount = 0 }: SideRailProps) {
  const pathname = usePathname();
  const showAdmin = profile && isAdmin(profile as Profile);
  const isOnboarding = pathname === "/onboarding";

  return (
    <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-surface-raised lg:bg-canvas">
      {/* Wordmark */}
      <div className="flex h-16 shrink-0 items-center border-b border-surface-raised px-6">
        <BrandMark />
      </div>

      {/* Onboarding helper banner */}
      {isOnboarding ? (
        <div className="m-4 rounded-2xl border border-hairline-soft bg-surface p-4 text-xs">
          <div className="flex items-center gap-1.5 font-normal text-on-canvas">
            <Sparkles size={14} />
            <span>Personalize Feed</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Select your topics to unlock your dashboard.
          </p>
        </div>
      ) : null}

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Main navigation">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={isOnboarding ? "#" : item.href}
              onClick={isOnboarding ? (e) => e.preventDefault() : undefined}
              tabIndex={isOnboarding ? -1 : undefined}
              aria-disabled={isOnboarding}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-normal transition-all duration-200",
                isOnboarding
                  ? "cursor-not-allowed opacity-40 select-none text-muted"
                  : active
                  ? "border border-hairline bg-surface text-on-canvas shadow-sm"
                  : "text-secondary hover:bg-surface/60 hover:text-on-canvas"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  isOnboarding
                    ? "text-muted"
                    : active
                    ? "text-on-canvas"
                    : "text-muted group-hover:text-on-canvas"
                )}
                aria-hidden
              />
              <span>{item.label}</span>
              {isOnboarding ? (
                <Lock size={12} className="ml-auto text-muted/60" aria-hidden />
              ) : null}
            </Link>
          );
        })}

        {/* Admin links */}
        {showAdmin ? (
          <div className="mt-4 border-t border-surface-raised pt-4">
            {pendingApprovalCount > 0 ? (
              <Link
                href="/admin"
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-full px-4 py-2.5 text-sm font-normal transition-all duration-200",
                  pathname === "/admin"
                    ? "border border-hairline bg-surface text-on-canvas"
                    : "text-secondary hover:bg-surface/60 hover:text-on-canvas"
                )}
              >
                <span>Admin</span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-on-canvas-soft px-1 text-[10px] font-normal text-on-pill">
                  {pendingApprovalCount > 9 ? "9+" : pendingApprovalCount}
                </span>
              </Link>
            ) : null}
            <Link
              href="/admin/stats"
              aria-current={pathname.startsWith("/admin/stats") ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-normal transition-all duration-200",
                pathname.startsWith("/admin/stats")
                  ? "border border-hairline bg-surface text-on-canvas"
                  : "text-secondary hover:bg-surface/60 hover:text-on-canvas"
              )}
            >
              Analytics
            </Link>
          </div>
        ) : null}
      </nav>

      {/* User info at bottom */}
      {profile ? (
        <div className="shrink-0 border-t border-surface-raised p-4">
          <div className="flex items-center gap-3 rounded-full border border-surface-raised bg-surface/50 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-on-dark/40 bg-surface text-xs font-normal text-on-canvas">
              {(profile.display_name ?? profile.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-normal text-on-canvas">
                {profile.display_name ?? profile.email}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
