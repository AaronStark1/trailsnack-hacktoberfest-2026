import type { Device, Tier, WorkerEvent, WorkerRequest } from "../workers/protocol.ts";
import { detectDevice } from "./detectDevice.ts";
import { TIER1_MODEL_ID, TIER2_MODEL_ID } from "./types.ts";
import { useModelStore } from "../stores/modelStore.ts";

export type ModelStatus = "idle" | "loading" | "ready" | "error";

export interface TierState {
  status: ModelStatus;
  progressPct: number;
  currentFile: string;
  device: Device | null;
  error: string | null;
}

interface PendingRequest {
  resolve: (ev: WorkerEvent) => void;
  reject: (err: Error) => void;
  onEvent?: ((ev: WorkerEvent) => void) | undefined;
  timeout: ReturnType<typeof setTimeout>;
  isDeepLook: boolean;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

type TestHook = {
  enabled: boolean;
  identifyScores?: { speciesId: string; similarity: number }[] | undefined;
};

const testHook: TestHook = { enabled: false };

/** E2E injection point: replaces the worker with deterministic scripted scores. */
export function __setTestHook(hook: Partial<TestHook>): void {
  Object.assign(testHook, hook);
}

export function __getTestHook(): TestHook {
  return testHook;
}

class GemmaClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private initSingleFlight = new Map<Tier, Promise<void>>();
  private chosenDevice: Device | null = null;
  private activeDeepLookId: string | null = null;

