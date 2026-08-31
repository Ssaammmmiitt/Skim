import { describe, expect, it } from "vitest";
import { topicClass, topicLabel } from "@/lib/topics";

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

  it("returns distinct Tailwind classes per topic", () => {
    const ai = topicClass("ai_ml");
    const web = topicClass("web_dev");
    expect(ai).not.toBe(web);
    expect(ai).toContain("bg-topic-ai");
  });

  it("uses default classes for unknown topics", () => {
    expect(topicClass("unknown")).toBe("bg-surface-raised text-secondary");
  });
});
