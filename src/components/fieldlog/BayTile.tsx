import type { ReactNode } from "react";

interface BaseProps {
  icon: ReactNode;
  label: string;
  /** Small mono counter: entry count for exports, last import count or "JSON". */
  counter: string;
}

type Props = BaseProps &
  (
    | { as?: "button"; onClick: () => void; disabled?: boolean }
    | { as: "label"; children: ReactNode }
  );

/**
 * One archive action: an etched tile that stacks icon over label at phone
 * width so three fit in a row. It can render as a <label> so a hidden file
 * input shares the same look; the focus ring then follows the input.
 */
const tile =
  "flex min-h-[4.5rem] w-full cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-field " +
  "border border-line-strong bg-surface-2 px-2 py-3 text-center text-sm leading-tight font-semibold text-ink " +
  "press hover:border-ink/50 hover:bg-surface-3 disabled:cursor-wait disabled:opacity-40 " +
  "sm:flex-row sm:gap-3 sm:px-4 sm:text-[0.9375rem] " +
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-amber-bright";

export default function BayTile(props: Props) {
  const body = (
    <>
      <span aria-hidden className="flex shrink-0 items-center gap-2">
        <span className="flex items-center justify-center text-amber [&>svg]:size-5">{props.icon}</span>
        <span className="mono-label rounded-full border border-line-strong px-2 py-1 text-ink-muted">
          {props.counter}
        </span>
      </span>
      <span>{props.label}</span>
      {props.as === "label" && props.children}
    </>
  );

  if (props.as === "label") {
    return <label className={tile}>{body}</label>;
  }
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={tile}>
      {body}
    </button>
  );
}
