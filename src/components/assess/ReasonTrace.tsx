import { useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";

/** Collapsible trace of the safety engine's own reasons, shown verbatim and in order. */
export default function ReasonTrace({ reasons }: { reasons: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="reasons-h" className="plate overflow-hidden">
      <h2 className="font-sans tracking-normal">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="reasons-list"
          className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left press hover:bg-surface-3/40 sm:px-5"
        >
          <span className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-ink-muted">
              <ListChecks size={20} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="mono-label block text-ink-faint">Engine trace · {reasons.length} rules</span>
              <span id="reasons-h" className="mt-1 block text-lg leading-tight font-semibold text-ink">
                {open ? "Hide why this verdict" : "Why this verdict"}
              </span>
            </span>
          </span>
          <ChevronDown
            size={22}
            aria-hidden
            className={`shrink-0 text-amber transition-transform duration-300 ease-spring ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      {open && (
        <ol id="reasons-list" className="divide-y divide-line border-t border-line animate-fade-in">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-3.5 px-4 py-3.5 sm:px-5">
              <span className="mono-value w-6 shrink-0 pt-0.5 text-sm text-amber">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-snug text-ink">{r}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
