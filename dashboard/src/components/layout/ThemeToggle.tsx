"use client";

import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useDashboardTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";

const THEME_ORDER: DashboardTheme[] = ["light", "dark", "system"];

const THEME_ICONS: Record<DashboardTheme, string> = {
  light: "☀",
  dark: "☾",
  system: "◐",
};

type ThemeToggleProps = {
  variant?: "menu" | "inline";
};

export function ThemeToggle({ variant = "inline" }: ThemeToggleProps) {
  const { theme, setTheme, saving } = useDashboardTheme();

  if (variant === "menu") {
    return (
      <div className="border-b border-surface-raised px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-muted">
          Appearance
        </p>
        <div className="flex gap-1" role="group" aria-label="Dashboard theme">
          {THEME_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              disabled={saving}
              onClick={() => void setTheme(option)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-sm border px-2 py-1.5 text-[10px] transition",
                theme === option
                  ? "border-primary bg-cyan-muted text-primary"
                  : "border-surface-raised text-muted hover:border-primary"
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
      className="inline-flex rounded-pill-lg border border-on-dark/30 bg-ink/40 p-0.5"
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
            "rounded-pill-lg px-2.5 py-1 text-xs transition",
            theme === option
              ? "bg-primary text-on-primary"
              : "text-on-dark/70 hover:text-on-dark"
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
