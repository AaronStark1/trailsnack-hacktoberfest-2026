import { Cherry, Leaf, Nut, Sprout } from "lucide-react";
import type { Category, Species, TierScore } from "../../engine/types.ts";
import { matchPercent } from "../../lib/format.ts";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

const categoryMeta: Record<Category, { icon: typeof Leaf; tag: string }> = {
  mushroom: { icon: Nut, tag: "FUNGI" },
  plant: { icon: Leaf, tag: "FOLIAGE" },
  berry: { icon: Cherry, tag: "BERRY" },
};
const unknownCategory = { icon: Sprout, tag: "SPECIMEN" };

/** Hairline ticks at every 10% of the match spectrum. */
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export default function CandidateList({
  scores,
  species,
}: {
  scores: TierScore[];
  species: Map<string, Species>;
}) {
  return (
    <section aria-labelledby="candidates-h" className="grid gap-3">
      <SectionHeader
        id="candidates-h"
        eyebrow="02 · SPECIMEN MATCH SPECTRUM"
        title="Candidates"
        right={<Pill tone="neutral">{scores.length} RANKED</Pill>}
      />
      <ol className="grid gap-2">
        {scores.map((s, i) => {
          const sp = species.get(s.speciesId);
          const cat = sp ? categoryMeta[sp.category] : unknownCategory;
          const Icon = cat.icon;
          const name = sp?.common_names[0] ?? s.speciesId;
          const pct = matchPercent(s.similarity);
          return (
            <li key={s.speciesId} className="tac-card p-3">
              <div className="flex items-center gap-3">
                <span className="well flex size-12 shrink-0 items-center justify-center rounded-tac text-trail">
                  <Icon size={24} strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono-label text-ink-muted">{cat.tag}</span>
                    {i === 0 && <Pill tone="trail">TOP</Pill>}
                  </div>
                  <p className="mt-1 truncate font-bold leading-tight text-ink">{name}</p>
                  {sp && <p className="truncate text-base italic text-ink-muted">{sp.scientific_name}</p>}
                </div>
                <p className="mono-value shrink-0 text-2xl font-black leading-none text-ink">
                  {pct}
                  <span className="ml-0.5 text-sm font-bold text-ink-muted">%</span>
                </p>
              </div>

              <div
                role="img"
                aria-label={`Match score ${pct} out of 100 for ${name}`}
                className="well relative mt-3 h-4 overflow-hidden rounded-tac-sm"
              >
                <div className="absolute inset-y-0 left-0 bg-trail" style={{ width: `${pct}%` }} />
                {TICKS.map((t) => (
                  <span
                    key={t}
                    className="absolute inset-y-0 w-px bg-line-strong"
                    style={{ left: `${t}%` }}
                  />
                ))}
              </div>
              <div aria-hidden className="mono-label mt-1 flex justify-between px-0.5 text-ink-muted">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
