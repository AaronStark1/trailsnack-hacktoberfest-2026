interface Props {
  /** Device roll in degrees (positive = tilted right). */
  level?: number;
  /** False when no orientation sample has arrived: the level line is not drawn at all. */
  levelAvailable?: boolean;
}

const LEVEL_TOLERANCE_DEG = 3;

const BRACKETS = [
  "top-0 left-0 rounded-tl-[10px] border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-[10px] border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-[10px] border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-[10px] border-b-2 border-r-2",
];

/** Fine herbarium-scale ticks along each edge of the frame. */
const RULER_X =
  "absolute inset-x-12 h-1.5 opacity-45 bg-[repeating-linear-gradient(90deg,var(--color-hud)_0_1px,transparent_1px_12px)]";
const RULER_Y =
  "absolute inset-y-12 w-1.5 opacity-45 bg-[repeating-linear-gradient(180deg,var(--color-hud)_0_1px,transparent_1px_12px)]";

const READOUT = "mono-label absolute rounded-full bg-black/55 px-2.5 py-1.5 text-hud backdrop-blur-sm";

/**
 * Botanical framing HUD over the live feed: fine corner brackets, ruler ticks,
 * a softly lit specimen reticle and — only when the device really reports its
 * orientation — a level line with a degree readout. Every readout is a true
 * statement about the capture; nothing here is simulated. Purely decorative:
 * hidden from assistive tech and transparent to touches.
 */
export default function FramingOverlay({ level = 0, levelAvailable = false }: Props) {
  const isLevel = Math.abs(level) < LEVEL_TOLERANCE_DEG;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Vignette pulls the eye to the reticle without hiding the scene. */}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgb(0_0_0/0.5)_100%)]" />

      <div className="relative aspect-square w-[88%] max-w-lg">
        {BRACKETS.map((corner) => (
          <span key={corner} className={`absolute size-10 border-hud/90 ${corner}`} />
        ))}
        {/* No bottom ruler: that edge belongs to the framing hint. */}
        <span className={`${RULER_X} top-0`} />
        <span className={`${RULER_Y} left-0`} />
        <span className={`${RULER_Y} right-0`} />

        {/* Level line: rotates against the device roll so it stays true to the world. */}
        {levelAvailable && (
          <div
            className={`absolute inset-x-6 top-1/2 h-px transition-transform duration-150 ease-out-soft ${
              isLevel ? "text-glow" : "text-hud/80"
            }`}
            style={{ transform: `rotate(${-level}deg)` }}
          >
            <span className="absolute inset-y-0 left-0 right-[calc(50%+72px)] bg-current" />
            <span className="absolute inset-y-0 left-[calc(50%+72px)] right-0 bg-current" />
          </div>
        )}

        {/* Specimen reticle: a thin lit ring with four seed ticks and a centre point. */}
        <div className="absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 rounded-full border border-amber-bright/90 shadow-[0_0_18px_-2px_var(--color-amber),inset_0_0_14px_-6px_var(--color-amber)]" />
          <span className="absolute -top-3 left-1/2 h-2 w-px -translate-x-1/2 bg-hud" />
          <span className="absolute -bottom-3 left-1/2 h-2 w-px -translate-x-1/2 bg-hud" />
          <span className="absolute top-1/2 -left-3 h-px w-2 -translate-y-1/2 bg-hud" />
          <span className="absolute top-1/2 -right-3 h-px w-2 -translate-y-1/2 bg-hud" />
          <span className="absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud" />
        </div>

        {/* Readouts: the fixed output format, and the real roll when the device reports it. */}
        <span className={`${READOUT} top-3 left-3`}>1:1 · 1024 px</span>
        {levelAvailable && (
          <span className={`${READOUT} top-3 right-3 ${isLevel ? "text-glow" : ""}`}>
            {isLevel ? "Level " : "Tilt "}
            {level < 0 ? "−" : "+"}
            {Math.abs(level).toFixed(1)}°
          </span>
        )}
      </div>
    </div>
  );
}
