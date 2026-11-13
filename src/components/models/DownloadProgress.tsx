import MonoStat from "../ui/MonoStat.tsx";

/**
 * Compact download readout: three instrument values over a slim sap-line, with
 * the current file as a mono ticker. The progressbar role and aria values are
 * the contract; every string shown is passed in by the caller, so nothing
 * here can invent progress.
 */
export default function DownloadProgress({
  pct,
  currentFile,
  bytes,
  eta,
}: {
  pct: number;
  currentFile: string;
  bytes: string;
  eta: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Model download progress"
    >
      <div className="grid grid-cols-3 gap-3">
        <MonoStat label="Progress" value={`${clamped}%`} size="sm" tone="accent" />
        <MonoStat label="ETA" value={eta} size="sm" />
        <MonoStat label="Bytes" value={bytes} size="sm" />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-amber transition-[width] duration-300 ease-out-soft"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mono-value mt-3 truncate text-sm text-ink-muted">
        <span className="text-ink-faint">File · </span>
        {currentFile || "waiting for the first file…"}
      </p>
    </div>
  );
}
