import { useState } from "react";

export default function ReasonTrace({ reasons }: { reasons: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="reasons-h">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="min-h-12 text-lg font-semibold text-(--color-trail) underline"
      >
        <h2 id="reasons-h" className="inline text-xl">
          {open ? "Hide why this verdict" : "Why this verdict"}
        </h2>
      </button>
      {open && (
        <ol className="mt-2 list-decimal rounded-2xl bg-black/5 p-4 pl-8">
          {reasons.map((r, i) => (
            <li key={i} className="mt-1">
              {r}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
