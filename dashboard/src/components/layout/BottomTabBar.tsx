"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavActive, MOBILE_TAB_ITEMS } from "@/lib/nav";

export function BottomTabBar() {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

  if (isOnboarding) {
    return (
      <nav
        aria-label="Mobile navigation (Locked)"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center border-t border-surface-raised bg-surface/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] text-xs font-normal text-secondary backdrop-blur-sm lg:hidden"
      >
        <span className="flex items-center gap-1.5 text-on-canvas">
          <span>✨ Personalize your feed to unlock navigation</span>
        </span>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-surface-raised bg-canvas/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm lg:hidden"
    >
      {MOBILE_TAB_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-normal transition-colors",
              active ? "text-on-canvas" : "text-muted hover:text-secondary"
            )}
          >
            <Icon
              size={20}
              strokeWidth={1.5}
              className={cn(
                "transition-transform duration-150",
                active && "scale-105"
              )}
              aria-hidden
            />
            <span>{item.label}</span>
            {/* Active indicator dot */}
            {active ? (
              <span className="absolute top-0 h-[2px] w-8 rounded-full bg-hairline" aria-hidden />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
