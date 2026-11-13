import type { ReactNode } from "react";

interface BaseProps {
  icon: ReactNode;
  label: string;
  /** Industrial badge counter: entry count for exports, last import count or "JSON". */
  counter: string;
}

type Props = BaseProps &
  (
    | { as?: "button"; onClick: () => void }
    | { as: "label"; children: ReactNode }
  );

/**
 * One 64px bay action. Mirrors the secondary Button (bevelled, pine border on
 * surface) but stacks icon over label at phone width so three fit in a row,
 * and can render as a <label> so a hidden file input shares the same look.
 * The counter sits in flow beside the icon so it never overlaps on narrow
 * tiles; the ring only shows for keyboard focus (the label's hidden input).
 */
const tile =
  "flex min-h-16 w-full cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-tac " +
  "border-2 border-trail bg-surface px-1.5 py-2 text-center text-sm font-bold leading-tight tracking-tight text-trail " +
  "bevel-light tac-press hover:bg-surface-2 dark:border-trail sm:flex-row sm:gap-2 sm:px-3 sm:text-base " +
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-trail-glow";

export default function BayTile(props: Props) {
  const body = (
    <>
      <span aria-hidden className="flex shrink-0 items-center gap-1.5">
        <span className="flex items-center justify-center [&>svg]:size-6">{props.icon}</span>
        <span className="mono-label rounded-sm bg-ink px-1.5 py-1 text-bg">{props.counter}</span>
      </span>
      <span>{props.label}</span>
      {props.as === "label" && props.children}
    </>
  );

  if (props.as === "label") {
    return <label className={tile}>{body}</label>;
  }
  return (
    <button type="button" onClick={props.onClick} className={tile}>
      {body}
    </button>
  );
}
