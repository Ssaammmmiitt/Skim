import { describe, expect, it } from "vitest";
import { validatePreferences } from "@/lib/preferences-validation";

describe("validatePreferences", () => {
  it("normalizes digest theme and format", () => {
    const result = validatePreferences({
      theme: "minimal",
      format: "brief",
      max_stories: 10,
      topic_filters: ["ai_ml"],
      email_enabled: false,
      dashboard_theme: "light",
    });

    expect(result).toEqual({
      theme: "minimal",
      format: "brief",
      max_stories: 10,
      topic_filters: ["ai_ml"],
      email_enabled: false,
      dashboard_theme: "light",
    });
  });

  it("clamps max stories and defaults invalid values", () => {
    const result = validatePreferences({
      theme: "bogus",
      format: "invalid",
      max_stories: 99,
      dashboard_theme: "nope",
    });

    expect(result.theme).toBe("cyan");
    expect(result.format).toBe("full");
    expect(result.max_stories).toBe(12);
    expect(result.dashboard_theme).toBe("dark");
  });
});
