import type { DeepLookJson } from "../../engine/deepLookSchema.ts";
import Button from "../ui/Button.tsx";

export default function DeepLookPanel({
  streaming,
  result,
  cancellable = false,
  onCancel,
}: {
  streaming: string;
  result: DeepLookJson | null;
  cancellable?: boolean;
  onCancel?: () => void;
}) {
  if (!streaming && !result) return null;
  return (
    <section aria-labelledby="deeplook-h" aria-live="polite">
      <h2 id="deeplook-h" className="text-2xl font-bold">
        Deep Look
      </h2>
      {result ? (
        <div className="mt-2 grid gap-2">
          <div className="rounded-2xl border border-black/10 p-3">
            <p className="font-semibold">Observed features</p>
            <ul className="list-disc pl-6">
              {result.observed_features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          {result.candidate_assessments.map((c) => (
            <div key={c.species_id} className="rounded-2xl border border-black/10 p-3">
              <p className="font-semibold">{c.species_id}</p>
              {c.confirmed.length > 0 && <p>Confirmed: {c.confirmed.join("; ")}</p>}
              {c.contradicted.length > 0 && (
                <p className="font-semibold text-(--color-danger)">Contradicted: {c.contradicted.join("; ")}</p>
              )}
              {c.not_visible.length > 0 && <p className="opacity-80">Not visible: {c.not_visible.join("; ")}</p>}
            </div>
          ))}
          {result.photo_quality_issues.length > 0 && (
            <p className="text-base opacity-80">Photo quality: {result.photo_quality_issues.join(", ")}</p>
          )}
        </div>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="rounded-2xl bg-black/5 p-3" aria-label="Deep Look generating">
            {streaming || "Starting Deep Look…"}
          </p>
          {cancellable && onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel Deep Look
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
