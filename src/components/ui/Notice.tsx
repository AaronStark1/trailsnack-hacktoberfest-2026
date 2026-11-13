import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

export type NoticeTone = "info" | "ok" | "warn" | "danger";

interface Props {
  tone?: NoticeTone;
  /** Mono eyebrow above the message, e.g. "Import complete". */
  label?: string;
  children: ReactNode;
  /** Buttons or links, laid out under the message. */
  actions?: ReactNode;
  /** status = polite live region (default); alert = assertive; none = static callout. */
  role?: "status" | "alert" | "note";
  className?: string;
}

const tones: Record<NoticeTone, { frame: string; ink: string; icon: typeof Info }> = {
  info: { frame: "border-line-strong bg-surface", ink: "text-ink-muted", icon: Info },
  ok: { frame: "border-glow/30 bg-spruce/35", ink: "text-glow", icon: CircleCheck },
  warn: { frame: "border-caution/50 bg-caution-bg", ink: "text-caution", icon: TriangleAlert },
  danger: { frame: "border-danger/60 bg-danger-bg", ink: "text-danger-ink", icon: CircleAlert },
};

/**
 * Inline banner for feedback, warnings and failures. Every tone pairs its
 * colour with a distinct icon and a text label, so it never relies on colour.
 */
export default function Notice({ tone = "info", label, children, actions, role = "status", className = "" }: Props) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div role={role} className={`rounded-plate border p-4 animate-rise-in ${t.frame} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon size={22} aria-hidden className={`mt-0.5 shrink-0 ${t.ink}`} />
        <div className="min-w-0 flex-1">
          {label && <p className={`mono-label mb-1.5 ${t.ink}`}>{label}</p>}
          <div className="break-words text-ink">{children}</div>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2 pl-[34px]">{actions}</div>}
    </div>
  );
}
