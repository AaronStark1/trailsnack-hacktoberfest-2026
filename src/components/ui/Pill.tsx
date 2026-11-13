import type { ReactNode } from "react";

export type PillTone = "neutral" | "accent" | "ok" | "warn" | "danger" | "violet";

interface Props {
  children: ReactNode;
  tone?: PillTone;
  icon?: ReactNode;
  /** Draw a status dot before the text. */
  dot?: boolean;
  /** Pulse the dot (loading / live). Only pass while something is really happening. */
  live?: boolean;
  title?: string;
  className?: string;
}

const tones: Record<PillTone, string> = {
  neutral: "border-line-strong bg-surface-2 text-ink-muted",
  accent: "border-amber/45 bg-amber/10 text-amber",
  ok: "border-glow/35 bg-spruce/45 text-glow",
  warn: "border-caution/50 bg-caution-bg text-caution",
  danger: "border-danger/60 bg-danger-bg text-danger-ink",
  violet: "border-violet-ink/40 bg-violet-bg text-violet-ink",
};

/**
 * Telemetry capsule: monospaced, uppercase, etched. Non-interactive by design;
 * wrap a rack of pills in one ≥48px link or button when it needs to be tappable.
 * Tone is never the only signal — every pill carries its state as text.
 */
export default function Pill({ children, tone = "neutral", icon, dot, live, title, className = "" }: Props) {
  return (
    <span
      title={title}
      className={`mono-label inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 ${tones[tone]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden
          className={`size-1.5 rounded-full bg-current ${live ? "animate-pulse-soft" : ""}`}
        />
      )}
      {icon && (
        <span aria-hidden className="-ml-0.5 flex items-center [&>svg]:size-3.5">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
