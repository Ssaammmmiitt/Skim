import { beforeEach, describe, expect, it } from "vitest";
import { resetPreferencesStore, usePreferencesStore } from "@/store/preferences-store";
import { resetThemeStore, useThemeStore } from "@/store/theme-store";

describe("usePreferencesStore", () => {
  beforeEach(() => {
    resetPreferencesStore();
    resetThemeStore();
  });

  it("applies dashboard theme immediately when draft changes", () => {
    usePreferencesStore.getState().updateDraft({ dashboard_theme: "light" });
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().resolved).toBe("light");
  });
});
