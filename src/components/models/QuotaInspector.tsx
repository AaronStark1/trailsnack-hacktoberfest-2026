import { useEffect, useRef, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { inspectModelCache, type CacheReport } from "../../db/modelCacheInspector.ts";
import { requestPersistentStorage } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";
import Button from "../ui/Button.tsx";
import MonoStat from "../ui/MonoStat.tsx";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

const WARN_PCT = 85;

/** Storage quota bar: lichen fill, turning to caution past 85% (also stated in words). */
function StorageBar({ pct }: { pct: number }) {
  const warn = pct > WARN_PCT;
  return (
    <div aria-hidden className="relative mt-4">
      <div className="well h-3 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out-soft ${warn ? "bg-caution" : "bg-ink-muted"}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 1.5 : 0)}%` }}
        />
      </div>
      {/* 85% mark: where the browser starts to feel full. */}
      <span className="absolute -top-1 -bottom-1 w-px bg-line-strong" style={{ left: `${WARN_PCT}%` }} />
    </div>
  );
}

export default function QuotaInspector({ onReport }: { onReport?: (report: CacheReport) => void }) {
  const [report, setReport] = useState<CacheReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const onReportRef = useRef(onReport);
  onReportRef.current = onReport;

  async function refresh() {
    setRefreshing(true);
    try {
      const next = await inspectModelCache();
      setReport(next);
      onReportRef.current?.(next);
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
    <section aria-labelledby="quota-h" data-testid="quota-inspector" className="grid gap-4">
      <SectionHeader
        id="quota-h"
        eyebrow="Storage"
        title="Storage & cache"
        {...(pct !== null
          ? {
              right: (
                <Pill tone={pct > WARN_PCT ? "warn" : "neutral"} dot>
                  {pct > WARN_PCT ? "Near full" : "Headroom"}
                </Pill>
              ),
            }
          : {})}
      />
      {report ? (
        <div className="plate p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="mono-label text-ink-faint">Origin storage</p>
              <p className={`display mt-2 text-display-lg ${pct !== null && pct > WARN_PCT ? "text-caution" : "text-ink"}`}>
                {pct !== null ? (
                  <>
                    {pct}
                    <span className="ml-1 text-[0.5em] text-ink-muted">%</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <p data-testid="quota-text" className="mono-value pb-1 text-sm text-ink-muted">
              {formatBytes(report.usageBytes)} of {formatBytes(report.quotaBytes)} used
              {pct !== null ? ` (${pct}%)` : ""}
            </p>
          </div>
          {pct !== null && <StorageBar pct={pct} />}

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <MonoStat size="sm" label="Used" value={formatBytes(report.usageBytes)} />
            <MonoStat size="sm" label="Quota" value={formatBytes(report.quotaBytes)} />
            <MonoStat
              size="sm"
              label="Model cache"
              value={formatBytes(report.totalBytes)}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <p className="mono-label text-ink-faint">Cache API · model files</p>
            {report.perModel.length > 0 ? (
              <ul className="well mt-3 divide-y divide-line rounded-field">
                {report.perModel.map((m) => (
                  <li key={m.modelId} className="flex items-start gap-3 px-3.5 py-3">
                    <Database size={16} aria-hidden className="mt-1 shrink-0 text-ink-faint" />
                    <span className="mono-value min-w-0 text-sm break-all text-ink">
                      {m.modelId}: {formatBytes(m.bytes)} ({m.fileCount} files)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-ink-muted">No model files are cached on this device.</p>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                Persistent storage:{" "}
                <strong data-testid="persisted-status">{report.persisted ? "granted" : "not granted"}</strong>
              </p>
              <Pill tone={report.persisted ? "ok" : "warn"} dot>
                {report.persisted ? "Protected" : "Evictable"}
              </Pill>
            </div>
            {!report.persisted && (
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => void requestPersistentStorage().then(() => refresh())}
              >
                Request persistence
              </Button>
            )}
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              iOS tip: use Share → Add to Home Screen so the system protects downloaded
              models from storage eviction.
            </p>
          </div>
        </div>
      ) : (
        <div role="status" className="plate grid gap-4 p-5 sm:p-6">
          <p className="mono-label text-ink-muted">Measuring storage…</p>
          <span aria-hidden className="skeleton h-12 w-28" />
          <span aria-hidden className="skeleton h-3 rounded-full" />
          <span aria-hidden className="skeleton h-16" />
        </div>
      )}
      <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => void refresh()} disabled={refreshing}>
        <RefreshCw size={16} aria-hidden className={refreshing ? "animate-spin" : ""} />
        {refreshing ? "Refreshing…" : "Refresh"}
      </Button>
    </section>
  );
}
