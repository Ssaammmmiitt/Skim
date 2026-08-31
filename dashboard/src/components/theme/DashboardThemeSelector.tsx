"use client";

import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useDashboardTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

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
              ui.card,
              "p-4 text-left transition",
              selected
                ? "border-cyan-core ring-1 ring-cyan-core"
                : "hover:border-cyan-deep"
            )}
          >
            <div
              className={cn(
                "mb-3 h-16 rounded-lg border border-surface-raised",
                key === "light" && "bg-[#f1f5f9]",
                key === "dark" && "bg-[#0f1419]",
                key === "system" &&
                  "bg-gradient-to-r from-[#f1f5f9] via-[#64748b] to-[#0f1419]"
              )}
            />
            <p className="font-bold text-foreground">{meta.label}</p>
            <p className="mt-1 text-sm text-secondary">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
