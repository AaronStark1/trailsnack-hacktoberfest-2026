/** Numbered safety-engine trace, one ruled ledger line per stored reason. */
export default function ReasonLedger({ reasons }: { reasons: string[] }) {
  return (
    <ol className="well overflow-hidden rounded-field">
      {reasons.map((r, i) => (
        <li key={i} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
          <span className="mono-value shrink-0 pt-0.5 text-sm text-amber">{String(i + 1).padStart(2, "0")}</span>
          <span className="min-w-0 text-[0.9375rem] leading-snug text-ink">{r}</span>
        </li>
      ))}
    </ol>
  );
}
