import { describe, expect, it } from "vitest";
import { validatePreferences } from "@/lib/preferences-validation";

describe("preferences API validation", () => {
  it("accepts a full preferences payload", () => {
    expect(
      validatePreferences({
        theme: "classic",
        format: "brief",
        max_stories: 10,
        topic_filters: ["ai_ml"],
        email_enabled: false,
        dashboard_theme: "system",
      })
    ).toEqual({
      theme: "classic",
      format: "brief",
      max_stories: 10,
      topic_filters: ["ai_ml"],
      email_enabled: false,
      dashboard_theme: "system",
    });
  });

  it("normalizes empty topic filters to null", () => {
    expect(validatePreferences({ topic_filters: [] }).topic_filters).toBeNull();
  });
});
