import { Biohazard, ShieldAlert, Skull, TriangleAlert } from "lucide-react";
import type { Edibility, Species } from "../../engine/types.ts";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

function hazardIcon(edibility: Edibility): typeof ShieldAlert {
  switch (edibility) {
    case "deadly":
      return Skull;
    case "toxic":
      return Biohazard;
    case "contact_hazard":
      return TriangleAlert;
    default:
      return ShieldAlert;
  }
}

function edibilityLabel(edibility: Edibility): string {
  return edibility.replaceAll("_", " ");
}

/** "A; B; C" → separate differences. A single clause stays a paragraph. */
function splitDifferences(text: string): string[] {
  return text
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Hazardous lookalikes, straight from the safety engine's verdict. Rendered
 * immediately under the verdict and in full cranberry so they can never be
 * mistaken for ordinary candidates, and never animated in: hazard information
 * is on screen the moment the verdict is. The "how to tell apart" text is quoted
 * from the bundled reference database only — when it has none, none is shown.
 */
export default function LookalikeCards({
  lookalikes,
  tellApart,
}: {
  lookalikes: Species[];
  tellApart: Map<string, string>;
}) {
  if (lookalikes.length === 0) return null;
  return (
    <section aria-labelledby="lookalikes-h" className="grid gap-4">
      <SectionHeader
        id="lookalikes-h"
        tone="danger"
        eyebrow="Hazard · check first"
        title="Hazardous lookalikes"
        right={
          <Pill tone="danger" dot>
            {lookalikes.length} flagged
          </Pill>
        }
      />
      <div className="grid gap-3">
        {lookalikes.map((sp) => {
          const Icon = hazardIcon(sp.edibility);
          const tell = tellApart.get(sp.id);
          const differences = tell ? splitDifferences(tell) : [];
          const nameId = `lookalike-${sp.id}`;
          return (
            <article
              key={sp.id}
              aria-labelledby={nameId}
              className="overflow-hidden rounded-plate border border-danger/70 bg-danger-bg shadow-plate"
            >
              <div aria-hidden className="thorn-edge text-danger" />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-danger/60 bg-bg/40 text-danger-ink">
                    <Icon size={24} strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 id={nameId} className="font-sans text-xl leading-tight font-bold tracking-normal text-ink">
                      {sp.common_names[0] ?? sp.id}
                    </h3>
                    <p className="sci mt-0.5 text-ink-muted">{sp.scientific_name}</p>
                    <p className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="mono-label text-ink-faint">Reference class</span>
                      <Pill tone="danger" icon={<Icon />}>
                        {edibilityLabel(sp.edibility)}
                      </Pill>
                    </p>
                  </div>
                </div>

                {tell && (
                  <div className="mt-4 border-t border-danger/35 pt-4">
                    <p className="mono-label text-danger-ink">How to tell apart · reference database</p>
                    {differences.length > 1 ? (
                      <ul className="mt-2.5 grid gap-2">
                        {differences.map((d, j) => (
                          <li key={j} className="flex gap-2.5 leading-snug font-medium text-ink">
                            <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-danger" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2.5 leading-snug font-medium text-ink">{tell}</p>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
