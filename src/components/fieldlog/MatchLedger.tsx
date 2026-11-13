import { matchPercent } from "../../lib/format.ts";

interface Score {
  speciesId: string;
  similarity: number;
}

/**
 * Tier 1 ledger: rank, raw species id (exactly as stored) and a thin
 * similarity meter. Similarity is embedding closeness — never a probability
 * of edibility — so the meter stays in neutral cream and amber.
 */
export default function MatchLedger({ scores }: { scores: Score[] }) {
  return (
    <ol className="well overflow-hidden rounded-field">
      {scores.map((s, i) => {
        const pct = matchPercent(s.similarity);
        return (
          <li
            key={s.speciesId}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <span className={`mono-value text-sm ${i === 0 ? "text-amber" : "text-ink-faint"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[0.9375rem] leading-tight break-all text-ink">{s.speciesId}</span>
              <span aria-hidden className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-surface-3">
                <span
                  className={`block h-full rounded-full ${i === 0 ? "bg-amber" : "bg-ink-faint"}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </span>
            <span className="mono-value text-[0.9375rem] text-ink">{(s.similarity * 100).toFixed(0)}%</span>
          </li>
        );
      })}
    </ol>
  );
}
