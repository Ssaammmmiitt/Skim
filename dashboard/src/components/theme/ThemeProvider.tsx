"use client";

import { useEffect } from "react";
import type { DashboardTheme } from "@/lib/auth/types";
import { useThemeStore } from "@/store/theme-store";

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: DashboardTheme;
};

/** Hydrates the Zustand theme store with initial theme. */
export function ThemeProvider({
  children,
  initialTheme = "dark",
}: ThemeProviderProps) {
  const hydrate = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(initialTheme);
  }, [hydrate, initialTheme]);

  return children;
}

/** @deprecated Use useThemeStore directly. Kept for backward compatibility. */
export function useDashboardTheme() {
  const theme = useThemeStore((state) => state.theme);
  const resolved = useThemeStore((state) => state.resolved);
  const setTheme = useThemeStore((state) => state.setTheme);
  const saving = useThemeStore((state) => state.saving);
  return { theme, resolved, setTheme, saving };
}
