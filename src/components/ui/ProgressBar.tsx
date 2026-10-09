export default function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
      <div className="h-4 overflow-hidden rounded-full bg-black/15">
        <div className="h-full rounded-full bg-(--color-trail) transition-all" style={{ width: `${clamped}%` }} />
      </div>
      <p className="mt-1 text-base">{label ?? `${clamped}%`}</p>
    </div>
  );
}
