import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { inspectModelCache, type CacheReport } from "../../db/modelCacheInspector.ts";
import { requestPersistentStorage } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";
import Button from "../ui/Button.tsx";

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
    <section aria-labelledby="quota-h" data-testid="quota-inspector">
      <h2 id="quota-h" className="flex items-center gap-2 text-2xl font-bold">
        <HardDrive size={24} aria-hidden /> Storage
      </h2>
      {report ? (
        <div className="mt-2 rounded-2xl border border-black/10 p-3">
          <p data-testid="quota-text">
            {formatBytes(report.usageBytes)} of {formatBytes(report.quotaBytes)} used
            {pct !== null ? ` (${pct}%)` : ""}
          </p>
          {pct !== null && (
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-(--color-trail)" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="mt-2">
            Persistent storage:{" "}
            <strong data-testid="persisted-status">{report.persisted ? "granted" : "not granted"}</strong>
          </p>
          {!report.persisted && (
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => void requestPersistentStorage().then(() => refresh())}
            >
              Request persistence
            </Button>
          )}
          <p className="mt-2 text-base opacity-80">
            iOS tip: use Share → Add to Home Screen so the system protects downloaded
            models from storage eviction.
          </p>
          {report.perModel.length > 0 && (
            <ul className="mt-2 grid gap-1">
              {report.perModel.map((m) => (
                <li key={m.modelId} className="font-mono text-base break-all">
                  {m.modelId}: {formatBytes(m.bytes)} ({m.fileCount} files)
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p>Measuring storage…</p>
      )}
      <Button variant="ghost" onClick={() => void refresh()} disabled={refreshing}>
        {refreshing ? "Refreshing…" : "Refresh"}
      </Button>
    </section>
  );
}
