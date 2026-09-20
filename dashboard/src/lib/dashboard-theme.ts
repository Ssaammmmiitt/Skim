import type { DashboardTheme } from "@/lib/auth/types";

export { type DashboardTheme } from "@/lib/auth/types";

export const DASHBOARD_THEMES: Record<
  DashboardTheme,
  { label: string; description: string }
> = {
  dark: {
    label: "Dark",
    description: "Deep dark canvas — default",
  },
  light: {
    label: "Light",
    description: "Clean light canvas",
  },
};

export const THEME_STORAGE_KEY = "skim-dashboard-theme";

export function normalizeDashboardTheme(value: unknown): DashboardTheme {
  if (value === "light" || value === "dark") {
    return value;
  }
  return "dark";
}

export function resolveDashboardTheme(theme: DashboardTheme): "light" | "dark" {
  return theme === "light" ? "light" : "dark";
}

export function applyDashboardTheme(theme: DashboardTheme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveDashboardTheme(theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  document.documentElement.dataset.theme = resolved;
}
