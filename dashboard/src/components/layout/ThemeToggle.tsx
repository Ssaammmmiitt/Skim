"use client";

import { Moon, Sun } from "lucide-react";
import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useThemeStore } from "@/store/theme-store";
import { cn } from "@/lib/cn";

const THEME_ORDER: DashboardTheme[] = ["dark", "light"];

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
          {THEME_ORDER.map((option) => {
            const Icon = option === "dark" ? Moon : Sun;
            return (
              <button
                key={option}
                type="button"
                disabled={saving}
                onClick={() => void setTheme(option)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-normal transition",
                  theme === option
                    ? "border-foreground bg-surface-raised text-foreground"
                    : "border-border text-secondary hover:border-foreground/40 hover:text-foreground"
                )}
                aria-pressed={theme === option}
                title={DASHBOARD_THEMES[option].description}
              >
                <Icon size={14} className="shrink-0" />
                <span>{DASHBOARD_THEMES[option].label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-hairline bg-surface p-0.5 shadow-sm"
      role="group"
      aria-label="Dashboard theme"
    >
      {THEME_ORDER.map((option) => {
        const Icon = option === "dark" ? Moon : Sun;
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            disabled={saving}
            onClick={() => void setTheme(option)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium transition-all duration-150",
              active
                ? "border border-hairline bg-surface-raised text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            )}
            aria-pressed={active}
            title={DASHBOARD_THEMES[option].label}
          >
            <Icon size={13} className="shrink-0" />
            <span className="hidden sm:inline capitalize">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

