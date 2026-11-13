interface Props {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "accent" | "ok" | "warn" | "danger" | "muted";
  /** sm for racks, md for telemetry grids, lg for a hero gauge readout. */
  size?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-ink",
  accent: "text-amber",
  ok: "text-glow",
  warn: "text-caution",
  danger: "text-danger-ink",
  muted: "text-ink-muted",
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[0.9375rem]",
  md: "text-xl",
  lg: "text-3xl",
};

/** Instrument readout: mono label over a tabular-number value. */
export default function MonoStat({ label, value, unit, tone = "default", size = "md", className = "", ...rest }: Props) {
  return (
    <div className={`min-w-0 ${className}`} {...rest}>
      <p className="mono-label text-ink-faint">{label}</p>
      <p className={`mono-value mt-1.5 truncate font-medium leading-none ${sizes[size]} ${tones[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-[0.6em] text-ink-muted">{unit}</span>}
      </p>
    </div>
  );
}
