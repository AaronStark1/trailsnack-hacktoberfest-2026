interface Props {
  /** Device roll in degrees (positive = tilted right). */
  level?: number;
  /** False when no orientation sample has arrived: the horizon draws level and dimmed. */
  levelAvailable?: boolean;
}

const LEVEL_TOLERANCE_DEG = 3;

const BRACKETS = [
  "top-0 left-0 rounded-tl-[3px] border-t-[5px] border-l-[5px]",
  "top-0 right-0 rounded-tr-[3px] border-t-[5px] border-r-[5px]",
  "bottom-0 left-0 rounded-bl-[3px] border-b-[5px] border-l-[5px]",
  "bottom-0 right-0 rounded-br-[3px] border-b-[5px] border-r-[5px]",
];

/** Tick positions along each half of the horizon bar, as a % of the square. */
const HORIZON_TICKS = ["7%", "14%", "21%"];

const READOUT = "mono-label absolute rounded bg-black/40 px-1.5 py-1 text-hud";

/**
 * Military / scientific framing HUD drawn over the live feed: corner reticle
 * brackets, a dashed macro focus ring with crosshair ticks, an artificial
 * horizon driven by the device level, and four mono readouts. Purely
 * decorative — hidden from assistive tech and transparent to touches.
 */
export default function FramingOverlay({ level = 0, levelAvailable = false }: Props) {
  const roll = levelAvailable ? level : 0;
  const horizonTone = !levelAvailable
    ? "text-hud opacity-60"
    : Math.abs(roll) < LEVEL_TOLERANCE_DEG
      ? "text-trail-glow"
      : "text-hud";
  const tiltReadout = levelAvailable
    ? `TILT ${roll < 0 ? "−" : "+"}${Math.abs(roll).toFixed(1)}°`
    : "TILT —";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Fine scanline sweep: a half-height slab whose lit bottom edge crosses the whole frame. */}
      <span className="absolute inset-x-0 top-0 h-1/2 animate-scanline border-b border-hud/20" />

      <div className="relative aspect-square w-[86%] max-w-md">
        {/* Corner reticle brackets. */}
        {BRACKETS.map((corner) => (
          <span key={corner} className={`absolute size-11 border-hud ${corner}`} />
        ))}

        {/* Artificial horizon: rotates against the device roll so it stays true to the world. */}
        <div
          className={`absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 transition-transform duration-[120ms] ease-out-soft ${horizonTone}`}
          style={{ transform: `rotate(${-roll}deg)` }}
        >
          <span className="absolute inset-y-0 left-0 right-[calc(50%+64px)] bg-current" />
          <span className="absolute inset-y-0 left-[calc(50%+64px)] right-0 bg-current" />
          {HORIZON_TICKS.map((pos) => (
            <span
              key={`l-${pos}`}
              className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 bg-current"
              style={{ left: pos }}
            />
          ))}
          {HORIZON_TICKS.map((pos) => (
            <span
              key={`r-${pos}`}
              className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 bg-current"
              style={{ right: pos }}
            />
          ))}
        </div>

        {/* Macro focus guide: dashed ring, four crosshair ticks outside it, centre dot. */}
        <div className="absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-hud/80" />
          <span className="absolute -top-4 left-1/2 h-3 w-[1.5px] -translate-x-1/2 bg-hud" />
          <span className="absolute -bottom-4 left-1/2 h-3 w-[1.5px] -translate-x-1/2 bg-hud" />
          <span className="absolute top-1/2 -left-4 h-[1.5px] w-3 -translate-y-1/2 bg-hud" />
          <span className="absolute top-1/2 -right-4 h-[1.5px] w-3 -translate-y-1/2 bg-hud" />
          <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud" />
        </div>

        {/* Mono HUD readouts tucked inside the brackets. */}
        <span className={`${READOUT} top-3 left-3`}>
          REC <span className="text-danger animate-blink">●</span>
        </span>
        <span className={`${READOUT} top-3 right-3`}>SQ·1024</span>
        <span className={`${READOUT} bottom-3 left-3`}>{tiltReadout}</span>
        <span className={`${READOUT} right-3 bottom-3`}>MACRO</span>
      </div>
    </div>
  );
}
