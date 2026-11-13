import { Cpu, Gpu } from "lucide-react";
import type { PillTone } from "../ui/Pill.tsx";
import { useModelStore, type TierState } from "../../stores/modelStore.ts";

export interface FieldIdTelemetry {
  /** Short status phrase: "ID ready" | "Loading N%" | "ID unavailable" | "ID not loaded". */
  label: string;
  /** Human device name: WebGPU | WASM, or null before a device is known. */
  deviceName: string | null;
  /** Capsule text: "T1 Ready" | "T1 42%" | "T1 Error" | "T1 Idle". */
  text: string;
  /** Full sentence for the rack's aria-label; always contains the state. */
  sentence: string;
  tone: PillTone;
  live: boolean;
}

/** Derives every telemetry string for the Field ID tier from the model store, in one place. */
export function describeFieldId(fieldId: TierState): FieldIdTelemetry {
  const { status, progressPct, device } = fieldId;
  const label =
    status === "ready"
      ? "ID ready"
      : status === "loading"
        ? `Loading ${progressPct}%`
        : status === "error"
          ? "ID unavailable"
          : "ID not loaded";
  const deviceName = device === "webgpu" ? "WebGPU" : device === "wasm" ? "WASM" : null;
  const on = deviceName ? ` on ${deviceName}` : "";
  const text =
    status === "ready"
      ? "T1 Ready"
      : status === "loading"
        ? `T1 ${progressPct}%`
        : status === "error"
          ? "T1 Error"
          : "T1 Idle";
  const sentence =
    status === "ready"
      ? `Tier 1 Field ID ready${on}`
      : status === "loading"
        ? `Tier 1 Field ID loading, ${progressPct}%${on}`
        : status === "error"
          ? "Tier 1 Field ID unavailable"
          : "Tier 1 Field ID not loaded in this session";
  const tone: PillTone =
    status === "ready" ? "ok" : status === "loading" ? "warn" : status === "error" ? "danger" : "neutral";
  return { label, deviceName, text, sentence, tone, live: status === "loading" };
}

const inks: Record<PillTone, string> = {
  neutral: "text-ink-muted",
  accent: "text-amber",
  ok: "text-glow",
  warn: "text-amber",
  danger: "text-danger-ink",
  violet: "text-violet-ink",
};

/**
 * Model-readiness segment of the telemetry capsule: which backend runs Field
 * ID and whether it is actually loaded. Reads the model store only — "Ready"
 * appears solely when the tier really is ready. Non-interactive; TelemetryRack
 * wraps the whole capsule in one link to /models.
 */
export default function CacheStatusPill() {
  const fieldId = useModelStore((s) => s.fieldId);
  const t = describeFieldId(fieldId);
  return (
    <span title={t.sentence} className={`mono-label inline-flex shrink-0 items-center gap-1.5 ${inks[t.tone]}`}>
      <span
        aria-hidden
        className={`size-1.5 rounded-full bg-current ${t.live ? "animate-pulse-soft" : ""} ${
          fieldId.status === "ready" ? "shadow-glow-ok" : ""
        }`}
      />
      {fieldId.device === "webgpu" ? <Gpu size={15} aria-hidden /> : <Cpu size={15} aria-hidden />}
      {t.text}
    </span>
  );
}
