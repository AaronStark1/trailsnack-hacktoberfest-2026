import { AlertTriangle, HelpCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Badge, Confidence } from "../../engine/types.ts";

const meta: Record<Badge, { label: string; icon: typeof ShieldCheck; classes: string }> = {
  EDIBLE: { label: "EDIBLE", icon: ShieldCheck, classes: "bg-(--color-edible-bg) text-(--color-edible)" },
  CAUTION: { label: "CAUTION", icon: AlertTriangle, classes: "bg-(--color-caution-bg) text-(--color-caution)" },
  TOXIC: { label: "TOXIC", icon: ShieldAlert, classes: "bg-(--color-danger-bg) text-(--color-danger)" },
  UNKNOWN: { label: "UNKNOWN", icon: HelpCircle, classes: "bg-(--color-unknown-bg) text-(--color-unknown)" },
};

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
    <div className={`rounded-2xl p-5 ${m.classes}`} role="status" aria-label={`Verdict: ${m.label}. ${headline}`}>
      <div className="flex items-center gap-3">
        <Icon size={40} aria-hidden />
        <p className="text-3xl font-extrabold tracking-tight">{m.label}</p>
        <span className="ml-auto rounded-full border border-current px-3 py-1 text-base font-semibold capitalize">
          {confidence}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold">{headline}</p>
    </div>
  );
}
