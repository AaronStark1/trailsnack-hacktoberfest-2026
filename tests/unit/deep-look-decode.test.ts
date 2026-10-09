import { describe, expect, it } from "vitest";
import { decodeGeneratedOutput, promptTokenLength } from "../../src/workers/deepLookDecode.ts";
import type { SliceSpec } from "../../src/workers/deepLookDecode.ts";

describe("Deep Look output decoding (C2: batch_decode is sync, prompt must be sliced)", () => {
  it("slices the prompt tokens off and joins decoded chunks synchronously", () => {
    const seenSlices: SliceSpec[][] = [];
    const fakeOutput = {
      slice(...slices: SliceSpec[]): unknown {
        seenSlices.push(slices);
        return "GENERATED_IDS";
      },
    };
    let seenIds: unknown;
    let seenOpts: unknown;
    const decoded = decodeGeneratedOutput(fakeOutput, 37, (ids, opts) => {
      seenIds = ids;
      seenOpts = opts;
      return ["{", '"a":1', "}"];
    });
    expect(decoded).toBe('{"a":1}');
    // First dim untouched, second dim from prompt length to the end.
    expect(seenSlices).toEqual([[null, [37, null]]]);
    expect(seenIds).toBe("GENERATED_IDS");
    expect(seenOpts).toEqual({ skip_special_tokens: true });
  });

  it("reads the prompt length from input_ids dims, defaulting to 0", () => {
    expect(promptTokenLength({ input_ids: { dims: [1, 37] } })).toBe(37);
    expect(promptTokenLength({})).toBe(0);
    expect(promptTokenLength({ input_ids: {} })).toBe(0);
  });
});
