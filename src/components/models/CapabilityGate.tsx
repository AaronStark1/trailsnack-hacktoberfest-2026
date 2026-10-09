import { useEffect, useState } from "react";
import { getStorageEstimate } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";
import { isWebGPUAvailable } from "../../ai/detectDevice.ts";

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
  const webgpu = isWebGPUAvailable();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const est = await getStorageEstimate();
  const freeQuotaGB =
    est.quotaBytes !== null && est.usageBytes !== null
      ? (est.quotaBytes - est.usageBytes) / 1024 / 1024 / 1024
      : null;
  return {
    webgpu,
    deviceMemoryGB,
    memoryOk: deviceMemoryGB === null ? true : deviceMemoryGB >= REQUIRED_MEM_GB,
    freeQuotaGB,
    quotaOk: freeQuotaGB === null ? true : freeQuotaGB >= REQUIRED_GB,
  };
}

export default function CapabilityGate({ onResult }: { onResult?: (g: GateResult) => void }) {
  const [gate, setGate] = useState<GateResult | null>(null);
  useEffect(() => {
    void checkTier2Gate().then((g) => {
      setGate(g);
      onResult?.(g);
    });
  }, [onResult]);

  if (!gate) return <p>Checking device capabilities…</p>;
  const rows: [string, string, boolean][] = [
    ["WebGPU available", gate.webgpu ? "yes" : "WebGPU unavailable", gate.webgpu],
    [
      "Device memory",
      gate.deviceMemoryGB !== null ? `${gate.deviceMemoryGB} GB (need ≥ ${REQUIRED_MEM_GB} GB)` : "unknown — treated as pass",
      gate.memoryOk,
    ],
    [
      "Free storage",
      gate.freeQuotaGB !== null ? `${formatBytes(gate.freeQuotaGB * 1024 * 1024 * 1024)} free (need ≥ ${REQUIRED_GB} GB)` : "unknown — treated as pass",
      gate.quotaOk,
    ],
  ];
  return (
    <ul aria-label="Tier 2 capability checks" className="grid gap-1">
      {rows.map(([label, value, ok]) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-hidden>{ok ? "✓" : "✗"}</span>
          <span>
            <strong>{label}:</strong> {value}
          </span>
        </li>
      ))}
    </ul>
  );
}
