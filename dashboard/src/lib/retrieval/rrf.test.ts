import { describe, expect, it } from "vitest";
import { boostByImportance, reciprocalRankFusion } from "@/lib/retrieval/rrf";

describe("reciprocalRankFusion", () => {
  it("fuses vector and FTS rankings", () => {
    const vector = [
      { id: 1, rank: 1, similarity: 0.9, payload: { title: "A" } },
      { id: 2, rank: 2, similarity: 0.8, payload: { title: "B" } },
    ];
    const fts = [
      { id: 2, rank: 1, fts_rank: 0.5, payload: { title: "B" } },
      { id: 3, rank: 2, fts_rank: 0.3, payload: { title: "C" } },
    ];

    const fused = reciprocalRankFusion(vector, fts);

    expect(fused[0].id).toBe(2);
    expect(fused[0].rrf_score).toBeGreaterThan(fused[1].rrf_score);
    expect(fused.map((r) => r.id)).toEqual([2, 1, 3]);
  });

  it("handles single-list results", () => {
    const vector = [{ id: 10, rank: 1, similarity: 0.7, payload: {} }];
    const fused = reciprocalRankFusion(vector, []);
    expect(fused).toHaveLength(1);
    expect(fused[0].id).toBe(10);
  });
});

describe("boostByImportance", () => {
  it("ranks higher-importance articles above lower ones", () => {
    const boosted = boostByImportance([
      { id: 1, importance_score: 3, rrf_score: 0.02 },
      { id: 2, importance_score: 9, rrf_score: 0.018 },
    ]);

    expect(boosted[0].id).toBe(2);
    expect(boosted[0].rrf_score).toBeGreaterThan(boosted[1].rrf_score!);
  });
});
