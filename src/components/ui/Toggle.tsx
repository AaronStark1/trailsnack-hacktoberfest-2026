interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Switch sized for a gloved thumb (48 × 84 px). State reads three ways —
 * knob position, the ON/OFF word and the lit seed in the knob — so it never
 * depends on colour alone.
 */
export default function Toggle({ checked, onChange, label, disabled = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-12 w-[84px] shrink-0 items-center rounded-full border p-1 press disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? "border-amber/70 bg-amber/20 shadow-[inset_0_2px_8px_rgb(0_0_0/0.45)]"
          : "border-line-strong bg-surface-2 shadow-inset"
      }`}
    >
      <span
        aria-hidden
        className={`mono-label absolute inset-y-0 flex items-center ${
          checked ? "left-3 text-amber" : "right-2.5 text-ink-faint"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </span>
      <span
        aria-hidden
        className={`relative flex size-[38px] items-center justify-center rounded-full border transition-transform duration-300 ease-spring ${
          checked
            ? "translate-x-9 border-amber-bright bg-amber shadow-glow-amber"
            : "translate-x-0 border-line-strong bg-surface-3"
        }`}
      >
        <span className={`size-2 rounded-full ${checked ? "bg-on-amber" : "bg-ink-faint"}`} />
      </span>
    </button>
  );
}
