import MonoStat from "../ui/MonoStat.tsx";

const SEGMENTS = 24;

/**
 * Download telemetry: a three-up instrument readout over a 24-segment LED
 * track, with the current file as a mono ticker. The progressbar role and
 * aria values are the contract; the segments are purely presentational.
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
  const lit = Math.round((clamped / 100) * SEGMENTS);
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Model download progress"
    >
      <div className="grid grid-cols-3 gap-2">
        <MonoStat label="Progress" value={`${clamped}%`} size="sm" tone="trail" />
        <MonoStat label="ETA" value={eta} size="sm" />
        <MonoStat label="Bytes" value={bytes} size="sm" />
      </div>
      <div className="well mt-3 flex h-5 gap-[3px] rounded-tac-sm p-[3px]">
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const isLit = i < lit;
          const isLead = isLit && i === lit - 1 && clamped < 100;
          return (
            <span
              key={i}
              aria-hidden
              className={`h-full flex-1 rounded-[2px] transition-colors duration-150 ${
                isLit ? (isLead ? "bg-trail-glow animate-blink" : "bg-trail-glow") : "bg-led-off"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-2 truncate font-mono text-sm text-ink-muted">
        <span className="text-ink-faint">FILE ▸ </span>
        {currentFile || "waiting for the first file…"}
      </p>
    </div>
  );
}
