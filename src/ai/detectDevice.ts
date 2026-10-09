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
