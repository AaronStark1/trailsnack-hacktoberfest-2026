import { describe, expect, it } from "vitest";
import { dot, l2Normalize, rankSpecies } from "../../src/engine/ranking.ts";

describe("cosine ranking", () => {
  it("dot of orthogonal vectors is 0, identical is 1", () => {
    expect(dot([1, 0], [0, 1])).toBeCloseTo(0);
    expect(dot([1, 0], [1, 0])).toBeCloseTo(1);
  });

  it("l2Normalize produces unit vectors", () => {
    const v = l2Normalize([3, 4]);
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
  });

  it("per-species max over prompt rows, sorted desc, topK honored", () => {
    // 2 dims, 3 prompt rows: sp-a has rows 0..1, sp-b row 2.
    const dims = 2;
    const matrix = new Float32Array([
      1, 0, // row0 sp-a
      0, 1, // row1 sp-a
      0.6, 0.8, // row2 sp-b
    ]);
    const img = [1, 0]; // matches row0 exactly
    const out = rankSpecies(img, matrix, dims, ["sp-a", "sp-a", "sp-b"], [0, 1, 2], 8);
    expect(out[0]?.speciesId).toBe("sp-a");
    expect(out[0]?.similarity).toBeCloseTo(1);
    expect(out[1]?.speciesId).toBe("sp-b");
    expect(out[1]?.similarity).toBeCloseTo(0.6);
    const top1 = rankSpecies(img, matrix, dims, ["sp-a", "sp-a", "sp-b"], [0, 1, 2], 1);
    expect(top1).toHaveLength(1);
  });
});
