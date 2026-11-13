/** Numbered safety-engine trace, one ruled ledger line per reason. */
export default function ReasonLedger({ reasons }: { reasons: string[] }) {
  return (
    <ol className="well mt-3 overflow-hidden rounded-tac">
      {reasons.map((r, i) => (
        <li key={i} className="flex gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
          <span className="mono-value shrink-0 pt-0.5 text-sm font-bold text-trail">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-base leading-snug text-ink">{r}</span>
        </li>
      ))}
    </ol>
  );
}
