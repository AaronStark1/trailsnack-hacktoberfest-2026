import { describe, expect, it } from "vitest";
import { createProgressState, ingestProgressEvent } from "../../src/ai/progress.ts";

describe("progress aggregator", () => {
  it("aggregates per-file totals into a single overall percentage", () => {
    let s = createProgressState();
    s = ingestProgressEvent(s, { status: "initiate", file: "a.onnx", total: 100 });
    s = ingestProgressEvent(s, { status: "initiate", file: "b.onnx", total: 300 });
    s = ingestProgressEvent(s, { status: "progress", file: "a.onnx", loaded: 50, total: 100 });
    expect(s.overallPct).toBe(13); // 50/400
    s = ingestProgressEvent(s, { status: "progress", file: "b.onnx", loaded: 150, total: 300 });
    expect(s.overallPct).toBe(50);
    s = ingestProgressEvent(s, { status: "done", file: "a.onnx" });
    s = ingestProgressEvent(s, { status: "done", file: "b.onnx" });
    expect(s.overallPct).toBe(100);
    expect(s.currentFile).toBe("b.onnx");
  });

  it("handles done without prior totals", () => {
    let s = createProgressState();
    s = ingestProgressEvent(s, { status: "done", file: "x" });
    expect(s.overallPct).toBe(0);
  });
});
