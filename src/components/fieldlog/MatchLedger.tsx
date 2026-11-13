import { matchPercent } from "../../lib/format.ts";

interface Score {
  speciesId: string;
  similarity: number;
}

/** Tier 1 ledger: index, raw species id (exactly as stored) and a thin similarity meter. */
export default function MatchLedger({ scores }: { scores: Score[] }) {
  return (
    <ol className="well mt-3 overflow-hidden rounded-tac">
      {scores.map((s, i) => {
        const pct = matchPercent(s.similarity);
        return (
          <li
            key={s.speciesId}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line px-3 py-2.5 last:border-b-0"
          >
            <span className={`mono-value text-sm font-bold ${i === 0 ? "text-trail" : "text-ink-muted"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block break-all font-mono text-base font-semibold leading-tight text-ink">
                {s.speciesId}
              </span>
              <span aria-hidden className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-led-off">
                <span
                  className={`block h-full rounded-full ${i === 0 ? "bg-trail-glow" : "bg-line-strong"}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </span>
            <span className="mono-value text-base font-bold text-ink">{(s.similarity * 100).toFixed(0)}%</span>
          </li>
        );
      })}
    </ol>
  );
}
