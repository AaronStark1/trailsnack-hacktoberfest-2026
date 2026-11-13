import { Flashlight, FlashlightOff, SwitchCamera } from "lucide-react";

interface Props {
  canFlip: boolean;
  torchOn: boolean;
  torchSupported: boolean;
  capturing: boolean;
  onCapture: () => void;
  onFlip: () => void;
  onTorch: () => void;
}

/** 52px round side control: etched bramble puck. */
const ROUND =
  "inline-flex size-[52px] items-center justify-center rounded-full border bg-surface press hover:bg-surface-3";

const SIDE = "flex w-16 flex-col items-center gap-2";

/** Invisible stand-in that keeps the shutter centred when a side control is absent. */
function Spacer() {
  return <span aria-hidden className="invisible w-16" />;
}

/**
 * Capture rack: a 72px dual-ring shutter with a lit cloudberry disc, flanked
 * by flip and torch when the device really offers them. The press ripple is
 * pure CSS on :active — capture fires on the click itself and is never held
 * back by decoration.
 */
export default function CaptureControls({
  canFlip,
  torchOn,
  torchSupported,
  capturing,
  onCapture,
  onFlip,
  onTorch,
}: Props) {
  return (
    <div className="flex items-start justify-center gap-7">
      {canFlip ? (
        <div className={`${SIDE} pt-2.5`}>
          <button type="button" onClick={onFlip} aria-label="Switch camera" className={`${ROUND} border-line-strong text-ink`}>
            <SwitchCamera size={22} aria-hidden />
          </button>
          <span aria-hidden className="mono-label text-ink-faint">
            Flip
          </span>
        </div>
      ) : (
        <Spacer />
      )}

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onCapture}
          disabled={capturing}
          aria-label="Capture specimen"
          className="group relative size-[72px] rounded-full border-2 border-ink/85 bg-transparent transition-[border-color] duration-150 hover:border-ink disabled:cursor-wait disabled:opacity-60"
        >
          {/* Ripple: only while pressed. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-0.5 rounded-full border-2 border-amber-bright opacity-0 group-active:animate-ripple"
          />
          <span
            aria-hidden
            className="absolute inset-[5px] rounded-full bg-amber shadow-[inset_0_2px_0_rgb(255_255_255/0.4),inset_0_-3px_6px_rgb(0_0_0/0.25),0_0_22px_-2px_var(--color-amber)] transition-transform duration-150 ease-spring group-hover:bg-amber-bright group-active:scale-[.86] group-disabled:scale-100"
          />
        </button>
        <span aria-hidden className={`mono-label ${capturing ? "text-amber" : "text-ink-muted"}`}>
          {capturing ? "Capturing…" : "Capture"}
        </span>
      </div>

      {torchSupported ? (
        <div className={`${SIDE} pt-2.5`}>
          <button
            type="button"
            onClick={onTorch}
            aria-label={torchOn ? "Turn torch off" : "Turn torch on"}
            aria-pressed={torchOn}
            className={`${ROUND} ${
              torchOn ? "border-amber text-amber shadow-glow-amber" : "border-line-strong text-ink"
            }`}
          >
            {torchOn ? <Flashlight size={22} aria-hidden /> : <FlashlightOff size={22} aria-hidden />}
          </button>
          <span aria-hidden className={`mono-label ${torchOn ? "text-amber" : "text-ink-faint"}`}>
            {torchOn ? "Torch on" : "Torch"}
          </span>
        </div>
      ) : (
        <Spacer />
      )}
    </div>
  );
}
