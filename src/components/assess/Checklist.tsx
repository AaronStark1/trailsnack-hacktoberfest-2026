import { useState } from "react";

export default function Checklist({ items }: { items: string[] }) {
  const [ticked, setTicked] = useState<boolean[]>(() => items.map(() => false));
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="checklist-h">
      <h2 id="checklist-h" className="text-2xl font-bold">
        Verification checklist
      </h2>
      <p className="mt-1 text-base opacity-80">
        Tap to tick as you confirm each feature in the field. Ticking never changes the
        verdict — it is your own record of what you checked.
      </p>
      <ul className="mt-2 grid gap-2">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-black/10 p-3">
              <input
                type="checkbox"
                checked={ticked[i] ?? false}
                onChange={() =>
                  setTicked((t) => t.map((v, j) => (j === i ? !v : v)))
                }
                className="mt-1 h-6 w-6 accent-[#1E5A3A]"
              />
              <span className="text-lg">{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
