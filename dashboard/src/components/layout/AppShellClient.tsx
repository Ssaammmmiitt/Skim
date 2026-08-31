"use client";

import { usePathname } from "next/navigation";
import { shouldShowNav } from "@/lib/nav";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { DashboardTheme } from "@/lib/auth/types";
import { AppFooter } from "./AppFooter";
import { AppNav } from "./AppNav";
import type { NavProfile } from "./UserMenu";

type AppShellClientProps = {
  children: React.ReactNode;
  profile: NavProfile | null;
  dashboardTheme: DashboardTheme;
};

export function AppShellClient({
  children,
  profile,
  dashboardTheme,
}: AppShellClientProps) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);
  const isChat = pathname === "/chat";

  return (
    <ThemeProvider initialTheme={dashboardTheme}>
      {showNav ? (
        <div className="flex min-h-dvh flex-col">
          <AppNav profile={profile} />
          <main className="flex min-h-0 flex-1 flex-col bg-canvas">
            {children}
          </main>
          {!isChat ? <AppFooter /> : null}
        </div>
      ) : (
        children
      )}
    </ThemeProvider>
  );
}
