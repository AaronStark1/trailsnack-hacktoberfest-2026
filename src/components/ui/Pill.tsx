import type { ReactNode } from "react";

export type PillTone = "neutral" | "trail" | "ok" | "warn" | "danger";

interface Props {
  children: ReactNode;
  tone?: PillTone;
  icon?: ReactNode;
  /** Draw a status LED dot before the text. */
  dot?: boolean;
  /** Pulse the LED (loading / live). */
  live?: boolean;
  title?: string;
  className?: string;
}

const tones: Record<PillTone, string> = {
  neutral: "border-line-strong bg-surface text-ink-muted",
  trail: "border-trail/40 bg-surface text-trail",
  ok: "border-edible/40 bg-edible-bg text-edible",
  warn: "border-caution/50 bg-caution-bg text-caution",
  danger: "border-danger/50 bg-danger-bg text-danger",
};

/**
 * Telemetry pill: monospaced, uppercase, etched. Non-interactive by design;
 * wrap a rack of pills in one ≥52px link or button when it needs to be tappable.
 */
export default function Pill({ children, tone = "neutral", icon, dot, live, title, className = "" }: Props) {
  return (
    <span
      title={title}
      className={`mono-label inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-tac-sm border px-2.5 ${tones[tone]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full bg-current ${live ? "animate-blink" : ""}`}
        />
      )}
      {icon && (
        <span aria-hidden className="-ml-0.5 flex items-center [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
