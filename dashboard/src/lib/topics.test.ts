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

  it("uses per-topic badge classes", () => {
    expect(topicClass("ai_ml")).toBe("bg-topic-ai text-topic-ai-text");
    expect(topicClass("web_dev")).toBe("bg-topic-web text-topic-web-text");
    expect(topicClass(null)).toBe("bg-surface-raised text-secondary");
  });
});
