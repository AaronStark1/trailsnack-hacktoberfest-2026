import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gemmaClient } from "../../src/ai/gemmaClient.ts";
import { useModelStore } from "../../src/stores/modelStore.ts";

interface PostedMsg {
  type: string;
  requestId?: string;
  tier?: string;
  device?: string;
}

/** Minimal Worker double: answers `init` with `ready`, records everything. */
class MockWorker {
  static instances: MockWorker[] = [];
  static posted: PostedMsg[] = [];
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(_url: unknown, _opts: unknown) {
    MockWorker.instances.push(this);
  }
  postMessage(msg: PostedMsg): void {
    MockWorker.posted.push(msg);
    if (msg.type === "init") {
      const requestId = msg.requestId ?? "";
      const tier = msg.tier ?? "field-id";
      const device = msg.device ?? "wasm";
      queueMicrotask(() => {
        this.onmessage?.({ data: { type: "ready", requestId, tier, device, loadMs: 5 } });
      });
    }
  }
}

interface ClientInternals {
  worker: unknown;
  pending: Map<string, { timeout: ReturnType<typeof setTimeout> }>;
  initSingleFlight: Map<string, unknown>;
  chosenDevice: unknown;
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
}

beforeEach(() => {
  globalThis.Worker = MockWorker as unknown as typeof Worker;
  MockWorker.instances = [];
  MockWorker.posted = [];
  resetClient();
  useModelStore.getState().resetTier("field-id");
  useModelStore.getState().resetTier("deep-look");
});

afterEach(() => {
  resetClient();
  useModelStore.getState().resetTier("field-id");
  useModelStore.getState().resetTier("deep-look");
});

describe("initTier already-ready guard (C1: second scan must not hang)", () => {
  it("skips the worker round-trip when field-id is already ready on the same device", async () => {
    useModelStore.getState().setTier("field-id", { status: "ready", device: "wasm", progressPct: 100, error: null });
    await gemmaClient.initTier("field-id", { device: "wasm" });
    expect(MockWorker.instances).toHaveLength(0);
    expect(MockWorker.posted).toHaveLength(0);
  });

  it("skips the worker round-trip when deep-look is already ready on webgpu", async () => {
    useModelStore.getState().setTier("deep-look", { status: "ready", device: "webgpu", progressPct: 100, error: null });
    await gemmaClient.initTier("deep-look", { device: "webgpu" });
    expect(MockWorker.instances).toHaveLength(0);
    expect(MockWorker.posted).toHaveLength(0);
  });

  it("still sends init when the tier is not ready", async () => {
    await gemmaClient.initTier("field-id", { device: "wasm" });
    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.posted).toHaveLength(1);
    expect(MockWorker.posted[0]).toMatchObject({ type: "init", tier: "field-id", device: "wasm" });
  });

  it("still sends init when ready on a different device", async () => {
    useModelStore.getState().setTier("field-id", { status: "ready", device: "webgpu", progressPct: 100, error: null });
    await gemmaClient.initTier("field-id", { device: "wasm" });
    expect(MockWorker.posted).toHaveLength(1);
    expect(MockWorker.posted[0]).toMatchObject({ type: "init", device: "wasm" });
  });

  it("worker acknowledges already-loaded tiers with a ready event (no bare return)", () => {
    const src = readFileSync("src/workers/gemma.worker.ts", "utf8");
    // Both loaders must post ready with loadMs 0 on the already-loaded path.
    expect(src.match(/loadMs: 0/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(src).not.toContain("tier1Device === device) return;");
    expect(src).not.toContain("tier2Model && tier2Processor) return true;");
  });
});
