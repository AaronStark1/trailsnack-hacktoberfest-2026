import type { ReactNode } from "react";

interface Props {
  /** id for aria-labelledby on the parent section. */
  id?: string;
  /** Monospaced eyebrow, e.g. "02 · Candidates". */
  eyebrow?: string;
  title: ReactNode;
  as?: "h1" | "h2" | "h3";
  tone?: "default" | "danger" | "caution" | "violet";
  /** Right-aligned slot for a pill or action. */
  right?: ReactNode;
  /** Supporting sentence under the title. */
  lede?: ReactNode;
  className?: string;
}

const titleTones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-ink",
  danger: "text-danger-ink",
  caution: "text-caution",
  violet: "text-violet-ink",
};

const eyebrowTones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-amber",
  danger: "text-danger-ink",
  caution: "text-caution",
  violet: "text-violet-ink",
};

const sizes: Record<NonNullable<Props["as"]>, string> = {
  h1: "text-display-lg",
  h2: "text-display-md",
  h3: "text-display-sm",
};

/**
 * Field-journal heading: a mono eyebrow hung on a short stem, then the title
 * in the tall display face. Page titles (h1) get the full editorial scale.
 */
export default function SectionHeader({
  id,
  eyebrow,
  title,
  as: Tag = "h2",
  tone = "default",
  right,
  lede,
  className = "",
}: Props) {
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className={`mono-label mb-2 flex items-center gap-2 ${eyebrowTones[tone]}`}>
              <span aria-hidden className="h-px w-5 shrink-0 bg-current opacity-70" />
              {eyebrow}
            </p>
          )}
          <Tag id={id} className={`display ${sizes[Tag]} ${titleTones[tone]}`}>
            {title}
          </Tag>
        </div>
        {right && <div className="shrink-0 pb-1">{right}</div>}
      </div>
      {lede && <p className="mt-3 max-w-prose text-ink-muted">{lede}</p>}
    </div>
  );
}
