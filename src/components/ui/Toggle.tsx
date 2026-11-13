interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

/**
 * Chunky physical switch sized for a gloved thumb (56 × 96 px). The knob
 * carries an etched I/O glyph so state reads without colour, and the active
 * state glows trail-green.
 */
export default function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-14 w-24 shrink-0 items-center rounded-full border p-1 tac-press ${
        checked
          ? "border-trail-dark bg-trail shadow-[inset_0_2px_6px_rgba(0,0,0,.35)]"
          : "border-line-strong bg-surface-3 shadow-[inset_0_2px_6px_rgba(0,0,0,.18)]"
      }`}
    >
      <span
        aria-hidden
        className={`mono-label absolute inset-y-0 flex items-center ${
          checked ? "left-3 text-on-trail/80" : "right-3 text-ink-faint"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </span>
      <span
        aria-hidden
        className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-surface bevel-light transition-transform duration-200 ease-spring ${
          checked ? "translate-x-10" : "translate-x-0"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            checked ? "bg-trail-glow shadow-glow" : "bg-line-strong"
          }`}
        />
      </span>
    </button>
  );
}
