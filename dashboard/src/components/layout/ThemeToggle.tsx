"use client";

import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useThemeStore } from "@/store/theme-store";
import { cn } from "@/lib/cn";

const THEME_ORDER: DashboardTheme[] = ["dark", "light"];

const THEME_ICONS: Record<DashboardTheme, string> = {
  dark: "☾",
  light: "☀",
};

type ThemeToggleProps = {
  variant?: "menu" | "inline";
};

export function ThemeToggle({ variant = "inline" }: ThemeToggleProps) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const saving = useThemeStore((state) => state.saving);

  if (variant === "menu") {
    return (
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-normal text-muted">
          Appearance
        </p>
        <div className="flex gap-1.5" role="group" aria-label="Dashboard theme">
          {THEME_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              disabled={saving}
              onClick={() => void setTheme(option)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-normal transition",
                theme === option
                  ? "border-foreground bg-surface-raised text-foreground"
                  : "border-border text-secondary hover:border-foreground/40 hover:text-foreground"
              )}
              aria-pressed={theme === option}
              title={DASHBOARD_THEMES[option].description}
            >
              <span className="text-sm leading-none">{THEME_ICONS[option]}</span>
              <span>{DASHBOARD_THEMES[option].label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex rounded-full border border-border bg-surface p-0.5"
      role="group"
      aria-label="Dashboard theme"
    >
      {THEME_ORDER.map((option) => (
        <button
          key={option}
          type="button"
          disabled={saving}
          onClick={() => void setTheme(option)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-normal transition",
            theme === option
              ? "border border-foreground bg-surface-raised text-foreground"
              : "text-secondary hover:text-foreground"
          )}
          aria-pressed={theme === option}
          title={DASHBOARD_THEMES[option].label}
        >
          {THEME_ICONS[option]}
        </button>
      ))}
    </div>
  );
}
