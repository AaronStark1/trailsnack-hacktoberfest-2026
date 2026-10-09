import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { WorkerEvent, WorkerRequest } from "../../src/workers/protocol.ts";

interface HarnessState {
  mode: "ok" | "hang" | "hang-valid";
}

function harness(): HarnessState {
  const g = globalThis as unknown as { __wm?: HarnessState };
  if (!g.__wm) g.__wm = { mode: "ok" };
  return g.__wm;
}

vi.mock("@huggingface/transformers", () => {
  const state: HarnessState = { mode: "ok" };
  (globalThis as unknown as { __wm?: HarnessState }).__wm = state;

  const VALID_JSON =
    '{"observed_features":["red cap"],"candidate_assessments":[{"species_id":"fly-agaric","confirmed":["red cap"],"contradicted":[],"not_visible":[]}],"photo_quality_issues":["none"]}';

  class InterruptableStoppingCriteria {
    interrupted = false;
    interrupt(): void {
      this.interrupted = true;
    }
    reset(): void {
      this.interrupted = false;
    }
  }

  class TextStreamer {
    constructor(_tokenizer: unknown, _opts: unknown) {}
  }

  class RawImage {
    constructor(_data: unknown, _width: number, _height: number, _channels: number) {}
  }

  const fakeTensor = { slice: (..._args: unknown[]) => "GENERATED_IDS" };

  const fakeModel = {
    generate: async (opts: Record<string, unknown>) => {
      if (state.mode !== "ok") {
        const criteria = opts["stopping_criteria"] as { interrupted: boolean };
        const deadline = Date.now() + 5000;
        while (!criteria.interrupted && Date.now() < deadline) {
          await new Promise<void>((r) => setTimeout(r, 5));
        }
      }
      return fakeTensor;
    },
  };

  const fakeProcessor = Object.assign(
    async (_prompt: unknown, _image: unknown, _audio: unknown, _opts: unknown) => ({
      input_ids: { dims: [1, 5] },
    }),
    {
      tokenizer: null,
      apply_chat_template: async (_messages: unknown, _opts: unknown) => "CHAT_PROMPT",
      batch_decode: (_ids: unknown, _opts: unknown) =>
        state.mode === "hang" ? ["{partial-output"] : [VALID_JSON],
    },
  );

  return {
    AutoConfig: { from_pretrained: async (_id: unknown) => ({ audio_config: {} }) },
    AutoModel: {
      from_pretrained: async (_id: unknown, opts: unknown) => {
        const cb = (opts as { progress_callback?: (ev: unknown) => void }).progress_callback;
        cb?.({ status: "initiate", file: "a", total: 100 });
        cb?.({ status: "progress", file: "a", loaded: 50, total: 100 });
        cb?.({ status: "progress", file: "b", loaded: 10 });
        return {};
      },
    },
    AutoProcessor: { from_pretrained: async (_id: unknown) => fakeProcessor },
    Gemma4ForConditionalGeneration: { from_pretrained: async (_id: unknown, _opts: unknown) => fakeModel },
    InterruptableStoppingCriteria,
    TextStreamer,
    RawImage,
    env: { allowLocalModels: false, useBrowserCache: true, backends: { onnx: { wasm: {} } } },
  };
});

vi.mock("@huggingface/transformers-structured-output", () => ({
  StructuredOutputProcessor: class {
    constructor(_tokenizer: unknown, _opts: unknown) {}
  },
}));

type PostFn = (msg: WorkerEvent, transfer?: Transferable[]) => void;

const posted: WorkerEvent[] = [];
let originalPostMessage: PostFn | null = null;

function handler(): (ev: MessageEvent) => Promise<void> {
  const h = (self as unknown as { onmessage: (ev: MessageEvent) => Promise<void> }).onmessage;
  if (!h) throw new Error("worker message handler not installed");
  return h;
}

