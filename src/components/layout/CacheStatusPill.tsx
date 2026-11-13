import { Cpu, Gpu } from "lucide-react";
import Pill, { type PillTone } from "../ui/Pill.tsx";
import { useModelStore, type TierState } from "../../stores/modelStore.ts";

export interface FieldIdTelemetry {
  /** Short status phrase: "ID ready" | "Loading N%" | "ID unavailable" | "ID not set up". */
  label: string;
  /** Human device name: WebGPU | WASM | CPU. */
  deviceName: string;
  /** Mono pill text: "WEBGPU" | "WASM 42%" | "CPU 42%" | "WASM ERR" | "CPU —" (no device yet). */
  text: string;
  /** Full sentence for the rack's aria-label; always contains `label`. */
  sentence: string;
  tone: PillTone;
  live: boolean;
}

/** Derives every telemetry string for the Field ID tier in one place. */
export function describeFieldId(fieldId: TierState): FieldIdTelemetry {
  const { status, progressPct, device } = fieldId;
  const label =
    status === "ready"
      ? "ID ready"
      : status === "loading"
        ? `Loading ${progressPct}%`
        : status === "error"
          ? "ID unavailable"
          : "ID not set up";
  const deviceName = device === "webgpu" ? "WebGPU" : device === "wasm" ? "WASM" : "CPU";
  const deviceWord = deviceName.toUpperCase();
  const on = device ? ` on ${deviceName}` : "";
  const text =
    status === "loading"
      ? `${deviceWord} ${progressPct}%`
      : status === "error"
        ? `${deviceWord} ERR`
        : device
          ? deviceWord
          : "CPU —";
  const sentence =
    status === "ready"
      ? `Field ID ready${on}`
      : status === "loading"
        ? `Field ID: Loading ${progressPct}%${on}`
        : status === "error"
          ? "Field ID unavailable"
          : "Field ID not set up";
  const tone: PillTone =
    status === "ready" ? "ok" : status === "loading" ? "warn" : status === "error" ? "danger" : "neutral";
  return { label, deviceName, text, sentence, tone, live: status === "loading" };
}

/**
 * Compute pill: which backend runs Field ID, with a status LED. Non-interactive;
 * TelemetryRack wraps it (with the signal and storage pills) in one link to
 * /models so the old "manage models" affordance survives.
 */
export default function CacheStatusPill() {
  const fieldId = useModelStore((s) => s.fieldId);
  const t = describeFieldId(fieldId);
  return (
    <Pill tone={t.tone} dot live={t.live} icon={fieldId.device === "webgpu" ? <Gpu /> : <Cpu />} title={t.sentence}>
      {t.text}
    </Pill>
  );
}
