import { useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";

export default function ReasonTrace({ reasons }: { reasons: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="reasons-h" className="grid gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="well flex min-h-14 w-full items-center justify-between gap-3 rounded-tac px-4 py-2 text-left font-bold text-trail tac-press"
      >
        <span className="flex min-w-0 items-center gap-3">
          <ListChecks size={22} strokeWidth={2.25} aria-hidden className="shrink-0" />
          <span className="min-w-0">
            <span className="mono-label block text-ink-muted">04 · Safety engine trace</span>
            <h2 id="reasons-h" className="mt-1 text-lg font-bold">
              {open ? "Hide why this verdict" : "Why this verdict"}
            </h2>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="mono-label text-ink-muted">{reasons.length} RULES</span>
          <ChevronDown
            size={24}
            strokeWidth={2.5}
            aria-hidden
            className={`transition-transform duration-200 ease-out-soft ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <ol className="overflow-hidden rounded-tac border border-line animate-rise-in">
          {reasons.map((r, i) => (
            <li
              key={i}
              className={`flex gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
                i % 2 === 0 ? "bg-surface" : "bg-surface-2"
              }`}
            >
              <span className="mono-value shrink-0 pt-0.5 text-sm font-bold text-ink-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-base leading-snug text-ink">{r}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
