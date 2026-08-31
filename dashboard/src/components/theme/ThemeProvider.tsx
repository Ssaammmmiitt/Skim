"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DashboardTheme } from "@/lib/auth/types";
import {
  THEME_STORAGE_KEY,
  applyDashboardTheme,
  normalizeDashboardTheme,
  resolveDashboardTheme,
} from "@/lib/dashboard-theme";

type ThemeContextValue = {
  theme: DashboardTheme;
  resolved: "light" | "dark";
  setTheme: (theme: DashboardTheme) => void;
  saving: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: DashboardTheme;
};

export function ThemeProvider({
  children,
  initialTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<DashboardTheme>(initialTheme);
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  const [saving, setSaving] = useState(false);

  const apply = useCallback((next: DashboardTheme) => {
    applyDashboardTheme(next);
    setResolved(resolveDashboardTheme(next));
  }, []);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, apply]);

  const setTheme = useCallback(async (next: DashboardTheme) => {
    const normalized = normalizeDashboardTheme(next);
    setThemeState(normalized);
    apply(normalized);
    localStorage.setItem(THEME_STORAGE_KEY, normalized);

    setSaving(true);
    try {
      await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_theme: normalized }),
      });
    } catch {
      // Theme still applies locally.
    } finally {
      setSaving(false);
    }
  }, [apply]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, saving }),
    [theme, resolved, setTheme, saving]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useDashboardTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useDashboardTheme must be used within ThemeProvider");
  }
  return ctx;
}