  private ensureWorker(): Worker {
    if (typeof window !== "undefined" && (window as unknown as { __TRAILSNACK_TEST__?: boolean }).__TRAILSNACK_TEST__ && testHook.enabled) {
      throw new Error("test-mode: no worker");
    }
    if (!this.worker) {
      this.worker = new Worker(new URL("../workers/gemma.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (ev: MessageEvent<WorkerEvent>) => this.handle(ev.data);
      this.worker.onerror = (e) => {
        for (const [, p] of this.pending) {
          clearTimeout(p.timeout);
          p.reject(new Error(`Worker error: ${(e as ErrorEvent).message ?? "unknown"}`));
        }
        this.pending.clear();
      };
    }
    return this.worker;
  }

  private handle(ev: WorkerEvent): void {
    const p = this.pending.get(ev.requestId);
    if (ev.type === "progress" || ev.type === "deep-look-token") {
      p?.onEvent?.(ev);
      return;
    }
    if (!p) return;
    // Belt and braces for R2-1: a stray ready ack must never resolve a
    // Deep Look request (which is waiting for deep-look-result).
    if (ev.type === "ready" && p.isDeepLook) return;
    clearTimeout(p.timeout);
    this.pending.delete(ev.requestId);
    p.resolve(ev);
  }

  private send<T extends WorkerEvent>(
    msg: WorkerRequest,
    opts?: { timeoutMs?: number; onEvent?: (ev: WorkerEvent) => void; expectTypes?: T["type"][] },
  ): Promise<T> {
    const worker = this.ensureWorker();
    const requestId = (msg as { requestId?: string }).requestId ?? newId();
    const timeoutMs = opts?.timeoutMs ?? 120_000;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Request ${msg.type} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(requestId, {
        resolve: (ev) => resolve(ev as T),
        reject,
        onEvent: opts?.onEvent,
        timeout,
        isDeepLook: msg.type === "deep-look",
      });
      const transfer: Transferable[] = [];
      if ((msg as { image?: { data: ArrayBuffer } }).image) {
        transfer.push((msg as { image: { data: ArrayBuffer } }).image.data);
      }
      try {
        worker.postMessage(msg, transfer);
      } catch (err) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  async getDevice(preferred: "auto" | Device = "auto"): Promise<Device> {
    if (this.chosenDevice && preferred === "auto") return this.chosenDevice;
    this.chosenDevice = await detectDevice(preferred);
    return this.chosenDevice;
  }

  /** Device actually in effect after init (accounts for the WebGPU→WASM fallback). */
  currentDevice(): Device | null {
    return this.chosenDevice;
  }

  async initTier(
    tier: Tier,
    opts?: { device?: Device | "auto"; onProgress?: (pct: number, file: string, loadedBytes?: number, totalBytes?: number) => void },
  ): Promise<void> {
    const existing = this.initSingleFlight.get(tier);
    if (existing) return existing;
    const p = (async () => {
      const device = await this.getDevice(opts?.device ?? "auto");
      const target: Device = tier === "deep-look" ? "webgpu" : device;
      // Already-ready fast path (C1): skip the worker round-trip entirely when
      // the store already shows this tier ready on the same device. The worker
      // also acknowledges repeat inits, so either side alone fixes the hang.
      const key = tier === "field-id" ? "fieldId" : "deepLook";
      const known = useModelStore.getState()[key];
      if (known.status === "ready" && known.device === target) return;
      const requestId = newId();
      try {
        const res = await this.send(
          { type: "init", tier, device: target, requestId },
          {
            timeoutMs: 600_000,
            onEvent: (ev) => {
              if (ev.type === "progress") opts?.onProgress?.(ev.overallPct, ev.file, ev.loadedBytes, ev.totalBytes);
            },
          },
        );
        if (res.type === "error") {
          if (tier === "field-id" && target === "webgpu" && res.code !== "aborted") {
            // Automatic WebGPU -> WASM fallback for Tier 1.
            this.chosenDevice = "wasm";
            const retryId = newId();
            const retry = await this.send(
              { type: "init", tier, device: "wasm", requestId: retryId },
              {
                timeoutMs: 600_000,
                onEvent: (ev) => {
                  if (ev.type === "progress") opts?.onProgress?.(ev.overallPct, ev.file, ev.loadedBytes, ev.totalBytes);
                },
              },
            );
            if (retry.type === "error") throw new Error(retry.message);
            return;
          }
          throw new Error(res.message);
        }
      } finally {
        this.initSingleFlight.delete(tier);
      }
    })();
    this.initSingleFlight.set(tier, p);
    return p;
  }

  async prepareSpeciesIndex(
    species: { id: string; prompts: string[]; commonName: string; scientificName: string }[],
    opts?: {
      cached?: { matrix: ArrayBuffer; dims: number; speciesIds: string[]; promptOffsets: number[] };
      dbHash?: string;
      onProgress?: (pct: number, file: string) => void;
    },
  ): Promise<{ matrix: ArrayBuffer; dims: number; speciesIds: string[]; promptOffsets: number[]; computeMs: number }> {
    const requestId = newId();
    const res = await this.send(
      {
        type: "prepare-species-index",
        requestId,
        dbHash: opts?.dbHash ?? "",
        species,
        ...(opts?.cached ? { cached: opts.cached } : {}),
      },
      { timeoutMs: 600_000 },
    );
    if (res.type === "species-index-ready") {
      return {
        matrix: res.matrix,
        dims: res.dims,
        speciesIds: res.speciesIds,
        promptOffsets: res.promptOffsets,
        computeMs: res.computeMs,
      };
    }
    if (res.type === "error") throw new Error(res.message);
    throw new Error(`Unexpected response: ${res.type}`);
  }

  async identify(
    image: { data: ArrayBuffer; width: number; height: number },
    topK = 8,
  ): Promise<{ embedding: ArrayBuffer; scores: { speciesId: string; similarity: number }[]; inferenceMs: number }> {
    if (testHook.enabled && testHook.identifyScores) {
      return { embedding: new ArrayBuffer(8), scores: testHook.identifyScores, inferenceMs: 1 };
    }
    const requestId = newId();
    const res = await this.send({ type: "identify", requestId, image, topK }, { timeoutMs: 180_000 });
    if (res.type === "identify-result") {
      return { embedding: res.embedding, scores: res.scores, inferenceMs: res.inferenceMs };
    }
    if (res.type === "error") throw new Error(res.message);
    throw new Error(`Unexpected response: ${res.type}`);
  }

  async deepLook(
    image: { data: ArrayBuffer; width: number; height: number },
    candidates: { id: string; commonName: string; scientificName: string; checklist: string[] }[],
    onToken?: (text: string) => void,
  ): Promise<{ json: import("../workers/protocol.ts").DeepLookJson; inferenceMs: number }> {
    const requestId = newId();
    this.activeDeepLookId = requestId;
    try {
      const res = await this.send(
        { type: "deep-look", requestId, image, candidates },
        {
          timeoutMs: 600_000,
          onEvent: (ev) => {
            if (ev.type === "deep-look-token") onToken?.(ev.text);
          },
        },
      );
      if (res.type === "deep-look-result") {
        return { json: res.json, inferenceMs: res.inferenceMs };
      }
      if (res.type === "error") throw new Error(res.message);
      throw new Error(`Unexpected response: ${res.type}`);
    } finally {
      if (this.activeDeepLookId === requestId) this.activeDeepLookId = null;
    }
  }

  /**
   * Ask the worker to stop the in-flight Deep Look. Posted directly (no
   * pending entry, no timeout): the worker answers through the original
   * deep-look request, which then rejects with the abort error.
   */
  abortDeepLook(): boolean {
    const id = this.activeDeepLookId;
    if (!id || !this.worker) return false;
    try {
      this.worker.postMessage({ type: "abort", requestId: id });
      return true;
    } catch {
      return false;
    }
  }

  modelIds(): { tier1: string; tier2: string } {
    return { tier1: TIER1_MODEL_ID, tier2: TIER2_MODEL_ID };
  }
}

export const gemmaClient = new GemmaClient();
