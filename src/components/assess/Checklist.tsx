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
  { re: /gill/i, icon: Layers, tag: "GILLS" },
  { re: /spore/i, icon: CircleDot, tag: "SPORE PRINT" },
  { re: /\bstems?\b|stalk|stipe/i, icon: Ruler, tag: "STEM" },
  { re: /\brings?\b|volva|\bcups?\b/i, icon: CircleDot, tag: "RING/VOLVA" },
  { re: /\bcaps?\b/i, icon: Mountain, tag: "CAP" },
  { re: /leaf|leaves|margin/i, icon: Leaf, tag: "LEAF" },
  { re: /berr|fruit|drupe/i, icon: Cherry, tag: "FRUIT" },
  { re: /smell|odou?r/i, icon: Wind, tag: "ODOUR" },
  { re: /habitat|grow|soil|wood|\btrees?\b/i, icon: TreePine, tag: "HABITAT" },
  { re: /colou?r/i, icon: Eye, tag: "COLOUR" },
];
const DEFAULT_HINT: Pick<Hint, "icon" | "tag"> = { icon: Eye, tag: "FEATURE" };

function hintFor(text: string): Pick<Hint, "icon" | "tag"> {
  return HINTS.find((h) => h.re.test(text)) ?? DEFAULT_HINT;
}

export default function Checklist({ items }: { items: string[] }) {
  const [ticked, setTicked] = useState<boolean[]>(() => items.map(() => false));
  if (items.length === 0) return null;
  const count = ticked.filter(Boolean).length;
  const complete = count === items.length;
  return (
    <section aria-labelledby="checklist-h" className="grid gap-3">
      <SectionHeader
        id="checklist-h"
        eyebrow="03 · PHYSICAL CHECKLIST"
        title="Verification checklist"
        right={
          <Pill tone={complete ? "ok" : "neutral"} dot={complete}>
            {count}/{items.length} TICKED
          </Pill>
        }
      />
      <p className="text-base text-ink-muted">
        Tap to tick as you confirm each feature in the field. Ticking never changes the
        verdict — it is your own record of what you checked.
      </p>
      <ul className="grid gap-2">
        {items.map((item, i) => {
          const isTicked = ticked[i] ?? false;
          const hint = hintFor(item);
          const HintIcon = hint.icon;
          return (
            <li key={i}>
              <label
                className={`flex min-h-16 cursor-pointer items-center gap-4 tac-card p-3 tac-press select-none ${
                  isTicked ? "border-trail" : ""
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
                  className={`flex size-11 shrink-0 items-center justify-center rounded-tac-sm border-2 shadow-inset transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-trail-glow ${
                    isTicked ? "border-trail bg-trail text-on-trail" : "border-line-strong bg-surface-2"
                  }`}
                >
                  {isTicked && <Check size={26} strokeWidth={3} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`mono-label flex items-center gap-1.5 ${isTicked ? "text-trail" : "text-ink-muted"}`}
                  >
                    <HintIcon size={20} strokeWidth={2.25} aria-hidden />
                    {hint.tag}
                  </span>
                  <span className="mt-1 block text-lg leading-snug text-ink">{item}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
