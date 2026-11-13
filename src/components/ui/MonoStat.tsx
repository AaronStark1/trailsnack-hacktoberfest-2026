interface Props {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "trail" | "ok" | "warn" | "danger";
  /** sm for pill racks, md for telemetry grids, lg for a hero gauge readout. */
  size?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-ink",
  trail: "text-trail",
  ok: "text-edible",
  warn: "text-caution",
  danger: "text-danger",
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
};

/** Instrument readout: mono label over a tabular-number value. */
export default function MonoStat({ label, value, unit, tone = "default", size = "md", className = "", ...rest }: Props) {
  return (
    <div className={`min-w-0 ${className}`} {...rest}>
      <p className="mono-label text-ink-faint">{label}</p>
      <p className={`mono-value mt-1 truncate font-bold leading-none ${sizes[size]} ${tones[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-[0.55em] font-semibold text-ink-muted">{unit}</span>}
      </p>
    </div>
  );
}
