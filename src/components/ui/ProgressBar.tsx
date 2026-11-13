/**
 * Slim sap-line progress track. Keeps the progressbar role and label contract;
 * the fill is driven only by the percentage passed in.
 */
export default function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div className="well h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-amber transition-[width] duration-300 ease-out-soft"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mono-label mt-2 text-ink-muted">{label ?? `${clamped}%`}</p>
    </div>
  );
}
