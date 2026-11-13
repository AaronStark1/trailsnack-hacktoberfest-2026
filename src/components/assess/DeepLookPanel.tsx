import { Check, CircleSlash, EyeOff, X } from "lucide-react";
import type { DeepLookJson } from "../../engine/deepLookSchema.ts";
import Button from "../ui/Button.tsx";

type DecoderState = "live" | "valid" | "aborted" | "fault" | "idle";

function decoderState(streaming: string, result: DeepLookJson | null, running: boolean): DecoderState {
  if (streaming.startsWith("Deep Look cancelled")) return "aborted";
  if (streaming.startsWith("Deep Look could not finish")) return "fault";
  if (result) return "valid";
  return running ? "live" : "idle";
}

const TAG = "mono-label inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5";

function StateTag({ state }: { state: DecoderState }) {
  switch (state) {
    case "live":
      return (
        <span className={`${TAG} border-violet-ink/50 text-violet-ink`}>
          <span aria-hidden className="size-1.5 rounded-full bg-current animate-pulse-soft" />
          Generating
        </span>
      );
    case "valid":
      return (
        <span className={`${TAG} border-violet-ink/50 text-violet-ink`}>
          <Check size={13} aria-hidden /> Valid JSON
        </span>
      );
    case "aborted":
      return (
        <span className={`${TAG} border-caution/60 text-caution`}>
          <CircleSlash size={13} aria-hidden /> Cancelled
        </span>
      );
    case "fault":
      return (
        <span className={`${TAG} border-danger/60 text-danger-ink`}>
          <X size={13} aria-hidden /> Failed
        </span>
      );
    default:
      return <span className={`${TAG} border-line-strong text-ink-muted`}>Stopped</span>;
  }
}

function Findings({
  label,
  icon,
  ink,
  items,
}: {
  label: string;
  icon: React.ReactNode;
  ink: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 grid gap-1.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4">
      <p className={`mono-label flex items-center gap-1.5 pt-1 ${ink}`}>
        {icon}
        {label}
      </p>
      <ul className="grid gap-1">
        {items.map((item, i) => (
          <li key={i} className={`text-[0.9375rem] leading-snug ${ink === "text-ink-faint" ? "text-ink-muted" : "text-ink"}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tier 2 Deep Look transcript, in elderberry. It shows exactly what the worker
 * emits: the raw token stream while Gemma 4 is generating, then the parsed,
 * schema-constrained JSON as readable findings. Nothing is synthesised here —
 * while a run is in flight with no tokens yet it says so, and the Cancel
 * button is wired to the worker's real abort.
 */
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
  if (!streaming && !result && !cancellable) return null;
  const state = decoderState(streaming, result, cancellable);
  const photoIssues = result ? result.photo_quality_issues.filter((q) => q !== "none") : [];
  return (
    <section aria-labelledby="deeplook-h" aria-live="polite" className="grid gap-4 animate-rise-in">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-violet-ink/25 pt-5">
        <div>
          <p className="mono-label text-violet-ink">Gemma 4 E2B · on-device · JSON-schema constrained</p>
          <h3 id="deeplook-h" className="display mt-2 text-display-sm text-ink">
            Feature transcript
          </h3>
        </div>
        <StateTag state={state} />
      </div>

      {cancellable && onCancel && (
        <Button variant="secondary" onClick={onCancel} className="w-full border-danger/70 text-danger-ink hover:border-danger">
          <X size={20} strokeWidth={2.4} aria-hidden /> Cancel Deep Look
        </Button>
      )}

      {result ? (
        <div className="grid gap-5 rounded-field border border-violet-ink/25 bg-bg/60 p-4 sm:p-5">
          <div>
            <p className="mono-label text-ink-faint">Observed features</p>
            {result.observed_features.length > 0 ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {result.observed_features.map((feature, i) => (
                  <li
                    key={i}
                    className="rounded-full border border-violet-ink/35 bg-violet-bg px-3 py-1.5 text-[0.875rem] leading-snug text-ink"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[0.9375rem] text-ink-muted">The model reported no observed features.</p>
            )}
          </div>

          {result.candidate_assessments.map((c) => (
            <div key={c.species_id} className="border-t border-line pt-4">
              <p className="mono-label text-ink-faint">Checked against</p>
              <p className="mono-value mt-1 font-medium break-all text-ink">{c.species_id}</p>
              <Findings
                label="Confirmed"
                icon={<Check size={13} aria-hidden />}
                ink="text-violet-ink"
                items={c.confirmed}
              />
              <Findings
                label="Contradicted"
                icon={<X size={13} aria-hidden />}
                ink="text-danger-ink"
                items={c.contradicted}
              />
              <Findings
                label="Not visible"
                icon={<EyeOff size={13} aria-hidden />}
                ink="text-ink-faint"
                items={c.not_visible}
              />
            </div>
          ))}

          {photoIssues.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
              <span className="mono-label mr-1 text-caution">Photo quality</span>
              {photoIssues.map((q) => (
                <span key={q} className={`${TAG} border-caution/50 bg-caution-bg text-caution`}>
                  {q.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          aria-label={state === "live" ? "Deep Look generating" : "Deep Look output"}
          className="relative max-h-72 min-h-24 overflow-auto rounded-field border border-violet-ink/25 bg-bg/60 p-4 font-mono text-[0.8125rem] leading-relaxed break-words whitespace-pre-wrap text-ink"
        >
          {streaming || <span className="text-ink-muted">Waiting for the first tokens from the model…</span>}
          {state === "live" && (
            <span aria-hidden className="ml-0.5 text-violet-ink animate-pulse-soft">
              ▌
            </span>
          )}
        </div>
      )}

      <p className="text-[0.875rem] leading-snug text-ink-muted">
        This is a model-generated description of the photo, not a verdict. It can lower the verdict above
        through the safety engine; it can never raise it.
      </p>
    </section>
  );
}
