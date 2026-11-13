import { useEffect, useRef, useState } from "react";
import { Cpu, Gpu } from "lucide-react";
import MonoStat from "../ui/MonoStat.tsx";
import Pill from "../ui/Pill.tsx";
import { getStorageEstimate, type StorageEstimate } from "../../db/persistence.ts";
import { formatBytes, formatEta } from "../../lib/format.ts";

export type ProvisioningStatus = "idle" | "loading" | "ready" | "error";

interface Props {
  pct: number;
  currentFile: string;
  loadedBytes: number;
  totalBytes: number;
  /** Epoch ms when the download started; 0 when unknown. */
  startedAt: number;
  device: "webgpu" | "wasm" | null;
  status: ProvisioningStatus;
  /** Accessible name of the progress bar. */
  label?: string;
  /** Cloudberry for Tier 1, elderberry for Tier 2. */
  accent?: "amber" | "violet";
}

interface Sample {
  t: number;
  bytes: number;
}

const GAUGE = 148;
const CENTER = GAUGE / 2;
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENTS = 24;
const SAMPLE_WINDOW_MS = 8000;
const ALLOCATION_POLL_MS = 5000;

const STATUS_WORD: Record<ProvisioningStatus, string> = {
  idle: "Standby",
  loading: "Downloading",
  ready: "Ready",
  error: "Failed",
};

const STATUS_INK: Record<ProvisioningStatus, string> = {
  idle: "text-ink-faint",
  loading: "text-ink-muted",
  ready: "text-glow",
  error: "text-danger-ink",
};

const ACCENTS = {
  amber: { arc: "stroke-amber", block: "bg-amber", tone: "accent" },
  violet: { arc: "stroke-violet-ink", block: "bg-violet-ink", tone: "violet" },
} as const;

/** Twelve hour-marks around the dial, precomputed once. */
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const major = i % 3 === 0;
  const inner = 68.5;
  const outer = major ? 73 : 71;
  return {
    key: i,
    major,
    x1: (CENTER + Math.cos(angle) * inner).toFixed(2),
    y1: (CENTER + Math.sin(angle) * inner).toFixed(2),
    x2: (CENTER + Math.cos(angle) * outer).toFixed(2),
    y2: (CENTER + Math.sin(angle) * outer).toFixed(2),
  };
});

function pushSample(samples: Sample[], bytes: number, now: number): void {
  samples.push({ t: now, bytes });
  const cutoff = now - SAMPLE_WINDOW_MS;
  while (samples.length > 2) {
    const head = samples[0];
    if (!head || head.t >= cutoff) break;
    samples.shift();
  }
}

/** Bytes per second over the sample window; 0 until the window is wide enough to trust. */
function rateOf(samples: Sample[]): number {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || first === last) return 0;
  const seconds = (last.t - first.t) / 1000;
  if (seconds < 0.5) return 0;
  return Math.max(0, (last.bytes - first.bytes) / seconds);
}

const EMPTY_ESTIMATE: StorageEstimate = { usageBytes: null, quotaBytes: null };

/**
 * On-device model provisioning instrument: a ring dial, a segmented sap-line
 * and a small telemetry cluster. Purely presentational — rate, ETA and storage
 * use are derived here from the byte counters the page passes in, and every
 * value falls back to "—" or "unknown" when it has not been measured.
 */
