import { useEffect, useState, type ReactNode } from "react";
import { Cpu, Gpu } from "lucide-react";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";
import { hasUsableWebGPU } from "../../ai/detectDevice.ts";
import type { Device } from "../../stores/modelStore.ts";

interface Line {
  text: string;
  tone?: "ok" | "danger";
}

const lineTones = {
  ok: "text-edible",
  danger: "text-danger",
} as const;

interface Props {
  /** Device the Tier 1 model is currently loaded on (null = not loaded). */
  activeDevice: Device | null;
  preferredDevice: "auto" | "webgpu" | "wasm";
}

function DeviceCard({
  name,
  icon,
  active,
  lines,
  footnote,
}: {
  name: string;
  icon: ReactNode;
  active: boolean;
  lines: Line[];
  footnote: string;
}) {
  return (
    <article
      aria-label={`${name} backend`}
      className={`tac-card relative overflow-hidden p-3 ${active ? "border-trail/50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`well flex size-11 shrink-0 items-center justify-center rounded-tac ${
            active ? "text-trail" : "text-ink-faint"
          }`}
        >
          {icon}
        </span>
        <span
          aria-hidden
          className={`size-3 shrink-0 rounded-full ${
            active ? "bg-trail-glow shadow-glow animate-glow-pulse" : "bg-led-off ring-1 ring-line-strong"
          }`}
        />
      </div>
      <p className="mono-label mt-3 text-ink-faint">Backend</p>
      <h3 className="display-caps mt-1 text-2xl text-ink">{name}</h3>
      <div className="mt-2">
        <Pill tone={active ? "ok" : "neutral"} dot live={active}>
          {active ? "ACTIVE" : "STANDBY"}
        </Pill>
      </div>
      <ul className="mt-3 grid gap-1.5 border-t border-line pt-2.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-ink">
        {lines.map((l) => (
          <li key={l.text} className={`leading-snug ${l.tone ? lineTones[l.tone] : ""}`}>
            {l.text}
          </li>
        ))}
      </ul>
      <p className="mono-label mt-2.5 leading-relaxed text-ink-muted">{footnote}</p>
    </article>
  );
}

/**
 * Compute architecture readout: one instrument card per inference backend,
 * with the active LED following the loaded Tier 1 device.
 */
export default function DeviceCards({ activeDevice, preferredDevice }: Props) {
  const [adapter, setAdapter] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void hasUsableWebGPU().then((ok) => {
      if (!cancelled) setAdapter(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;

  const webgpuLines: Line[] = [
    adapter === null
      ? { text: "ADAPTER PROBING…" }
      : adapter
        ? { text: "ADAPTER OK", tone: "ok" }
        : { text: "NO ADAPTER", tone: "danger" },
    { text: memGB !== null ? `MEM ${memGB} GB` : "MEM —" },
    { text: "DTYPE q4f16" },
  ];
  const wasmLines: Line[] = [{ text: "FALLBACK · ALWAYS AVAILABLE", tone: "ok" }, { text: "DTYPE q4" }];

  return (
    <section aria-labelledby="compute-h" className="grid gap-3">
      <SectionHeader id="compute-h" eyebrow="BACKEND" title="Compute architecture" />
      <div className="grid grid-cols-2 gap-3">
        <DeviceCard
          name="WebGPU"
          icon={<Gpu size={22} aria-hidden />}
          active={activeDevice === "webgpu"}
          lines={webgpuLines}
          footnote="Tier 2 needs ≥ 8 GB"
        />
        <DeviceCard
          name="WASM"
          icon={<Cpu size={22} aria-hidden />}
          active={activeDevice === "wasm"}
          lines={wasmLines}
          footnote="CPU · Tier 1 only"
        />
        <div className="etched col-span-2 flex items-center justify-between gap-3 rounded-tac bg-surface px-3 py-2.5">
          <span className="mono-label text-ink-faint">Inference</span>
          <span className="mono-label text-ink">PREF: {preferredDevice.toUpperCase()}</span>
        </div>
      </div>
    </section>
  );
}
