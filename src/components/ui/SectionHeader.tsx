import type { ReactNode } from "react";

interface Props {
  /** id for aria-labelledby on the parent section. */
  id?: string;
  /** Monospaced eyebrow, e.g. "02 · CANDIDATES". */
  eyebrow?: string;
  title: ReactNode;
  as?: "h1" | "h2" | "h3";
  tone?: "default" | "danger" | "caution" | "trail";
  /** Right-aligned slot for a pill or action. */
  right?: ReactNode;
  className?: string;
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-ink",
  danger: "text-danger",
  caution: "text-caution",
  trail: "text-trail",
};

const sizes: Record<NonNullable<Props["as"]>, string> = {
  h1: "text-3xl font-black",
  h2: "text-2xl font-extrabold",
  h3: "text-xl font-bold",
};

/** Field-journal section heading: etched rule, mono eyebrow, bold title. */
export default function SectionHeader({
  id,
  eyebrow,
  title,
  as: Tag = "h2",
  tone = "default",
  right,
  className = "",
}: Props) {
  return (
    <div className={`flex items-end justify-between gap-3 border-b border-line pb-2 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className={`mono-label mb-1 ${tone === "default" ? "text-ink-faint" : tones[tone]}`}>{eyebrow}</p>}
        <Tag id={id} className={`${sizes[Tag]} ${tones[tone]}`}>
          {title}
        </Tag>
      </div>
      {right && <div className="shrink-0 pb-0.5">{right}</div>}
    </div>
  );
}
