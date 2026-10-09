import type { Device } from "../workers/protocol.ts";

export async function detectDevice(preferred: "auto" | Device = "auto"): Promise<Device> {
  if (preferred === "webgpu" || preferred === "wasm") return preferred;
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter().catch(() => null);
      if (adapter) return "webgpu";
    }
  } catch {
    // ignore and fall through to wasm
  }
  return "wasm";
}

export function isWebGPUAvailable(): boolean {
  return (
    typeof navigator !== "undefined" && "gpu" in navigator && !!(navigator as unknown as { gpu?: unknown }).gpu
  );
}

/**
 * True only when WebGPU is present AND an adapter resolves. Presence alone is
 * not usability: some builds expose `navigator.gpu` with no working adapter,
 * and the Tier 2 gate must not wave those through (R2-3).
 */
export async function hasUsableWebGPU(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
    if (!nav.gpu) return false;
    const adapter = await nav.gpu.requestAdapter().catch(() => null);
    return adapter !== null;
  } catch {
    return false;
  }
}
