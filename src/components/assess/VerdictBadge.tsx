import { AlertTriangle, HelpCircle, Info, ShieldAlert, ShieldCheck, Skull } from "lucide-react";
import type { Badge, Confidence } from "../../engine/types.ts";

interface SealMeta {
  label: string;
  /** The contract icon: tests query this exact Lucide class per badge. */
  icon: typeof ShieldCheck;
  /** Border + fill, as one literal class string (Tailwind scans literals only). */
  frame: string;
  /** Verdict ink. */
  ink: string;
  /** Tone used for the light pool behind the word. */
  pool: string;
  /** One-line instruction under the word. */
  banner: string;
  /** Hazard verdicts carry the thorn edge. */
  thorns: boolean;
}

/* EDIBLE is a muted lichen, never the positive glow: a reference match is not
   a go signal. UNKNOWN is deliberately bare and dashed — nothing was found. */
const meta: Record<Badge, SealMeta> = {
  EDIBLE: {
    label: "EDIBLE",
    icon: ShieldCheck,
    frame: "border-edible-line bg-edible-bg",
    ink: "text-edible",
    pool: "bg-edible",
    banner: "Reference match only — verify every checklist item before any contact",
    thorns: false,
  },
  CAUTION: {
    label: "CAUTION",
    icon: AlertTriangle,
    frame: "border-caution/70 bg-caution-bg",
    ink: "text-caution",
    pool: "bg-caution",
    banner: "Lookalike hazard — verify before any contact",
    thorns: true,
  },
  TOXIC: {
    label: "TOXIC",
    icon: ShieldAlert,
    frame: "border-danger bg-danger-bg",
    ink: "text-danger-ink",
    pool: "bg-danger",
    banner: "Do not touch or ingest",
    thorns: true,
  },
  UNKNOWN: {
    label: "UNKNOWN",
    icon: HelpCircle,
    frame: "border-dashed border-unknown/60 bg-unknown-bg",
    ink: "text-unknown",
    pool: "bg-unknown",
    banner: "Unidentified — treat as toxic",
    thorns: false,
  },
};

/**
 * Field verdict banner. Presentation only: badge, headline and confidence come
 * straight from the deterministic safety engine and are shown verbatim.
 * Self-contained (also rendered by FieldLogDetail): the verdict word is the
 * only element whose full text is the badge, the headline <p> the only one
 * with the headline, the capsule the only one with the confidence word. Every
 * verdict — EDIBLE included — carries the standing "not proof of edibility"
 * notice.
 */
export default function VerdictBadge({
  badge,
  headline,
  confidence,
}: {
  badge: Badge;
  headline: string;
  confidence: Confidence;
}) {
  const m = meta[badge];
  const Icon = m.icon;
  return (
    <div
      role="status"
      aria-label={`Verdict: ${m.label}. ${headline}`}
      className={`relative overflow-hidden rounded-plate border-2 shadow-plate ${m.frame}`}
    >
      {m.thorns && <div aria-hidden className={`thorn-edge ${m.ink}`} />}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-[0.13] blur-3xl hc:hidden ${m.pool}`}
      />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className={`mono-label flex items-center gap-2 ${m.ink}`}>
            <span aria-hidden className="h-px w-5 bg-current opacity-70" />
            Field verdict
          </p>
          <p className="flex items-center gap-2">
            <span className="mono-label text-ink-faint">Confidence</span>
            <span className={`mono-label rounded-full border border-current px-2.5 py-1.5 ${m.ink}`}>{confidence}</span>
          </p>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <span
            className={`flex size-14 shrink-0 items-center justify-center rounded-full border border-current/45 bg-bg/40 sm:size-16 ${m.ink}`}
          >
            <Icon size={32} strokeWidth={1.9} aria-hidden />
          </span>
          <span
            className={`display origin-left text-[clamp(4rem,2.75rem+7vw,6.5rem)] leading-[0.86] animate-seal-in ${m.ink}`}
          >
            {m.label}
          </span>
        </div>

        <p className={`mt-5 flex items-center gap-2.5 text-[0.9375rem] leading-snug font-bold tracking-wide uppercase ${m.ink}`}>
          {badge === "TOXIC" && <Skull size={20} strokeWidth={2.1} aria-hidden className="shrink-0" />}
          {m.banner}
        </p>

        <p className="mt-2.5 text-xl leading-snug font-semibold text-ink">{headline}</p>

        <div className="mt-5 flex items-start gap-3 rounded-field border border-line-strong bg-bg/55 p-3.5">
          <Info size={20} aria-hidden className="mt-0.5 shrink-0 text-amber" />
          <p className="text-[0.9375rem] leading-snug text-ink-muted">
            <strong className="text-ink">Not proof of edibility.</strong> An identification can be wrong. Never
            eat a wild specimen on the strength of this app alone — confirm with a qualified local expert.
          </p>
        </div>

        <p className="mono-label mt-4 text-ink-faint">Deterministic safety engine · worst case wins</p>
      </div>
    </div>
  );
}
