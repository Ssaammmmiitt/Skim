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

  return (
    <ThemeProvider initialTheme={dashboardTheme}>
      {showNav ? (
        <>
          <AppNav profile={profile} />
          <main className="flex-1 bg-canvas">{children}</main>
          <AppFooter />
        </>
      ) : (
        children
      )}
    </ThemeProvider>
  );
}
