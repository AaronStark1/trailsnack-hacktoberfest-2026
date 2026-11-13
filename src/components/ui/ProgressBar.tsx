const SEGMENTS = 24;

/**
 * Segmented LED-style progress track. Keeps the progressbar role and label
 * contract; the segments are purely presentational.
 */
export default function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const lit = Math.round((clamped / 100) * SEGMENTS);
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div className="well flex h-5 gap-[3px] rounded-tac-sm p-[3px]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-full flex-1 rounded-[2px] transition-colors duration-150 ${
              i < lit
                ? i === lit - 1 && clamped < 100
                  ? "bg-trail-glow animate-blink"
                  : "bg-trail-glow"
                : "bg-led-off"
            }`}
          />
        ))}
      </div>
      <p className="mono-label mt-2 text-ink-muted">{label ?? `${clamped}%`}</p>
    </div>
  );
}
