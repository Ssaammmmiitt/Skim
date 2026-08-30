import { describe, expect, it } from "vitest";
import { topicColors, topicLabel } from "@/lib/topics";

describe("topics", () => {
  it("maps known topic ids to labels", () => {
    expect(topicLabel("ai_ml")).toBe("AI / ML");
    expect(topicLabel("web_dev")).toBe("Web Dev");
  });

  it("formats unknown topics from snake_case", () => {
    expect(topicLabel("custom_topic")).toBe("custom topic");
  });

  it("defaults null topic to Other", () => {
    expect(topicLabel(null)).toBe("Other");
  });

  it("returns distinct colors per topic", () => {
    const ai = topicColors("ai_ml");
    const web = topicColors("web_dev");
    expect(ai.bg).not.toBe(web.bg);
    expect(ai.text).not.toBe(web.text);
  });

  it("uses default colors for unknown topics", () => {
    const colors = topicColors("unknown");
    expect(colors.bg).toBe("#243044");
  });
});
