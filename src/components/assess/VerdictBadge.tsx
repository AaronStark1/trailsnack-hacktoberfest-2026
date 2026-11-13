import { AlertTriangle, HelpCircle, ShieldAlert, ShieldCheck, Skull } from "lucide-react";
import type { Badge, Confidence } from "../../engine/types.ts";

interface SealMeta {
  label: string;
  /** The contract icon: tests query this exact Lucide class per badge. */
  icon: typeof ShieldCheck;
  /** Left rim + fill + ink, as one literal class string (Tailwind scans literals only). */
  frame: string;
  /** Thin top band: hazard stripes for hazards, a solid rule otherwise. */
  band: string;
  banner: string;
}

const meta: Record<Badge, SealMeta> = {
  EDIBLE: {
    label: "EDIBLE",
    icon: ShieldCheck,
    frame: "border-l-edible bg-edible-bg text-edible",
    band: "bg-edible h-3",
    banner: "REFERENCE MATCH ONLY — VERIFY 100% OF FIELD CHECKLIST BEFORE TOUCH",
  },
  CAUTION: {
    label: "CAUTION",
    icon: AlertTriangle,
    frame: "border-l-caution bg-caution-bg text-caution",
    band: "hazard-stripes h-3",
    banner: "LOOKALIKE HAZARD — VERIFY BEFORE ANY CONTACT",
  },
  TOXIC: {
    label: "TOXIC",
    icon: ShieldAlert,
    frame: "border-l-danger bg-danger-bg text-danger",
    band: "hazard-stripes-red h-3",
    banner: "DO NOT TOUCH OR INGEST",
  },
  UNKNOWN: {
    label: "UNKNOWN",
    icon: HelpCircle,
    frame: "border-l-unknown bg-unknown-bg text-unknown",
    band: "bg-unknown h-3",
    banner: "UNIDENTIFIED — TREAT AS TOXIC",
  },
};

/**
 * Field Verdict Seal. Self-contained (also rendered by FieldLogDetail): the
 * stamp span is the only element whose full text is the badge word, the
 * headline <p> the only one with the headline, the pill the only one with
 * the confidence word.
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
      className={`tac-card topo overflow-hidden border-l-8 p-0 ${m.frame}`}
    >
      <div aria-hidden className={m.band} />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="well flex size-16 shrink-0 items-center justify-center rounded-tac">
            <Icon size={44} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="stamp text-3xl sm:text-4xl animate-stamp-in">{m.label}</span>
          <span className="ml-auto flex flex-col items-end gap-1">
            <span className="mono-label">Confidence</span>
            <span className="mono-label rounded-tac-sm border border-current px-2.5 py-2 capitalize">{confidence}</span>
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-tac-sm bg-current/10 px-3 py-2">
          {badge === "TOXIC" && <Skull size={22} strokeWidth={2.25} aria-hidden className="shrink-0" />}
          <p className="display-caps text-sm leading-[1.15] tracking-wide sm:text-base">{m.banner}</p>
        </div>

        <p className="mt-3 text-xl font-semibold text-ink">{headline}</p>

        <p className="mono-label mt-4 border-t border-current/20 pt-3">
          Field verdict · Deterministic safety engine · Worst case wins
        </p>
      </div>
    </div>
  );
}
