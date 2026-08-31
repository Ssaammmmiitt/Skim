import { describe, expect, it } from "vitest";
import { buildRetrievalQueries } from "@/lib/retrieval/query";

describe("buildRetrievalQueries", () => {
  it("uses message alone when no history", () => {
    const { vectorQuery, ftsQuery } = buildRetrievalQueries("OpenAI funding round");
    expect(vectorQuery).toBe("OpenAI funding round");
    expect(ftsQuery).toBe("OpenAI funding round");
  });

  it("combines recent user turns for follow-up questions", () => {
    const history = [
      { role: "user" as const, content: "What did OpenAI announce?" },
      { role: "assistant" as const, content: "They launched a new model." },
    ];

    const { vectorQuery, ftsQuery } = buildRetrievalQueries("What about funding?", history);

    expect(vectorQuery).toContain("What did OpenAI announce?");
    expect(vectorQuery).toContain("What about funding?");
    expect(ftsQuery).toContain("What did OpenAI announce?");
  });
});
