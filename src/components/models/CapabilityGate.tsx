import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { getStorageEstimate } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";
import { hasUsableWebGPU } from "../../ai/detectDevice.ts";

export interface GateResult {
  webgpu: boolean;
  deviceMemoryGB: number | null;
  memoryOk: boolean;
  freeQuotaGB: number | null;
  quotaOk: boolean;
}

const REQUIRED_GB = 4.5;
const REQUIRED_MEM_GB = 8;

export async function checkTier2Gate(): Promise<GateResult> {
  // Adapter-aware: presence without a resolving adapter fails the gate.
  const webgpu = await hasUsableWebGPU();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const est = await getStorageEstimate();
  const freeQuotaGB =
    est.quotaBytes !== null && est.usageBytes !== null
      ? (est.quotaBytes - est.usageBytes) / 1024 / 1024 / 1024
      : null;
  // Fail closed: unknown memory or quota blocks the 3.3 GB download rather
  // than waving it through.
  return {
    webgpu,
    deviceMemoryGB,
    memoryOk: deviceMemoryGB !== null && deviceMemoryGB >= REQUIRED_MEM_GB,
    freeQuotaGB,
    quotaOk: freeQuotaGB !== null && freeQuotaGB >= REQUIRED_GB,
  };
}

const marks = {
  pass: "border-glow/35 bg-spruce/45 text-glow",
  fail: "border-danger/60 bg-danger-bg text-danger-ink",
} as const;

export default function CapabilityGate({ onResult }: { onResult?: (g: GateResult) => void }) {
  const [gate, setGate] = useState<GateResult | null>(null);
  useEffect(() => {
    void checkTier2Gate().then((g) => {
      setGate(g);
      onResult?.(g);
    });
  }, [onResult]);

  if (!gate) {
    return (
      <div role="status" className="grid gap-2.5">
        <span className="sr-only">Checking device capabilities…</span>
        <span aria-hidden className="skeleton h-12" />
        <span aria-hidden className="skeleton h-12" />
        <span aria-hidden className="skeleton h-12" />
      </div>
    );
  }
  const rows: [string, string, boolean][] = [
    ["WebGPU available", gate.webgpu ? "yes" : "WebGPU unavailable", gate.webgpu],
    [
      "Device memory",
      gate.deviceMemoryGB !== null ? `${gate.deviceMemoryGB} GB (need ≥ ${REQUIRED_MEM_GB} GB)` : "unknown — download blocked until measurable",
      gate.memoryOk,
    ],
    [
      "Free storage",
      gate.freeQuotaGB !== null ? `${formatBytes(gate.freeQuotaGB * 1024 * 1024 * 1024)} free (need ≥ ${REQUIRED_GB} GB)` : "unknown — download blocked until measurable",
      gate.quotaOk,
    ],
  ];
  return (
    <ul aria-label="Tier 2 capability checks" className="well divide-y divide-line rounded-field">
      {rows.map(([label, value, ok]) => (
        <li key={label} className="flex min-h-14 items-center gap-3 px-3.5 py-3">
          <span
            className={`mono-label inline-flex h-7 w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-full border ${
              ok ? marks.pass : marks.fail
            }`}
          >
            {ok ? <Check size={13} strokeWidth={3} aria-hidden /> : <X size={13} strokeWidth={3} aria-hidden />}
            {ok ? "Pass" : "Fail"}
          </span>
          <span className="min-w-0 leading-snug text-ink-muted">
            <strong className="font-semibold text-ink">{label}:</strong> {value}
          </span>
        </li>
      ))}
    </ul>
  );
}