async function dispatch(msg: WorkerRequest): Promise<void> {
  await handler()({ data: msg } as unknown as MessageEvent);
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function forRequest(requestId: string): WorkerEvent[] {
  return posted.filter((e) => (e as { requestId?: string }).requestId === requestId);
}

beforeAll(async () => {
  Object.defineProperty(window.navigator, "gpu", { value: {}, configurable: true });
  originalPostMessage = (self as unknown as { postMessage: PostFn }).postMessage;
  (self as unknown as { postMessage: PostFn }).postMessage = (msg) => {
    posted.push(msg);
  };
  await import("../../src/workers/gemma.worker.ts");
});

afterAll(() => {
  if (originalPostMessage) {
    (self as unknown as { postMessage: PostFn }).postMessage = originalPostMessage;
  }
  Reflect.deleteProperty(window.navigator, "gpu");
});

describe("worker message handler with a mocked Tier 2 model", () => {
  it("acknowledges init, including a repeat init while already loaded (C1)", async () => {
    await dispatch({ type: "init", tier: "deep-look", device: "webgpu", requestId: "init-1" });
    const first = forRequest("init-1");
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ type: "ready", tier: "deep-look", device: "webgpu" });

    await dispatch({ type: "init", tier: "deep-look", device: "webgpu", requestId: "init-2" });
    const second = forRequest("init-2");
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ type: "ready", tier: "deep-look", device: "webgpu", loadMs: 0 });
  });

  it("resolves an already-loaded deep-look with deep-look-result, never ready (R2-1)", async () => {
    harness().mode = "ok";
    await dispatch({
      type: "deep-look",
      requestId: "dl-1",
      image: { data: new ArrayBuffer(16), width: 2, height: 2 },
      candidates: [
        { id: "fly-agaric", commonName: "Fly agaric", scientificName: "Amanita muscaria", checklist: ["red cap"] },
      ],
    });
    const events = forRequest("dl-1").filter((e) => e.type !== "deep-look-token");
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.type).toBe("deep-look-result");
    expect(events.some((e) => e.type === "ready")).toBe(false);
  });

  it("reports aborted when an in-flight deep-look is interrupted (C3)", async () => {
    harness().mode = "hang";
    const pending = dispatch({
      type: "deep-look",
      requestId: "dl-2",
      image: { data: new ArrayBuffer(16), width: 2, height: 2 },
      candidates: [
        { id: "fly-agaric", commonName: "Fly agaric", scientificName: "Amanita muscaria", checklist: ["red cap"] },
      ],
    });
    await sleep(50);
    await dispatch({ type: "abort", requestId: "dl-2" });
    await pending;
    harness().mode = "ok";
    const events = forRequest("dl-2").filter((e) => e.type !== "deep-look-token");
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1]).toMatchObject({ type: "error", code: "aborted" });
  });

  it("reports aborted even when generate returns valid output after the interrupt (A2-2)", async () => {    harness().mode = "hang-valid";
    const pending = dispatch({
      type: "deep-look",
      requestId: "dl-3",
      image: { data: new ArrayBuffer(16), width: 2, height: 2 },
      candidates: [
        { id: "fly-agaric", commonName: "Fly agaric", scientificName: "Amanita muscaria", checklist: ["red cap"] },
      ],
    });
    await sleep(50);
    await dispatch({ type: "abort", requestId: "dl-3" });
    await pending;
    harness().mode = "ok";
    const events = forRequest("dl-3").filter((e) => e.type !== "deep-look-token");
    expect(events.some((e) => e.type === "deep-look-result")).toBe(false);
    expect(events[events.length - 1]).toMatchObject({ type: "error", code: "aborted" });
  });

  it("reports per-file progress numbers without grand-total substitution (M6)", async () => {
    await dispatch({ type: "init", tier: "field-id", device: "wasm", requestId: "init-t1" });
    const progress = forRequest("init-t1").filter((e) => e.type === "progress");
    expect(progress.length).toBeGreaterThanOrEqual(3);
    const noTotal = progress[progress.length - 1];
    expect(noTotal).toMatchObject({ file: "b", loadedBytes: 10, totalBytes: 0 });
  });
});
