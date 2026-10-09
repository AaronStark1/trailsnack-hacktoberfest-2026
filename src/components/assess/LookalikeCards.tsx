import { ShieldAlert } from "lucide-react";
import type { Species } from "../../engine/types.ts";

export default function LookalikeCards({
  lookalikes,
  tellApart,
}: {
  lookalikes: Species[];
  tellApart: Map<string, string>;
}) {
  if (lookalikes.length === 0) return null;
  return (
    <section aria-labelledby="lookalikes-h">
      <h2 id="lookalikes-h" className="text-2xl font-bold text-(--color-danger)">
        Hazardous lookalikes
      </h2>
      <div className="mt-2 grid gap-2">
        {lookalikes.map((sp) => (
          <article key={sp.id} className="rounded-2xl border-2 border-(--color-danger)/40 bg-(--color-danger-bg) p-3">
            <div className="flex items-center gap-2 text-(--color-danger)">
              <ShieldAlert size={22} aria-hidden />
              <p className="font-bold">
                {sp.common_names[0]} <span className="font-normal italic">· {sp.scientific_name}</span>
              </p>
            </div>
            <p className="mt-1 font-semibold">Edibility: {sp.edibility.replaceAll("_", " ")}</p>
            {tellApart.get(sp.id) && <p className="mt-1">How to tell apart: {tellApart.get(sp.id)}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
