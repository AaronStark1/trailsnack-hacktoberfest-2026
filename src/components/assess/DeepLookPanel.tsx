import { Terminal, X } from "lucide-react";
import type { DeepLookJson } from "../../engine/deepLookSchema.ts";
import SectionHeader from "../ui/SectionHeader.tsx";

type DecoderState = "live" | "valid" | "aborted" | "fault";

function decoderState(streaming: string, result: DeepLookJson | null): DecoderState {
  if (streaming.startsWith("Deep Look cancelled")) return "aborted";
  if (streaming.startsWith("Deep Look could not finish")) return "fault";
  if (result) return "valid";
  return "live";
}

/* The terminal is deliberately a dark instrument in both modes (spec
   exception), so its chrome uses local colours rather than page tokens. */
const TERMINAL =
  "overflow-hidden rounded-tac-lg border border-line-strong bg-[#0d100f] text-[#cfe3d6] shadow-card dark:bg-[#0b0b0a] dark:text-ink";
const TERMINAL_GRID =
  "bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:24px_24px]";
const HEADER_TAG = "rounded-tac-sm border border-current/30 px-1.5 py-1";
const FAULT_INK = "text-[#ff6b63]";

function StateTag({ state }: { state: DecoderState }) {
  switch (state) {
    case "live":
      return (
        <span className={`${HEADER_TAG} flex items-center gap-1.5 text-trail-glow`}>
          LIVE <span aria-hidden className="animate-blink">●</span>
        </span>
      );
    case "valid":
      return <span className={`${HEADER_TAG} text-trail-glow`}>VALID JSON ✓</span>;
    case "aborted":
      return <span className={`${HEADER_TAG} ${FAULT_INK}`}>ABORTED</span>;
    case "fault":
      return <span className={`${HEADER_TAG} ${FAULT_INK}`}>FAULT</span>;
  }
}

function Line({
  label,
  labelClass,
  textClass = "",
  items,
}: {
  label: string;
  labelClass: string;
  textClass?: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <p className="mt-1.5 grid grid-cols-[6.5rem_1fr] gap-x-3 text-sm leading-relaxed">
      <span className={`mono-label pt-1 ${labelClass}`}>{label}</span>
      <span className={textClass}>{items.join("; ")}</span>
    </p>
  );
}

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
  const state = decoderState(streaming, result);
  const photoIssues = result ? result.photo_quality_issues.filter((q) => q !== "none") : [];
  return (
    <section aria-labelledby="deeplook-h" aria-live="polite" className="grid gap-3">
      <SectionHeader id="deeplook-h" eyebrow="TIER 2 · INSPECTION TRANSCRIPT" title="Deep Look" tone="trail" />

      <div className={TERMINAL}>
        <div className="mono-label flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
          <Terminal size={14} aria-hidden className="shrink-0" />
          <span>TIER 2 · GEMMA 4 · ON-DEVICE</span>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className={`${HEADER_TAG} opacity-80`}>GRAMMAR: JSON SCHEMA</span>
            <span className={`${HEADER_TAG} opacity-80`}>CONSTRAINED DECODE</span>
            <StateTag state={state} />
          </span>
        </div>

        {result ? (
          <div className={`grid gap-4 p-3 ${TERMINAL_GRID}`}>
            <div>
              <p className="mono-label opacity-80">Observed features</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {result.observed_features.map((f, i) => (
                  <li key={i} className="rounded-tac-sm border border-current/30 px-2 py-1 font-mono text-xs">
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {result.candidate_assessments.map((c) => (
              <div key={c.species_id} className="border-t border-white/10 pt-3">
                <p className="font-mono font-bold">{c.species_id}</p>
                <Line label="Confirmed" labelClass="text-trail-glow" items={c.confirmed} />
                <Line
                  label="Contradicted"
                  labelClass={`${FAULT_INK} font-semibold`}
                  textClass={`${FAULT_INK} font-semibold`}
                  items={c.contradicted}
                />
                <Line label="Not visible" labelClass="opacity-70" textClass="opacity-70" items={c.not_visible} />
              </div>
            ))}

            {photoIssues.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
                <span className="mono-label mr-1 text-hazard-yellow">Photo</span>
                {photoIssues.map((q) => (
                  <span
                    key={q}
                    className="rounded-tac-sm border border-hazard-yellow/50 px-2 py-1 font-mono text-xs text-hazard-yellow"
                  >
                    {q.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            aria-label="Deep Look generating"
            className={`relative max-h-72 min-h-24 overflow-auto p-3 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap ${TERMINAL_GRID}`}
          >
            {state === "live" && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-white/5 to-transparent animate-scanline"
              />
            )}
            {streaming || "▸ initialising decoder…"}
            <span aria-hidden className="animate-blink">
              ▌
            </span>
          </div>
        )}
      </div>

      {cancellable && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mono-label flex min-h-14 w-full items-center justify-center gap-2 rounded-tac border-2 border-danger bg-transparent px-4 font-bold text-danger tac-press"
        >
          <X size={18} strokeWidth={2.5} aria-hidden /> Abort Deep Look
        </button>
      )}
    </section>
  );
}
