"use client";

import { useEffect } from "react";
import type { DashboardTheme } from "@/lib/auth/types";
import { useThemeStore } from "@/store/theme-store";

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: DashboardTheme;
};

/** Hydrates the Zustand theme store and syncs system preference changes. */
export function ThemeProvider({
  children,
  initialTheme = "dark",
}: ThemeProviderProps) {
  const hydrate = useThemeStore((state) => state.hydrate);
  const applyTheme = useThemeStore((state) => state.applyTheme);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    hydrate(initialTheme);
  }, [hydrate, initialTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, applyTheme]);

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
