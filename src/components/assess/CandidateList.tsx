import { Leaf, Nut, Sprout } from "lucide-react";
import type { Species, TierScore } from "../../engine/types.ts";
import { matchPercent } from "../../lib/format.ts";

export default function CandidateList({
  scores,
  species,
}: {
  scores: TierScore[];
  species: Map<string, Species>;
}) {
  return (
    <section aria-labelledby="candidates-h">
      <h2 id="candidates-h" className="text-2xl font-bold">
        Candidates
      </h2>
      <ol className="mt-2 grid gap-2">
        {scores.map((s) => {
          const sp = species.get(s.speciesId);
          const Icon = sp?.category === "mushroom" ? Nut : sp?.category === "plant" ? Leaf : Sprout;
          return (
            <li key={s.speciesId} className="rounded-2xl border border-black/10 p-3">
              <div className="flex items-center gap-2">
                <Icon size={22} aria-hidden />
                <p className="font-semibold">
                  {sp?.common_names[0] ?? s.speciesId}
                  {sp && <span className="font-normal italic opacity-70"> · {sp.scientific_name}</span>}
                </p>
                <span className="ml-auto text-base font-semibold">{matchPercent(s.similarity)}</span>
              </div>
              <div
                role="img"
                aria-label={`Match score ${matchPercent(s.similarity)} out of 100 for ${sp?.common_names[0] ?? s.speciesId}`}
                className="mt-2 h-3 overflow-hidden rounded-full bg-black/10"
              >
                <div className="h-full rounded-full bg-(--color-trail)" style={{ width: `${matchPercent(s.similarity)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
