"use client";

import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useDashboardTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";

type DashboardThemeSelectorProps = {
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
  const current = live ? context!.theme : value ?? "light";

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
              "skim-card rounded-card border p-4 text-left transition",
              selected
                ? "border-primary ring-1 ring-primary"
                : "border-surface-raised hover:border-primary/50"
            )}
          >
            <div
              className={cn(
                "mb-3 h-16 rounded-sm border border-surface-raised",
                key === "light" && "bg-white",
                key === "dark" && "bg-[#25282b]",
                key === "system" &&
                  "bg-gradient-to-r from-white via-[#bebebe] to-[#25282b]"
              )}
            />
            <p className="font-bold text-foreground">{meta.label}</p>
            <p className="mt-1 text-sm text-body">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
