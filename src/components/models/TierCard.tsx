import type { ReactNode } from "react";

const accents = {
  amber: {
    frame: "",
    medallion: "border-amber/40 bg-amber/10 text-amber",
    eyebrow: "text-amber",
  },
  violet: {
    frame: "border-violet-ink/30",
    medallion: "border-violet-ink/40 bg-violet-bg text-violet-ink",
    eyebrow: "text-violet-ink",
  },
} as const;

/**
 * One model tier: an editorial header (medallion, eyebrow, display title,
 * download size), state badges, the model id, a recessed status well, optional
 * gate content and the action row. Tier 2 takes the elderberry accent.
 */
export default function TierCard({
  eyebrow,
  title,
  size,
  icon,
  badges,
  modelId,
  meta,
  status,
  actions,
  children,
  accent = "amber",
}: {
  /** Mono line above the title, e.g. "Tier 1 · EmbeddingGemma 2". */
  eyebrow?: string;
  title: string;
  /** Approximate download size, e.g. "≈280 MB". */
  size?: string;
  icon?: ReactNode;
  /** Status pills (loaded state, device, cache state). */
  badges?: ReactNode;
  modelId: string;
  meta: string;
  status: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
  accent?: keyof typeof accents;
}) {
  const a = accents[accent];
  return (
    <article className={`plate p-5 sm:p-6 ${a.frame}`}>
      <header className="flex items-start gap-4">
        {icon && (
          <span
            aria-hidden
            className={`flex size-12 shrink-0 items-center justify-center rounded-full border [&>svg]:size-[22px] ${a.medallion}`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className={`mono-label ${a.eyebrow}`}>{eyebrow}</p>}
          <h3 className="display mt-1.5 text-display-md text-ink">{title}</h3>
        </div>
        {size && <p className="mono-value shrink-0 pt-1 text-sm text-ink-muted">{size}</p>}
      </header>

      {badges && <div className="mt-4 flex flex-wrap items-center gap-2">{badges}</div>}

      <p className="mt-4 text-ink-muted">{meta}</p>

      <dl className="mt-4">
        <dt className="mono-label text-ink-faint">Model ID</dt>
        <dd className="mono-value mt-1.5 text-sm break-all text-ink">{modelId}</dd>
      </dl>

      <div className="mt-4">{status}</div>

      {children && <div className="mt-5 border-t border-line pt-5">{children}</div>}

      <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
    </article>
  );
}
