import { Camera, RefreshCw, Zap, ZapOff } from "lucide-react";
import Button from "../ui/Button.tsx";

interface Props {
  canFlip: boolean;
  torchOn: boolean;
  torchSupported: boolean;
  capturing: boolean;
  onCapture: () => void;
  onFlip: () => void;
  onTorch: () => void;
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
  return (
    <div className="flex items-center justify-center gap-3">
      {canFlip && (
        <Button variant="secondary" onClick={onFlip} aria-label="Switch camera" className="px-4">
          <RefreshCw size={24} aria-hidden />
        </Button>
      )}
      <Button variant="primary" onClick={onCapture} disabled={capturing} className="min-h-16 flex-1 text-xl">
        <Camera size={26} aria-hidden />
        {capturing ? "Capturing…" : "Capture specimen"}
      </Button>
      {torchSupported && (
        <Button
          variant="secondary"
          onClick={onTorch}
          aria-label={torchOn ? "Turn torch off" : "Turn torch on"}
          aria-pressed={torchOn}
          className="px-4"
        >
          {torchOn ? <ZapOff size={24} aria-hidden /> : <Zap size={24} aria-hidden />}
        </Button>
      )}
    </div>
  );
}
