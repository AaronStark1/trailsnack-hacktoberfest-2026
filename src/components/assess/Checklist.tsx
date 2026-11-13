import { useState } from "react";
import { Check, Cherry, CircleDot, Eye, Layers, Leaf, Mountain, Ruler, TreePine, Wind } from "lucide-react";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

interface Hint {
  re: RegExp;
  icon: typeof Eye;
  tag: string;
}

/** Diagnostic hint by keyword — first match wins, case-insensitive. */
const HINTS: Hint[] = [
  { re: /gill/i, icon: Layers, tag: "Gills" },
  { re: /spore/i, icon: CircleDot, tag: "Spore print" },
  { re: /\bstems?\b|stalk|stipe/i, icon: Ruler, tag: "Stem" },
  { re: /\brings?\b|volva|\bcups?\b/i, icon: CircleDot, tag: "Ring / volva" },
  { re: /\bcaps?\b/i, icon: Mountain, tag: "Cap" },
  { re: /leaf|leaves|margin/i, icon: Leaf, tag: "Leaf" },
  { re: /berr|fruit|drupe/i, icon: Cherry, tag: "Fruit" },
  { re: /smell|odou?r/i, icon: Wind, tag: "Odour" },
  { re: /habitat|grow|soil|wood|\btrees?\b/i, icon: TreePine, tag: "Habitat" },
  { re: /colou?r/i, icon: Eye, tag: "Colour" },
];
const DEFAULT_HINT: Pick<Hint, "icon" | "tag"> = { icon: Eye, tag: "Feature" };

function hintFor(text: string): Pick<Hint, "icon" | "tag"> {
  return HINTS.find((h) => h.re.test(text)) ?? DEFAULT_HINT;
}

/**
 * Field verification checklist. The items are the safety engine's checklist
 * for this verdict, word for word from the reference database. Ticks are the
 * user's own record only: they are never read back into the verdict.
 */
export default function Checklist({ items }: { items: string[] }) {
  const [ticked, setTicked] = useState<boolean[]>(() => items.map(() => false));
  if (items.length === 0) return null;
  const count = ticked.filter(Boolean).length;
  const complete = count === items.length;
  return (
    <section aria-labelledby="checklist-h" className="grid gap-4">
      <SectionHeader
        id="checklist-h"
        eyebrow="In the field"
        title="Verification checklist"
        right={
          <Pill tone={complete ? "accent" : "neutral"} dot={complete}>
            {count}/{items.length} checked
          </Pill>
        }
      />
      <p className="text-ink-muted">
        Tap to tick as you confirm each feature in the field. Ticking never changes the
        verdict — it is your own record of what you checked.
      </p>
      <ul className="plate divide-y divide-line overflow-hidden">
        {items.map((item, i) => {
          const isTicked = ticked[i] ?? false;
          const hint = hintFor(item);
          const HintIcon = hint.icon;
          return (
            <li key={i}>
              <label
                className={`relative flex min-h-16 cursor-pointer items-center gap-4 p-4 select-none press sm:px-5 ${
                  isTicked ? "bg-surface-3/50" : "hover:bg-surface-3/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isTicked}
                  onChange={() =>
                    setTicked((t) => t.map((v, j) => (j === i ? !v : v)))
                  }
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border-2 transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-amber-bright ${
                    isTicked
                      ? "border-amber bg-amber text-on-amber"
                      : "border-line-strong bg-surface-2 shadow-inset"
                  }`}
                >
                  {isTicked && <Check size={22} strokeWidth={3} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`mono-label flex items-center gap-1.5 ${isTicked ? "text-amber" : "text-ink-faint"}`}
                  >
                    <HintIcon size={14} strokeWidth={2} aria-hidden />
                    {hint.tag}
                  </span>
                  <span className={`mt-1.5 block leading-snug ${isTicked ? "text-ink-muted" : "text-ink"}`}>{item}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-[0.875rem] leading-snug text-ink-muted">
        <strong className="text-ink">A finished checklist is not proof of edibility.</strong> It helps you
        look carefully; only a qualified local expert can confirm a wild specimen.
      </p>
    </section>
  );
}
