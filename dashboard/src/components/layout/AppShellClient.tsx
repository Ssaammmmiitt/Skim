"use client";

import { usePathname } from "next/navigation";
import { shouldShowNav } from "@/lib/nav";
import { AdminPendingBanner } from "@/components/layout/AdminPendingBanner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { DashboardTheme } from "@/lib/auth/types";
import { AppFooter } from "./AppFooter";
import { AppNav } from "./AppNav";
import type { NavProfile } from "./UserMenu";

type AppShellClientProps = {
  children: React.ReactNode;
  profile: NavProfile | null;
  dashboardTheme: DashboardTheme;
  pendingApprovalCount?: number;
};

export function AppShellClient({
  children,
  profile,
  dashboardTheme,
  pendingApprovalCount = 0,
}: AppShellClientProps) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);
  const isChat = pathname === "/chat";
  const hideFooter = isChat || pathname === "/settings";

  return (
    <ThemeProvider initialTheme={dashboardTheme}>
      {showNav ? (
        <div className="flex min-h-dvh flex-col">
          <AppNav
            profile={profile}
            pendingApprovalCount={pendingApprovalCount}
          />
          <AdminPendingBanner count={pendingApprovalCount} />
          <main className="flex min-h-0 flex-1 flex-col bg-canvas">
            {children}
          </main>
          {!hideFooter ? <AppFooter /> : null}
        </div>
      ) : (
        children
      )}
    </ThemeProvider>
  );
}
