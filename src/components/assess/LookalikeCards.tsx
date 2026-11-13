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
  return edibility.replaceAll("_", " ").toUpperCase();
}

/** "A; B; C" → difference chips. A single clause stays a paragraph. */
function splitDifferences(text: string): string[] {
  return text
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function LookalikeCards({
  lookalikes,
  tellApart,
}: {
  lookalikes: Species[];
  tellApart: Map<string, string>;
}) {
  if (lookalikes.length === 0) return null;
  return (
    <section aria-labelledby="lookalikes-h" className="grid gap-3">
      <SectionHeader
        id="lookalikes-h"
        tone="danger"
        eyebrow="HAZARD · LOOKALIKES FIRST"
        title="Hazardous lookalikes"
        right={
          <Pill tone="danger" dot>
            {lookalikes.length} FLAGGED
          </Pill>
        }
      />
      <div className="grid gap-3">
        {lookalikes.map((sp) => {
          const Icon = hazardIcon(sp.edibility);
          const tell = tellApart.get(sp.id);
          const chips = tell ? splitDifferences(tell) : [];
          const nameId = `lookalike-${sp.id}`;
          return (
            <article
              key={sp.id}
              aria-labelledby={nameId}
              className="rounded-tac-lg border-2 border-l-8 border-danger bg-danger-bg p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="well flex size-14 shrink-0 items-center justify-center rounded-tac text-danger">
                  <Icon size={30} strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id={nameId} className="text-lg font-extrabold leading-tight text-ink">
                    {sp.common_names[0] ?? sp.id}
                  </h3>
                  <p className="mt-0.5 italic text-ink-muted">{sp.scientific_name}</p>
                </div>
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mono-label text-ink-muted">Edibility:</span>
                <Pill tone="danger" icon={<Icon aria-hidden />}>
                  {edibilityLabel(sp.edibility)}
                </Pill>
              </p>

              {tell && (
                <div className="mt-3 border-t border-danger/30 pt-3">
                  <p className="mono-label text-danger">How to tell apart</p>
                  {chips.length > 1 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {chips.map((c, i) => (
                        <li
                          key={i}
                          className="rounded-tac-sm border border-danger/40 bg-surface px-2.5 py-1.5 text-base font-semibold text-ink"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-base font-semibold text-ink">{tell}</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
