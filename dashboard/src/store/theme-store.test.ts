import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetThemeStore, useThemeStore } from "@/store/theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    resetThemeStore();
    vi.restoreAllMocks();
  });

  it("hydrates theme and applies to document", () => {
    useThemeStore.getState().hydrate("light");
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("setTheme persists via API", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
    });

    await useThemeStore.getState().setTheme("system");

    expect(useThemeStore.getState().theme).toBe("system");
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dashboard_theme: "system" }),
    });
  });
});
