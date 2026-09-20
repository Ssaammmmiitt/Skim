"use client";

import type { DashboardTheme } from "@/lib/auth/types";
import { DASHBOARD_THEMES } from "@/lib/dashboard-theme";
import { useThemeStore } from "@/store/theme-store";
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
  const liveTheme = useThemeStore((state) => state.theme);
  const liveSetTheme = useThemeStore((state) => state.setTheme);
  const current = live ? liveTheme : value ?? "dark";

  function select(theme: DashboardTheme) {
    if (live) {
      void liveSetTheme(theme);
      return;
    }
    onChange?.(theme);
  }

  return (
    <div className="grid max-w-lg gap-4 sm:grid-cols-2">
      {(Object.keys(DASHBOARD_THEMES) as DashboardTheme[]).map((key) => {
        const meta = DASHBOARD_THEMES[key];
        const selected = current === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => select(key)}
            className={cn(
              "rounded-2xl border p-5 text-left transition",
              selected
                ? "border-foreground bg-surface-raised"
                : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
            )}
          >
            <div
              className={cn(
                "mb-4 h-16 rounded-xl border border-border",
                key === "light" && "bg-[#f7f4ee]",
                key === "dark" && "bg-[#141210]"
              )}
            />
            <p className="font-display font-bold text-base text-foreground">{meta.label}</p>
            <p className="mt-1 text-xs font-normal text-secondary">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
