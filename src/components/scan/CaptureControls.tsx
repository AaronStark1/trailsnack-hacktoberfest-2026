import { Camera, SwitchCamera, Zap, ZapOff } from "lucide-react";

interface Props {
  canFlip: boolean;
  torchOn: boolean;
  torchSupported: boolean;
  capturing: boolean;
  onCapture: () => void;
  onFlip: () => void;
  onTorch: () => void;
}

/** 60px round side control: light bevelled puck with a hairline rim. */
const ROUND =
  "inline-flex size-[60px] items-center justify-center rounded-full border bg-surface bevel-light tac-press";

const roundTone = {
  idle: "border-line text-ink",
  on: "border-trail-glow text-trail",
};

const shutterRing = {
  idle: "border-line-strong shadow-inset",
  capturing: "border-trail-glow animate-glow-pulse",
};

const statusTone = {
  idle: "text-ink-muted",
  capturing: "text-trail",
};

/** Invisible stand-in that keeps the shutter centred when a side control is absent. */
function Spacer() {
  return <span aria-hidden className="invisible size-[60px]" />;
}

export default function CaptureControls({
  canFlip,
  torchOn,
  torchSupported,
  capturing,
  onCapture,
  onFlip,
  onTorch,
}: Props) {
  const ring = capturing ? shutterRing.capturing : shutterRing.idle;
  const status = capturing ? statusTone.capturing : statusTone.idle;
  return (
    <div className="flex items-center justify-center gap-6">
      {canFlip ? (
        <div className="flex w-[60px] flex-col items-center gap-2">
          <button type="button" onClick={onFlip} aria-label="Switch camera" className={`${ROUND} ${roundTone.idle}`}>
            <SwitchCamera size={26} aria-hidden />
          </button>
          <span aria-hidden className="mono-label text-ink-muted">
            FLIP
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
          className={`group relative size-[84px] rounded-full border-[3px] bg-surface-2 transition-[transform,box-shadow,border-color] duration-[120ms] ease-spring active:border-trail-glow active:shadow-glow disabled:cursor-wait ${ring}`}
        >
          <span
            aria-hidden
            className="absolute inset-[7px] flex items-center justify-center rounded-full bg-ink text-bg bevel transition-transform duration-[120ms] ease-spring group-active:scale-[.88] group-disabled:scale-100"
          >
            <Camera size={30} strokeWidth={2.25} />
          </span>
        </button>
        <span aria-hidden className={`mono-label ${status}`}>
          {capturing ? "CAPTURING…" : "CAPTURE"}
        </span>
      </div>

      {torchSupported ? (
        <div className="flex w-[60px] flex-col items-center gap-2">
          <button
            type="button"
            onClick={onTorch}
            aria-label={torchOn ? "Turn torch off" : "Turn torch on"}
            aria-pressed={torchOn}
            className={`${ROUND} ${torchOn ? roundTone.on : roundTone.idle}`}
          >
            {torchOn ? <ZapOff size={26} aria-hidden /> : <Zap size={26} aria-hidden />}
          </button>
          <span aria-hidden className="mono-label text-ink-muted">
            {torchOn ? "TORCH ON" : "TORCH"}
          </span>
        </div>
      ) : (
        <Spacer />
      )}
    </div>
  );
}
