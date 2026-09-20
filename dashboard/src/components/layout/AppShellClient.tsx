"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shouldShowNav } from "@/lib/nav";
import { AdminPendingBanner } from "@/components/layout/AdminPendingBanner";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SideRail } from "@/components/layout/SideRail";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { AppFooter } from "./AppFooter";
import { useBookmarkStore } from "@/store/bookmark-store";
import type { DashboardTheme } from "@/lib/auth/types";
import type { NavProfile } from "./UserMenu";

type AppShellClientProps = {
  children: React.ReactNode;
  profile: NavProfile | null;
  dashboardTheme: DashboardTheme;
  pendingApprovalCount?: number;
  bookmarkedIds?: number[];
};

export function AppShellClient({
  children,
  profile,
  dashboardTheme,
  pendingApprovalCount = 0,
  bookmarkedIds = [],
}: AppShellClientProps) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);
  const isChat = pathname === "/chat";
  const hideFooter = isChat || pathname === "/settings";

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 4); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    useBookmarkStore.getState().setInitial(bookmarkedIds);
  }, [bookmarkedIds]);

  return (
    <ThemeProvider initialTheme={dashboardTheme}>
      <ScrollProgress />

      {showNav ? (
        /*
         * Two-panel shell:
         *   Desktop (≥lg): SideRail (fixed left) + flex-col right (TopBar + main + footer)
         *   Tablet (md–lg): TopBar only (AppNav tablet strip removed)
         *   Mobile (<md):  TopBar + BottomTabBar pinned bottom
         */
        <div className="flex min-h-dvh">
          {/* ── Left rail ── */}
          <SideRail
            profile={profile}
            pendingApprovalCount={pendingApprovalCount}
          />

          {/* ── Right content column ── */}
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              profile={profile}
              pendingApprovalCount={pendingApprovalCount}
              scrolled={scrolled}
            />

            <AdminPendingBanner count={pendingApprovalCount} />

            <main
              className={[
                "flex min-h-0 flex-1 flex-col bg-canvas",
                /* Bottom padding so content isn't hidden behind the mobile tab bar */
                "pb-[calc(env(safe-area-inset-bottom,0px)+4rem)] lg:pb-0",
              ].join(" ")}
            >
              {children}
            </main>

            {!hideFooter ? (
              <div className="hidden lg:block">
                <AppFooter />
              </div>
            ) : null}
          </div>

          {/* ── Mobile bottom tab bar ── */}
          <BottomTabBar />
        </div>
      ) : (
        children
      )}

      <ToastProvider />
      <CommandPalette />
    </ThemeProvider>
  );
}
