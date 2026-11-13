import { useEffect, useState } from "react";
import { Database, HardDrive } from "lucide-react";
import { inspectModelCache, type CacheReport } from "../../db/modelCacheInspector.ts";
import { requestPersistentStorage } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";
import Button from "../ui/Button.tsx";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

const WARN_PCT = 85;
const ARC = "M16 80 A64 64 0 0 1 144 80";
const TICK_ANGLES = [180, 135, 90, 45, 0];

/** 180° instrument arc: track in line-strong, fill in trail (caution past 85%). */
function StorageGauge({ pct }: { pct: number }) {
  const warn = pct > WARN_PCT;
  return (
    <div className="relative mx-auto h-[90px] w-[160px]">
      <svg viewBox="0 0 160 90" width={160} height={90} aria-hidden className="absolute inset-0 overflow-visible">
        {TICK_ANGLES.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 80 + 73 * Math.cos(rad);
          const y1 = 80 - 73 * Math.sin(rad);
          const x2 = 80 + 79 * Math.cos(rad);
          const y2 = 80 - 79 * Math.sin(rad);
          return (
            <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2} strokeLinecap="round" className="stroke-line-strong" />
          );
        })}
        <path d={ARC} fill="none" strokeWidth={12} strokeLinecap="round" className="stroke-line-strong" />
        {pct > 0 && (
          <path
            d={ARC}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - pct}
            className={`transition-[stroke-dashoffset] duration-700 ease-out-soft ${warn ? "stroke-caution" : "stroke-trail"}`}
          />
        )}
      </svg>
      <p
        className={`mono-value absolute inset-x-0 bottom-0 text-center text-3xl font-black leading-none ${
          warn ? "text-caution" : "text-ink"
        }`}
      >
        {pct}
        <span className="ml-0.5 text-base font-bold text-ink-muted">%</span>
      </p>
    </div>
  );
}

export default function QuotaInspector() {
  const [report, setReport] = useState<CacheReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      setReport(await inspectModelCache());
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const pct =
    report?.quotaBytes && report.quotaBytes > 0 && report.usageBytes !== null
      ? Math.min(100, Math.round(((report.usageBytes ?? 0) / report.quotaBytes) * 100))
      : null;

  return (
    <section aria-labelledby="quota-h" data-testid="quota-inspector" className="grid gap-3">
      <SectionHeader
        id="quota-h"
        eyebrow="STORAGE GAUGE"
        title={
          <span className="inline-flex items-center gap-2">
            <HardDrive size={24} aria-hidden /> Storage
          </span>
        }
        {...(pct !== null
          ? {
              right: (
                <Pill tone={pct > WARN_PCT ? "warn" : "ok"} dot>
                  {pct > WARN_PCT ? "NEAR FULL" : "HEADROOM"}
                </Pill>
              ),
            }
          : {})}
      />
      {report ? (
        <div className="tac-card overflow-hidden p-0">
          <div className="grid-paper flex flex-col items-center border-b border-line px-4 pt-5 pb-4">
            {pct !== null && <StorageGauge pct={pct} />}
            <p data-testid="quota-text" className={`mono-value text-center text-base text-ink-muted ${pct !== null ? "mt-3" : ""}`}>
              {formatBytes(report.usageBytes)} of {formatBytes(report.quotaBytes)} used
              {pct !== null ? ` (${pct}%)` : ""}
            </p>
          </div>
          <div className="grid gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base">
                Persistent storage:{" "}
                <strong data-testid="persisted-status">{report.persisted ? "granted" : "not granted"}</strong>
              </p>
              <Pill tone={report.persisted ? "ok" : "warn"} dot>
                {report.persisted ? "PROTECTED" : "EVICTABLE"}
              </Pill>
            </div>
            {!report.persisted && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void requestPersistentStorage().then(() => refresh())}
              >
                Request persistence
              </Button>
            )}
            <p className="mono-label leading-relaxed text-ink-muted">
              iOS tip: use Share → Add to Home Screen so the system protects downloaded
              models from storage eviction.
            </p>
            {report.perModel.length > 0 && (
              <ul className="well grid gap-2 rounded-tac p-3">
                {report.perModel.map((m) => (
                  <li key={m.modelId} className="flex items-start gap-2 font-mono text-sm break-all text-ink">
                    <Database size={16} aria-hidden className="mt-0.5 shrink-0 text-trail" />
                    <span>
                      {m.modelId}: {formatBytes(m.bytes)} ({m.fileCount} files)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="mono-label flex min-h-12 items-center gap-2 text-ink-muted">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-trail-glow shadow-glow animate-breathe" />
          Measuring storage…
        </p>
      )}
      <Button variant="ghost" onClick={() => void refresh()} disabled={refreshing}>
        {refreshing ? "Refreshing…" : "Refresh"}
      </Button>
    </section>
  );
}
