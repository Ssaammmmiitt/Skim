import { create } from "zustand";
import type { DashboardTheme } from "@/lib/auth/types";
import {
  THEME_STORAGE_KEY,
  applyDashboardTheme,
  normalizeDashboardTheme,
  resolveDashboardTheme,
} from "@/lib/dashboard-theme";

type ThemeState = {
  theme: DashboardTheme;
  resolved: "light" | "dark";
  saving: boolean;
  hydrated: boolean;
  hydrate: (initial: DashboardTheme) => void;
  applyTheme: (theme: DashboardTheme) => void;
  setTheme: (theme: DashboardTheme) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  resolved: "dark",
  saving: false,
  hydrated: false,

  hydrate: (initial) => {
    const normalized = normalizeDashboardTheme(initial);
    applyDashboardTheme(normalized);
    set({
      theme: normalized,
      resolved: resolveDashboardTheme(normalized),
      hydrated: true,
    });
  },

  applyTheme: (next) => {
    const normalized = normalizeDashboardTheme(next);
    applyDashboardTheme(normalized);
    set({
      theme: normalized,
      resolved: resolveDashboardTheme(normalized),
    });
  },

  setTheme: async (next) => {
    const normalized = normalizeDashboardTheme(next);
    get().applyTheme(normalized);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, normalized);
      } catch {
        // localStorage unavailable in some test environments.
      }
    }

    set({ saving: true });
    try {
      await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_theme: normalized }),
      });
    } catch {
      // Theme still applies locally.
    } finally {
      set({ saving: false });
    }
  },
}));

export function resetThemeStore(): void {
  useThemeStore.setState({
    theme: "dark",
    resolved: "dark",
    saving: false,
    hydrated: false,
  });
}
