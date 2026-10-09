import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gemmaClient } from "../../src/ai/gemmaClient.ts";
import { useModelStore } from "../../src/stores/modelStore.ts";

interface PostedMsg {
  type: string;
  requestId?: string;
}

/** Worker double that never answers: deep-look stays in flight until aborted. */
class HangingWorker {
  static posted: PostedMsg[] = [];
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(_url: unknown, _opts: unknown) {}
  postMessage(msg: PostedMsg): void {
    HangingWorker.posted.push(msg);
  }
}

interface ClientInternals {
  worker: unknown;
  pending: Map<string, { timeout: ReturnType<typeof setTimeout> }>;
  initSingleFlight: Map<string, unknown>;
  chosenDevice: unknown;
  activeDeepLookId: string | null;
}

function internals(): ClientInternals {
  return gemmaClient as unknown as ClientInternals;
}

function resetClient(): void {
  const c = internals();
  for (const p of c.pending.values()) clearTimeout(p.timeout);
  c.pending.clear();
  c.initSingleFlight.clear();
  c.worker = null;
  c.chosenDevice = null;
  c.activeDeepLookId = null;
}

beforeEach(() => {
  globalThis.Worker = HangingWorker as unknown as typeof Worker;
  HangingWorker.posted = [];
  resetClient();
  useModelStore.getState().resetTier("deep-look");
});

afterEach(() => {
  resetClient();
  useModelStore.getState().resetTier("deep-look");
});

describe("Deep Look abort (C3)", () => {
  it("returns false and posts nothing when no Deep Look is in flight", () => {
    expect(gemmaClient.abortDeepLook()).toBe(false);
    expect(HangingWorker.posted).toHaveLength(0);
  });

  it("posts abort for the in-flight deep-look request id", () => {
    void gemmaClient.deepLook({ data: new ArrayBuffer(8), width: 1, height: 1 }, []);
    expect(HangingWorker.posted).toHaveLength(1);
    const started = HangingWorker.posted[0];
    expect(started).toMatchObject({ type: "deep-look" });
    expect(gemmaClient.abortDeepLook()).toBe(true);
    expect(HangingWorker.posted).toHaveLength(2);
    expect(HangingWorker.posted[1]).toEqual({ type: "abort", requestId: started?.requestId });
  });

  it("worker cancels generation via InterruptableStoppingCriteria (no throwing assert)", () => {
    const src = readFileSync("src/workers/gemma.worker.ts", "utf8");
    expect(src).toContain("InterruptableStoppingCriteria");
    expect(src).toContain("stopping_criteria");
    expect(src).toContain(".interrupt()");
    expect(src).not.toContain("abortFlags.get(msg.requestId)!");
  });
});
