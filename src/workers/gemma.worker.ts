/// <reference lib="webworker" />
import { AutoModel, AutoProcessor, env, RawImage } from "@huggingface/transformers";
import { StructuredOutputProcessor } from "@huggingface/transformers-structured-output";
import { TextStreamer } from "@huggingface/transformers";
import type { Device, Tier, WorkerEvent, WorkerRequest } from "./protocol.ts";
import { DEEP_LOOK_JSON_SCHEMA, parseDeepLookJson } from "../engine/deepLookSchema.ts";
import { rankSpecies } from "../engine/ranking.ts";

export const TIER1_MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
export const TIER2_MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";

const ctx = self as unknown as {
  postMessage: (msg: WorkerEvent, transfer?: Transferable[]) => void;
  location: { origin: string };
  crossOriginIsolated: boolean;
};

function post(msg: WorkerEvent, transfer?: Transferable[]): void {
  ctx.postMessage(msg, transfer);
}

function configureOfflineRuntime(): void {
  env.allowLocalModels = false;
  (env as unknown as { useBrowserCache: boolean }).useBrowserCache = true;
  const backends = (env as unknown as {
    backends: { onnx: { wasm: Record<string, unknown> } };
  }).backends;
  // Self-hosted ORT binaries under /ort/ (copied by scripts/copy-ort.mjs).
  // Upstream default points at cdn.jsdelivr.net; overriding the object form
  // keeps Transformers.js v4 WASM pre-load/cache logic intact (see AGENT_LOG).
  const origin = ctx.location?.origin ?? self.location.origin;
  const mjs = `${origin}/ort/ort-wasm-simd-threaded.asyncify.mjs`;
  const wasm = `${origin}/ort/ort-wasm-simd-threaded.asyncify.wasm`;
  backends.onnx.wasm.wasmPaths = { mjs, wasm };
  const threads = ctx.crossOriginIsolated
    ? Math.min(4, (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 2)
    : 1;
  backends.onnx.wasm.numThreads = threads;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tier1Processor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tier1Model: any = null;
let tier1Device: Device | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tier2Processor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tier2Model: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tier2Tokenizer: any = null;

let indexMatrix: Float32Array | null = null;
let indexDims = 768;
let indexSpeciesIds: string[] = [];
let indexPromptOffsets: number[] = [];

const abortFlags = new Map<string, { aborted: boolean }>();

interface ProgressEvent {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
}

function makeProgressCallback(tier: Tier, requestId: string, startedFiles: Map<string, { loaded: number; total: number }>) {
  return (ev: ProgressEvent) => {
    const file = ev.file ?? "model";
    if (ev.status === "initiate") {
      startedFiles.set(file, { loaded: 0, total: ev.total ?? 0 });
    } else if (ev.status === "progress" || ev.status === "download") {
      const cur = startedFiles.get(file) ?? { loaded: 0, total: ev.total ?? 0 };
      cur.loaded = ev.loaded ?? cur.loaded;
      if (ev.total) cur.total = ev.total;
      startedFiles.set(file, cur);
    } else if (ev.status === "done") {
      const cur = startedFiles.get(file) ?? { loaded: 0, total: 0 };
      cur.loaded = cur.total > 0 ? cur.total : cur.loaded;
      startedFiles.set(file, cur);
    }
    let loaded = 0;
    let total = 0;
    for (const v of startedFiles.values()) {
      loaded += v.loaded;
      total += v.total;
    }
    const overallPct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
    post({
      type: "progress",
      requestId,
      tier,
      file,
      loadedBytes: typeof ev.loaded === "number" ? ev.loaded : loaded,
      totalBytes: typeof ev.total === "number" ? ev.total : total,
      overallPct,
    });
  };
}

function docText(commonName: string, scientificName: string, prompt: string): string {
  return `title: ${commonName} (${scientificName}) | text: ${prompt}`;
}

async function loadTier1(device: Device, requestId: string): Promise<void> {
  if (tier1Model && tier1Processor && tier1Device === device) return;
  configureOfflineRuntime();
  const t0 = performance.now();
  const started = new Map<string, { loaded: number; total: number }>();
  const dtype = device === "webgpu" ? "q4f16" : "q4";
  try {
    tier1Processor = await AutoProcessor.from_pretrained(TIER1_MODEL_ID);
    tier1Model = await AutoModel.from_pretrained(TIER1_MODEL_ID, {
      device,
      dtype,
      progress_callback: makeProgressCallback("field-id", requestId, started),
    });
    tier1Device = device;
    post({ type: "ready", requestId, tier: "field-id", device, loadMs: Math.round(performance.now() - t0) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/webgpu/i.test(message) && device === "webgpu") {
      post({ type: "error", requestId, tier: "field-id", code: "webgpu-unavailable", message, recoverable: true });
    } else if (/memory|allocation|lost/i.test(message)) {
      post({ type: "error", requestId, tier: "field-id", code: "oom", message, recoverable: true });
    } else if (/network|fetch|failed/i.test(message)) {
      post({ type: "error", requestId, tier: "field-id", code: "network", message, recoverable: true });
    } else {
      post({ type: "error", requestId, tier: "field-id", code: "unknown", message, recoverable: true });
    }
    throw err;
  }
}

async function buildSpeciesIndex(
  requestId: string,
  species: { id: string; prompts: string[]; commonName?: string; scientificName?: string }[],
): Promise<void> {
  const t0 = performance.now();
  if (!tier1Processor || !tier1Model) throw new Error("Tier 1 model not loaded");
  const texts: string[] = [];
  const speciesIds: string[] = [];
  const promptOffsets: number[] = [];
  species.forEach((sp, si) => {
    const common = sp.commonName ?? sp.id;
    const sci = sp.scientificName ?? sp.id;
    for (const p of sp.prompts) {
      texts.push(docText(common, sci, p));
      speciesIds.push(sp.id);
      promptOffsets.push(si === 0 && promptOffsets.length === 0 ? 0 : promptOffsets.length);
    }
  });
  // Fix offsets to be row indices (0..rows-1); per-species max is computed via speciesIds.
  const rows = texts.length;
  const rowOffsets = Array.from({ length: rows }, (_, i) => i);
  const dims = 768;
  const matrix = new Float32Array(rows * dims);
  const BATCH = 16;
  for (let i = 0; i < rows; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    // Text-only embedding through the processor/model text path.
    const inputs = await tier1Processor(batch, null, null, null);
    const output = await tier1Model(inputs);
    const emb = output.sentence_embedding as unknown as {
      normalize_: () => unknown;
      tolist: () => number[][];
    };
    let arr: number[][];
    if (typeof emb.tolist === "function") {
      arr = emb.tolist();
    } else {
      throw new Error("Unexpected embedding output shape");
    }
    for (let r = 0; r < arr.length; r++) {
      const row = arr[r] as number[];
      // L2-normalize defensively (pipeline promises normalized output).
      let n = 0;
      for (let d = 0; d < row.length; d++) n += (row[d] as number) * (row[d] as number);
      n = Math.sqrt(n) || 1;
      for (let d = 0; d < dims; d++) {
        matrix[(i + r) * dims + d] = (row[d] as number) / n;
      }
    }
  }
  indexMatrix = matrix;
  indexDims = dims;
  indexSpeciesIds = speciesIds;
  indexPromptOffsets = rowOffsets;
  const copy = matrix.slice().buffer as ArrayBuffer;
  post(
    {
      type: "species-index-ready",
      requestId,
      matrix: copy,
      dims,
      speciesIds: [...speciesIds],
      promptOffsets: [...rowOffsets],
      computeMs: Math.round(performance.now() - t0),
    },
    [copy],
  );
}

async function identify(
  requestId: string,
  image: { data: ArrayBuffer; width: number; height: number },
  topK: number,
): Promise<void> {
  const t0 = performance.now();
  if (!tier1Processor || !tier1Model || !indexMatrix) throw new Error("Model or index not ready");
  const raw = new RawImage(new Uint8ClampedArray(image.data), image.width, image.height, 4);
  const inputs = await tier1Processor(null, raw, null, null);
  const output = await tier1Model(inputs);
  const embTensor = output.sentence_embedding as unknown as { tolist: () => number[][] };
  const vec = (embTensor.tolist()[0] ?? []) as number[];
  let n = 0;
  for (const v of vec) n += v * v;
  n = Math.sqrt(n) || 1;
  const norm = vec.map((v) => v / n);
  const scores = rankSpecies(norm, indexMatrix, indexDims, indexSpeciesIds, indexPromptOffsets, Math.max(8, topK));
  const embBuf = new Float32Array(norm).buffer as ArrayBuffer;
  post({ type: "identify-result", requestId, embedding: embBuf, scores, inferenceMs: Math.round(performance.now() - t0) }, [embBuf]);
}

async function loadTier2(requestId: string): Promise<boolean> {
  const nav = navigator as Navigator & { gpu?: unknown };
  if (!nav.gpu) {
    post({
      type: "error",
      requestId,
      tier: "deep-look",
      code: "webgpu-unavailable",
      message: "Tier 2 requires WebGPU; navigator.gpu is unavailable.",
      recoverable: false,
    });
    return false;
  }
  if (tier2Model && tier2Processor) return true;
  configureOfflineRuntime();
  const t0 = performance.now();
  const started = new Map<string, { loaded: number; total: number }>();
  try {
    const { Gemma4ForConditionalGeneration } = await import("@huggingface/transformers");
    tier2Processor = await AutoProcessor.from_pretrained(TIER2_MODEL_ID);
    tier2Tokenizer = tier2Processor.tokenizer ?? null;
    tier2Model = await (Gemma4ForConditionalGeneration as unknown as {
      from_pretrained: (id: string, opts: unknown) => Promise<unknown>;
    }).from_pretrained(TIER2_MODEL_ID, {
      dtype: "q4f16",
      device: "webgpu",
      progress_callback: makeProgressCallback("deep-look", requestId, started),
    });
    post({ type: "ready", requestId, tier: "deep-look", device: "webgpu", loadMs: Math.round(performance.now() - t0) });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = /webgpu/i.test(message) ? "webgpu-unavailable" : /memory|allocation|lost/i.test(message) ? "oom" : "unknown";
    post({ type: "error", requestId, tier: "deep-look", code, message, recoverable: code !== "webgpu-unavailable" });
    return false;
  }
}

async function deepLook(
  requestId: string,
  image: { data: ArrayBuffer; width: number; height: number },
  candidates: { id: string; commonName: string; scientificName: string; checklist: string[] }[],
): Promise<void> {
  const t0 = performance.now();
  const ok = await loadTier2(requestId);
  if (!ok || !tier2Model || !tier2Processor) return;
  const flag = { aborted: false };
  abortFlags.set(requestId, flag);

  const list = candidates
    .map((c) => `- ${c.commonName} (${c.scientificName}) [${c.id}]: ${c.checklist.join("; ")}`)
    .join("\n");
  const prompt =
    "You are assisting a hiker who is deciding whether to touch or eat a wild organism. " +
    "You are NOT allowed to say anything is safe or edible. " +
    "Describe only what is visible in the photo using the feature vocabulary provided. " +
    'If a feature is not clearly visible, say "not visible". ' +
    `The candidate species are:\n${list}\n` +
    "For each candidate, state which checklist items are confirmed, contradicted, or not visible. Output JSON only.";

  const raw = new RawImage(new Uint8ClampedArray(image.data), image.width, image.height, 4);
  const messages = [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image" }] }];
  const chatPrompt = await tier2Processor.apply_chat_template(messages, {
    enable_thinking: false,
    add_generation_prompt: true,
  });
  const inputs = await tier2Processor(chatPrompt, raw, null, { add_special_tokens: false });

  let constraint: unknown = null;
  if (tier2Tokenizer) {
    constraint = new StructuredOutputProcessor(tier2Tokenizer, {
      type: "json_schema",
      json_schema: JSON.parse(JSON.stringify(DEEP_LOOK_JSON_SCHEMA)) as never,
    });
  }
  const streamer = new TextStreamer(tier2Processor.tokenizer ?? tier2Tokenizer, {
    skip_prompt: true,
    callback_function: (text: string) => {
      post({ type: "deep-look-token", requestId, text });
    },
  });

  try {
    const { StoppingCriteria } = await import("@huggingface/transformers");
    void StoppingCriteria;
    const output = await (
      tier2Model as unknown as {
        generate: (opts: Record<string, unknown>) => Promise<unknown>;
      }
    ).generate({
      ...inputs,
      max_new_tokens: 400,
      do_sample: false,
      streamer,
      ...(constraint ? { logits_processor: constraint } : {}),
    });
    void output;
    // Decode full output text from streamer path is incremental; re-decode via processor for final JSON.
    const decoded: string = await tier2Processor.batch_decode(output as never, { skip_special_tokens: true }).then(
      (arr: string[]) => arr.join(""),
    );
    const json = parseDeepLookJson(decoded);
    post({ type: "deep-look-result", requestId, json, inferenceMs: Math.round(performance.now() - t0) });
  } catch (err) {
    if (flag.aborted) {
      post({ type: "error", requestId, tier: "deep-look", code: "aborted", message: "Deep Look aborted.", recoverable: true });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      post({ type: "error", requestId, tier: "deep-look", code: "unknown", message, recoverable: true });
    }
  } finally {
    abortFlags.delete(requestId);
  }
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case "init": {
        if (msg.tier === "field-id") {
          await loadTier1(msg.device, msg.requestId);
        } else {
          if (msg.device !== "webgpu") {
            post({
              type: "error",
              requestId: msg.requestId,
              tier: "deep-look",
              code: "webgpu-unavailable",
              message: "Tier 2 runs on WebGPU only.",
              recoverable: false,
            });
          } else {
            await loadTier2(msg.requestId);
          }
        }
        break;
      }
      case "prepare-species-index": {
        if (msg.cached) {
          indexMatrix = new Float32Array(msg.cached.matrix);
          indexDims = msg.cached.dims;
          indexSpeciesIds = [...msg.cached.speciesIds];
          indexPromptOffsets = [...msg.cached.promptOffsets];
          post({
            type: "species-index-ready",
            requestId: msg.requestId,
            matrix: msg.cached.matrix,
            dims: indexDims,
            speciesIds: indexSpeciesIds,
            promptOffsets: indexPromptOffsets,
            computeMs: 0,
          });
        } else {
          // Species entries carry display names so document prefixes follow the
          // model card format: title: {common} ({scientific}) | text: {prompt}.
          await buildSpeciesIndex(
            msg.requestId,
            msg.species.map((s) => ({ id: s.id, prompts: s.prompts, commonName: s.commonName, scientificName: s.scientificName })),
          );
        }
        break;
      }
      case "identify": {
        await identify(msg.requestId, msg.image, msg.topK);
        break;
      }
      case "deep-look": {
        await deepLook(msg.requestId, msg.image, msg.candidates);
        break;
      }
      case "abort": {
        abortFlags.get(msg.requestId)!.aborted = true;
        break;
      }
      case "dispose": {
        if (msg.tier === "field-id") {
          tier1Model = null;
          tier1Processor = null;
          tier1Device = null;
        } else {
          tier2Model = null;
          tier2Processor = null;
          tier2Tokenizer = null;
        }
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const tier: Tier = msg.type === "deep-look" || (msg.type === "init" && msg.tier === "deep-look") ? "deep-look" : "field-id";
    const requestId = "requestId" in msg ? msg.requestId : "unknown";
    post({ type: "error", requestId, tier, code: "unknown", message, recoverable: true });
  }
};
