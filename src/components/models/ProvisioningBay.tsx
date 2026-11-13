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
}

interface Sample {
  t: number;
  bytes: number;
}

const GAUGE = 148;
const CENTER = GAUGE / 2;
const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LED_BLOCKS = 20;
const SAMPLE_WINDOW_MS = 8000;
const ALLOCATION_POLL_MS = 5000;

const STATUS_WORD: Record<ProvisioningStatus, string> = {
  idle: "STANDBY",
  loading: "PROVISIONING",
  ready: "READY",
  error: "FAULT",
};

const STATUS_TONE: Record<ProvisioningStatus, string> = {
  idle: "text-ink-muted",
  loading: "text-trail",
  ready: "text-edible",
  error: "text-danger",
};

/** Radial tick marks every 10%, precomputed once (0% and 100% share the top tick). */
const TICKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
  const inner = 67;
  const outer = i % 5 === 0 ? 73 : 71;
  return {
    key: i,
    major: i % 5 === 0,
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
 * On-device model provisioning instrument: ring gauge, LED block strip and a
 * live telemetry cluster. Purely presentational — rate, ETA and storage
 * allocation are derived here from the byte counters the page passes in.
 */
export default function ProvisioningBay({
  pct,
  currentFile,
  loadedBytes,
  totalBytes,
  startedAt,
  device,
  status,
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0)));
  const loading = status === "loading";

  const samplesRef = useRef<Sample[]>([]);
  const bytesRef = useRef(loadedBytes);
  const [rate, setRate] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [allocation, setAllocation] = useState<StorageEstimate>(EMPTY_ESTIMATE);

  // 1 Hz tick while the link is active so RATE / ETA keep moving even between
  // progress events (and decay honestly when the stream stalls).
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
  const arcStroke = status === "error" ? "stroke-danger" : "stroke-trail-glow";
  const lit = Math.round(clamped / 5);
  const litBlock = status === "error" ? "bg-danger" : "bg-trail-glow";

  const megabytesPerSecond = rate / (1024 * 1024);
  const rateValue = loading && rate > 0 ? megabytesPerSecond.toFixed(1) : "—";

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

  const deviceLabel = device === "webgpu" ? "WEBGPU" : device === "wasm" ? "WASM" : "—";
  const deviceIcon = device === "webgpu" ? <Gpu /> : device === "wasm" ? <Cpu /> : null;

  return (
    <div className="well rounded-tac animate-rise-in">
      <div className="grid-paper rounded-[inherit] p-4">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          {/* Ring gauge */}
          <div className="relative shrink-0 size-[148px]">
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
                  className={tick.major ? "stroke-ink-muted" : "stroke-line-strong"}
                  strokeWidth={tick.major ? 2.5 : 1.5}
                  strokeLinecap="round"
                />
              ))}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={50}
                className="fill-none stroke-line-strong"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-none stroke-line-strong" strokeWidth={8} />
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  className={`fill-none opacity-30 transition-[stroke-dashoffset] duration-300 ease-out-soft ${arcStroke}`}
                  strokeWidth={14}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap={clamped > 0 ? "round" : "butt"}
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  className={`fill-none transition-[stroke-dashoffset] duration-300 ease-out-soft ${arcStroke}`}
                  strokeWidth={8}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap={clamped > 0 ? "round" : "butt"}
                />
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p aria-hidden className="mono-value text-4xl font-black leading-none text-ink">
                {clamped}
                <span className="text-xl font-bold text-ink-muted">%</span>
              </p>
              <p
                className={`mt-2 font-mono text-[10px] leading-none font-semibold tracking-[0.08em] uppercase ${STATUS_TONE[status]}`}
              >
                {STATUS_WORD[status]}
              </p>
            </div>
          </div>

          {/* Telemetry cluster */}
          <div className="grid w-full min-w-0 flex-1 grid-cols-2 gap-3 md:pt-2">
            <MonoStat
              size="sm"
              label="RATE"
              value={rateValue}
              tone={loading && rate > 0 ? "trail" : "default"}
              {...(loading && rate > 0 ? { unit: "MB/s" } : {})}
            />
            <MonoStat size="sm" label="ETA" value={etaValue} />
            <MonoStat size="sm" label="RECEIVED" value={receivedValue} className="col-span-2 md:col-span-1" />
            <MonoStat size="sm" label="ALLOCATION" value={allocationValue} className="col-span-2 md:col-span-1" />
          </div>
        </div>

        {/* LED block strip */}
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tier 1 model download"
          className="well mt-5 flex h-6 gap-[3px] rounded-tac-sm p-[3px]"
        >
          {Array.from({ length: LED_BLOCKS }, (_, i) => {
            const isLit = i < lit;
            const leading = isLit && i === lit - 1 && loading && clamped < 100;
            return (
              <span
                key={i}
                aria-hidden
                className={`h-full flex-1 rounded-[2px] transition-colors duration-150 ${
                  isLit ? `${litBlock}${leading ? " animate-blink" : ""}` : "bg-led-off"
                }`}
              />
            );
          })}
        </div>

        {/* File ticker + status pills */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate font-mono text-sm font-semibold text-ink-muted">
            <span className="text-ink-muted">FILE ▸ </span>
            {currentFile || "—"}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Pill tone="trail" title="Inference device" {...(deviceIcon ? { icon: deviceIcon } : {})}>
              {deviceLabel}
            </Pill>
            {status === "loading" && (
              <Pill tone="trail" dot live>
                LINK ACTIVE
              </Pill>
            )}
            {status === "ready" && (
              <Pill tone="ok" dot>
                PROVISIONED · READY OFFLINE
              </Pill>
            )}
            {status === "error" && (
              <Pill tone="danger" dot>
                FAULT — RETRY
              </Pill>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
