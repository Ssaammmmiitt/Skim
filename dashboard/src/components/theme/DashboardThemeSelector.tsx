"use client";

import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useDashboardTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";

type DashboardThemeSelectorProps = {
  /** When true, changes apply immediately via ThemeProvider */
  live?: boolean;
  value?: DashboardTheme;
  onChange?: (theme: DashboardTheme) => void;
};

export function DashboardThemeSelector({
  live = false,
  value,
  onChange,
}: DashboardThemeSelectorProps) {
  const context = live ? useDashboardTheme() : null;
  const current = live ? context!.theme : value ?? "dark";

  function select(theme: DashboardTheme) {
    if (live) {
      void context!.setTheme(theme);
      return;
    }
    onChange?.(theme);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(Object.keys(DASHBOARD_THEMES) as DashboardTheme[]).map((key) => {
        const meta = DASHBOARD_THEMES[key];
        const selected = current === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => select(key)}
            className={cn(
              "rounded-card border p-4 text-left transition",
              selected
                ? "border-cyan-core bg-cyan-muted"
                : "border-surface-raised bg-surface hover:border-cyan-deep"
            )}
          >
            <div
              className={cn(
                "mb-3 h-16 rounded-lg border border-surface-raised",
                key === "light" && "bg-[#f8fafc]",
                key === "dark" && "bg-[#0f1419]",
                key === "system" &&
                  "bg-gradient-to-r from-[#f8fafc] via-[#94a3b8] to-[#0f1419]"
              )}
            />
            <p className="font-medium text-foreground">{meta.label}</p>
            <p className="mt-1 text-xs text-secondary">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
