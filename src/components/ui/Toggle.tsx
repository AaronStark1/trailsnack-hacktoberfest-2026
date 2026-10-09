interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export default function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-12 w-20 shrink-0 items-center rounded-full px-1 transition-colors ${
        checked ? "bg-(--color-trail)" : "bg-black/25"
      }`}
    >
      <span
        className={`inline-block h-10 w-10 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-8" : "translate-x-0"
        }`}
      />
    </button>
  );
}
