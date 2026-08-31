import type { DashboardTheme } from "@/lib/auth/types";

export { type DashboardTheme } from "@/lib/auth/types";

export const DASHBOARD_THEMES: Record<
  DashboardTheme,
  { label: string; description: string }
> = {
  light: {
    label: "Light",
    description: "White canvas band with ink text — default Vodafone rhythm",
  },
  dark: {
    label: "Dark",
    description: "Ink surfaces with light text across the dashboard",
  },
  system: {
    label: "System",
    description: "Match your device light/dark setting",
  },
};

export const THEME_STORAGE_KEY = "skim-dashboard-theme";

export function normalizeDashboardTheme(value: unknown): DashboardTheme {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "light";
}

export function resolveDashboardTheme(theme: DashboardTheme): "light" | "dark" {
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme === "light" ? "light" : "dark";
}

export function applyDashboardTheme(theme: DashboardTheme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveDashboardTheme(theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  document.documentElement.dataset.theme = resolved;
}