export default function ProvisioningBay({
  pct,
  currentFile,
  loadedBytes,
  totalBytes,
  startedAt,
  device,
  status,
  label = "Tier 1 model download",
  accent = "amber",
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0)));
  const loading = status === "loading";
  const tint = ACCENTS[accent];

  const samplesRef = useRef<Sample[]>([]);
  const bytesRef = useRef(loadedBytes);
  const [rate, setRate] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [allocation, setAllocation] = useState<StorageEstimate>(EMPTY_ESTIMATE);

  // 1 Hz tick while the download is active so rate / ETA keep moving even
  // between progress events (and decay honestly when the stream stalls).
  useEffect(() => {
    if (!loading) return;
    samplesRef.current = [];
    setRate(0);
    const id = setInterval(() => {
      const t = Date.now();
      pushSample(samplesRef.current, bytesRef.current, t);
      setRate(rateOf(samplesRef.current));
      setNow(t);
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    bytesRef.current = loadedBytes;
    pushSample(samplesRef.current, loadedBytes, Date.now());
    setRate(rateOf(samplesRef.current));
  }, [loadedBytes]);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void getStorageEstimate().then((estimate) => {
        if (!cancelled) setAllocation(estimate);
      });
    };
    refresh();
    const id = loading ? setInterval(refresh, ALLOCATION_POLL_MS) : null;
    return () => {
      cancelled = true;
      if (id !== null) clearInterval(id);
    };
  }, [loading]);

  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const arcStroke = status === "error" ? "stroke-danger" : tint.arc;
  const litBlock = status === "error" ? "bg-danger" : tint.block;
  const lit = Math.round((clamped / 100) * SEGMENTS);

  const megabytesPerSecond = rate / (1024 * 1024);
  const hasRate = loading && rate > 0;
  const rateValue = hasRate ? megabytesPerSecond.toFixed(1) : "—";

  let etaValue = "—";
  if (loading) {
    if (rate > 0 && totalBytes > 0) {
      etaValue = formatEta(Math.max(0, totalBytes - loadedBytes) / rate);
    } else if (clamped > 2 && startedAt > 0) {
      const elapsed = Math.max(1, (now - startedAt) / 1000);
      etaValue = formatEta((elapsed / clamped) * (100 - clamped));
    } else {
      etaValue = "calculating…";
    }
  }

  const received = status === "ready" && totalBytes > 0 ? totalBytes : loadedBytes;
  const receivedValue = `${formatBytes(received)} / ${formatBytes(totalBytes || null)}`;
  const allocationValue = `${formatBytes(allocation.usageBytes)} / ${formatBytes(allocation.quotaBytes)}`;

  const deviceLabel = device === "webgpu" ? "WebGPU" : device === "wasm" ? "WASM" : "Device —";
  const deviceIcon = device === "webgpu" ? <Gpu /> : device === "wasm" ? <Cpu /> : null;

  return (
    <div className="well rounded-field p-4 animate-rise-in sm:p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Ring dial */}
        <div className="relative size-[148px] shrink-0">
          <svg
            role="img"
            aria-label={`Download ${clamped}% complete`}
            viewBox={`0 0 ${GAUGE} ${GAUGE}`}
            className="size-full"
          >
            {TICKS.map((tick) => (
              <line
                key={tick.key}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className={tick.major ? "stroke-ink-faint" : "stroke-bark"}
                strokeWidth={tick.major ? 2 : 1.25}
                strokeLinecap="round"
              />
            ))}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-none stroke-line-strong" strokeWidth={6} />
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {status === "ready" && (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  className={`fill-none opacity-25 ${arcStroke}`}
                  strokeWidth={14}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                />
              )}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                className={`fill-none transition-[stroke-dashoffset] duration-300 ease-out-soft ${arcStroke}`}
                strokeWidth={6}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap={clamped > 0 && clamped < 100 ? "round" : "butt"}
              />
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p aria-hidden className="display text-[2.75rem] leading-none text-ink">
              {clamped}
              <span className="ml-0.5 text-xl text-ink-muted">%</span>
            </p>
            <p className={`mono-label mt-2 ${STATUS_INK[status]}`}>{STATUS_WORD[status]}</p>
          </div>
        </div>

        {/* Telemetry cluster */}
        <div className="grid w-full min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-4">
          <MonoStat
            size="sm"
            label="Rate"
            value={rateValue}
            tone={hasRate ? "default" : "muted"}
            {...(hasRate ? { unit: "MB/s" } : {})}
          />
          <MonoStat size="sm" label="ETA" value={etaValue} tone={loading ? "default" : "muted"} />
          <MonoStat size="sm" label="Received" value={receivedValue} className="col-span-2" />
          <MonoStat size="sm" label="Storage used" value={allocationValue} className="col-span-2" />
        </div>
      </div>

      {/* Segmented sap-line */}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="mt-5 flex h-2 gap-[3px]"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const isLit = i < lit;
          const leading = isLit && i === lit - 1 && loading && clamped < 100;
          return (
            <span
              key={i}
              aria-hidden
              className={`h-full flex-1 rounded-full transition-colors duration-200 ${
                isLit ? `${litBlock}${leading ? " animate-pulse-soft" : ""}` : "bg-surface-3"
              }`}
            />
          );
        })}
      </div>

      {/* File ticker + status */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="mono-value min-w-0 truncate text-sm text-ink-muted">
          <span className="text-ink-faint">File · </span>
          {currentFile || "—"}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Pill tone="neutral" title="Inference device" {...(deviceIcon ? { icon: deviceIcon } : {})}>
            {deviceLabel}
          </Pill>
          {status === "loading" && (
            <Pill tone={tint.tone} dot live>
              Downloading
            </Pill>
          )}
          {status === "ready" && (
            <Pill tone="ok" dot>
              Ready
            </Pill>
          )}
          {status === "error" && (
            <Pill tone="danger" dot>
              Failed — retry
            </Pill>
          )}
        </div>
      </div>
    </div>
  );
}
