import { useEffect, useState } from "react";
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

const ledTones = {
  pass: "bg-edible-bg text-edible border-edible/40",
  fail: "bg-danger-bg text-danger border-danger/50",
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
      <p className="mono-label flex min-h-12 items-center gap-2 text-ink-muted">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-trail-glow shadow-glow animate-breathe" />
        Checking device capabilities…
      </p>
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
    <ul aria-label="Tier 2 capability checks" className="grid">
      {rows.map(([label, value, ok]) => (
        <li key={label} className="flex min-h-12 items-center gap-3 border-b border-line py-2 last:border-0">
          <span
            className={`mono-label inline-flex h-7 shrink-0 items-center gap-1.5 rounded-tac-sm border px-2 ${
              ok ? ledTones.pass : ledTones.fail
            }`}
          >
            <span aria-hidden>{ok ? "✓" : "✗"}</span>
            {ok ? "PASS" : "FAIL"}
          </span>
          <span className="min-w-0 text-base leading-snug">
            <strong>{label}:</strong> {value}
          </span>
        </li>
      ))}
    </ul>
  );
}
