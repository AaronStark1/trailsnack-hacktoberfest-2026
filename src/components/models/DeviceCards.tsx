import { useEffect, useState, type ReactNode } from "react";
import { Cpu, Gpu } from "lucide-react";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";
import { hasUsableWebGPU } from "../../ai/detectDevice.ts";
import type { Device } from "../../stores/modelStore.ts";

interface Props {
  /** Device the Tier 1 model is currently loaded on (null = not loaded). */
  activeDevice: Device | null;
  preferredDevice: "auto" | "webgpu" | "wasm";
}

type AdapterProbe =
  | { state: "probing" }
  | { state: "none" }
  | { state: "ok"; vendor: string | null; architecture: string | null };

interface GpuAdapterLike {
  info?: { vendor?: string; architecture?: string };
}

/**
 * Asks the browser for a WebGPU adapter and reads only what it discloses
 * (GPUAdapter.info). Nothing is inferred from the user agent or device name;
 * an empty field stays "not disclosed".
 */
function useAdapterProbe(): AdapterProbe {
  const [probe, setProbe] = useState<AdapterProbe>({ state: "probing" });
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const usable = await hasUsableWebGPU();
      if (!usable) {
        if (!cancelled) setProbe({ state: "none" });
        return;
      }
      let info: GpuAdapterLike["info"];
      try {
        const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<GpuAdapterLike | null> } };
        const adapter = await nav.gpu?.requestAdapter();
        info = adapter?.info;
      } catch {
        info = undefined;
      }
      if (!cancelled) {
        setProbe({
          state: "ok",
          vendor: info?.vendor?.trim() || null,
          architecture: info?.architecture?.trim() || null,
        });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);
  return probe;
}

function Readout({ label, value, known = true, hint }: { label: string; value: string; known?: boolean; hint?: string }) {
  return (
    <div className="min-w-0 bg-surface-2 p-4">
      <dt className="mono-label text-ink-faint">{label}</dt>
      <dd className={`mono-value mt-2 text-[0.9375rem] leading-tight break-words ${known ? "text-ink" : "text-ink-muted"}`}>
        {value}
        {hint && <span className="mt-1.5 block font-sans text-xs leading-snug text-ink-faint">{hint}</span>}
      </dd>
    </div>
  );
}

function Backend({
  name,
  icon,
  active,
  availability,
  detail,
}: {
  name: string;
  icon: ReactNode;
  active: boolean;
  availability: ReactNode;
  detail: string;
}) {
  return (
    <article
      aria-label={`${name} backend`}
      className={`plate flex items-start gap-4 p-4 sm:p-5 ${active ? "border-glow/35" : ""}`}
    >
      <span
        aria-hidden
        className={`flex size-11 shrink-0 items-center justify-center rounded-full border ${
          active ? "border-glow/40 bg-spruce/45 text-glow" : "border-line-strong bg-surface-2 text-ink-muted"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="display text-display-sm text-ink">{name}</h3>
          <Pill tone={active ? "ok" : "neutral"} dot>
            {active ? "Active" : "Standby"}
          </Pill>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">{availability}</div>
        <p className="mt-2.5 text-sm leading-snug text-ink-muted">{detail}</p>
      </div>
    </article>
  );
}

/**
 * Hardware telemetry: what this browser actually reports about the device,
 * plus one card per inference backend with the active marker following the
 * loaded Tier 1 device. Unreported values are shown as such.
 */
export default function DeviceCards({ activeDevice, preferredDevice }: Props) {
  const adapter = useAdapterProbe();

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const cores =
    typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : null;

  const adapterValue =
    adapter.state === "probing" ? "Probing…" : adapter.state === "ok" ? "Adapter found" : "No adapter";
  const vendorValue =
    adapter.state === "probing" ? "…" : adapter.state === "none" ? "—" : (adapter.vendor ?? "not disclosed");
  const architectureValue =
    adapter.state === "probing" ? "…" : adapter.state === "none" ? "—" : (adapter.architecture ?? "not disclosed");
  const activeValue = activeDevice === "webgpu" ? "WebGPU" : activeDevice === "wasm" ? "WASM" : "None loaded";
  const preferenceValue =
    preferredDevice === "auto" ? "Auto" : preferredDevice === "webgpu" ? "WebGPU only" : "WASM only";

  return (
    <section aria-labelledby="compute-h" className="grid gap-4">
      <SectionHeader
        id="compute-h"
        eyebrow="Diagnostics"
        title="Hardware telemetry"
        lede="Only what this browser reports. Nothing is guessed from the device name."
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-plate border border-line bg-line shadow-plate sm:grid-cols-3">
        <Readout
          label="Device memory"
          value={memGB !== null ? `${memGB} GB` : "not reported"}
          known={memGB !== null}
          {...(memGB !== null ? { hint: "Browser-reported, rounded" } : {})}
        />
        <Readout label="Logical cores" value={cores !== null ? String(cores) : "not reported"} known={cores !== null} />
        <Readout label="WebGPU" value={adapterValue} known={adapter.state === "ok"} />
        <Readout label="Adapter vendor" value={vendorValue} known={adapter.state === "ok" && adapter.vendor !== null} />
        <Readout
          label="Adapter architecture"
          value={architectureValue}
          known={adapter.state === "ok" && adapter.architecture !== null}
        />
        <Readout
          label="Active backend"
          value={activeValue}
          known={activeDevice !== null}
          hint={`Preference: ${preferenceValue}`}
        />
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <Backend
          name="WebGPU"
          icon={<Gpu size={20} />}
          active={activeDevice === "webgpu"}
          availability={
            adapter.state === "probing" ? (
              <Pill tone="neutral" dot live>
                Probing adapter
              </Pill>
            ) : adapter.state === "ok" ? (
              <Pill tone="neutral">Adapter found</Pill>
            ) : (
              <Pill tone="danger">No adapter</Pill>
            )
          }
          detail="GPU inference · q4f16 weights · required for Tier 2, which also needs ≥ 8 GB memory."
        />
        <Backend
          name="WASM"
          icon={<Cpu size={20} />}
          active={activeDevice === "wasm"}
          availability={<Pill tone="neutral">Always available</Pill>}
          detail="CPU fallback · q4 weights · runs Tier 1 only."
        />
      </div>
    </section>
  );
}
