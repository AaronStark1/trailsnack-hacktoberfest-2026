import type { CSSProperties } from "react";
import { Cherry, Cpu, Database, Leaf, Nut, Sprout } from "lucide-react";
import type { Category, Edibility, Species, TierScore } from "../../engine/types.ts";
import { matchPercent } from "../../lib/format.ts";
import Pill, { type PillTone } from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

const categoryMeta: Record<Category, { icon: typeof Leaf; tag: string }> = {
  mushroom: { icon: Nut, tag: "Fungus" },
  plant: { icon: Leaf, tag: "Plant" },
  berry: { icon: Cherry, tag: "Berry" },
};
const unknownCategory = { icon: Sprout, tag: "Not in database" };

/* The reference database's own edibility class, shown as recorded. Never
   green: "edible with caution" stays a neutral chip, not an invitation. */
const edibilityTone: Record<Edibility, PillTone> = {
  edible_with_caution: "neutral",
  not_recommended: "warn",
  toxic: "danger",
  deadly: "danger",
  contact_hazard: "danger",
};

export default function CandidateList({
  scores,
  species,
}: {
  scores: TierScore[];
  species: Map<string, Species>;
}) {
  return (
    <section aria-labelledby="candidates-h" className="grid gap-4">
      <SectionHeader
        id="candidates-h"
        eyebrow="Tier 1 · visual match"
        title="Candidates"
        right={<Pill tone="neutral">{scores.length} ranked</Pill>}
      />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8125rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Cpu size={14} aria-hidden className="text-amber" /> Ranking and score: on-device model
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Database size={14} aria-hidden className="text-amber" /> Names and class: bundled reference database
        </span>
      </div>

      <ol className="plate divide-y divide-line overflow-hidden">
        {scores.map((s, i) => {
          const sp = species.get(s.speciesId);
          const cat = sp ? categoryMeta[sp.category] : unknownCategory;
          const Icon = cat.icon;
          const name = sp?.common_names[0] ?? s.speciesId;
          const pct = matchPercent(s.similarity);
          const top = i === 0;
          return (
            <li
              key={s.speciesId}
              style={{ "--i": i } as CSSProperties}
              className={`relative p-4 animate-rise-in sm:px-5 ${top ? "bg-surface-3/45" : ""}`}
            >
              <div className="flex items-start gap-3.5">
                <span className="mono-value w-6 shrink-0 pt-3 text-sm text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full border bg-surface-2 ${
                    top ? "border-amber/55 text-amber" : "border-line-strong text-ink-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-tight font-semibold break-words text-ink">{name}</p>
                  {sp && <p className="sci mt-0.5 leading-snug break-words text-ink-muted">{sp.scientific_name}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-1.5">
                    {top && <Pill tone="accent">Closest match</Pill>}
                    <Pill tone="neutral">{cat.tag}</Pill>
                    {sp && (
                      <Pill tone={edibilityTone[sp.edibility]} title="Class recorded in the reference database">
                        Ref: {sp.edibility.replaceAll("_", " ")}
                      </Pill>
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="mono-value block text-2xl leading-none font-medium text-ink">
                    {pct}
                    <span className="ml-0.5 text-sm text-ink-muted">%</span>
                  </span>
                  <span className="mono-label mt-1.5 block text-ink-faint">similarity</span>
                </p>
              </div>

              <div
                role="img"
                aria-label={`Similarity score ${pct} out of 100 for ${name}`}
                className="mt-3.5 ml-[2.375rem] h-1.5 overflow-hidden rounded-full bg-surface-2 shadow-inset"
              >
                <div
                  className={`h-full rounded-full ${top ? "bg-amber" : "bg-ink-faint"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[0.875rem] leading-snug text-ink-muted">
        Similarity measures how closely the photo resembles reference descriptions. It is not a probability, and it
        says nothing about whether a specimen is safe to eat.
      </p>
    </section>
  );
}
