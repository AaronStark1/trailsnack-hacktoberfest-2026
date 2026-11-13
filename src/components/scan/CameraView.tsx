import { useEffect, useRef, useState } from "react";
import { Camera, TriangleAlert } from "lucide-react";
import Button from "../ui/Button.tsx";
import FramingOverlay from "./FramingOverlay.tsx";
import CaptureControls from "./CaptureControls.tsx";
import { useDeviceLevel } from "./useDeviceLevel.ts";

interface Props {
  onFrame: (video: HTMLVideoElement) => void;
}

export default function CameraView({ onFrame }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const { tilt, available: levelAvailable } = useDeviceLevel();

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setError(null);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        if (!cancelled) setCanFlip(videoInputs.length > 1);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            if (!cancelled) setNeedsGesture(true);
          }
        }
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
        if (!cancelled) setTorchSupported(!!caps?.torch);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Camera permission was denied. Use the photo picker below instead — it works without camera access."
              : "No camera is available on this device. Use the photo picker below instead.",
          );
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as never] });
      setTorchOn((v) => !v);
    } catch {
      setTorchSupported(false);
    }
  }

  return (
    <div>
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-tac-lg border-2 border-caution/50 bg-caution-bg p-4 text-ink"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-tac bg-surface text-caution etched">
            <TriangleAlert size={26} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="mono-label text-caution">OPTICS · OFFLINE</p>
            <p className="mt-1.5 text-xl font-bold text-ink">Camera unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : (
        /* Black instrument bezel: hairline rim, 6px inner frame, glass glint. */
        <div className="relative overflow-hidden rounded-tac-lg bg-black p-1.5 etched">
          <div className="overflow-hidden rounded-[14px] bg-black">
            <div className="relative">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                aria-label="Live camera view"
                className="aspect-square w-full object-cover"
              />
              <FramingOverlay level={tilt} levelAvailable={levelAvailable} />
            </div>
            <div className="border-t border-hud/15 bg-black/55 px-3 py-2.5 text-center text-hud backdrop-blur">
              <p className="mono-label leading-[1.5]">FILL THE SQUARE · ONE SPECIMEN · LEAVES, STEM OR CAP UNDERSIDE</p>
              <p className="mt-1 text-[13px] leading-snug text-hud/75">
                Fill the square with one specimen; include leaves, stem, or cap underside if possible.
              </p>
            </div>
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-tac-lg shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
          />
        </div>
      )}
      {needsGesture && (
        <Button
          variant="primary"
          size="lg"
          className="mt-3 w-full"
          onClick={() => void videoRef.current?.play().then(() => setNeedsGesture(false)).catch(() => undefined)}
        >
          <Camera size={26} aria-hidden />
          Tap to start the camera
        </Button>
      )}
      <div className="mt-4">
        <CaptureControls
          canFlip={canFlip && !error}
          torchOn={torchOn}
          torchSupported={torchSupported && !error}
          capturing={capturing}
          onCapture={() => {
            const video = videoRef.current;
            if (!video) return;
            setCapturing(true);
            try {
              onFrame(video);
            } finally {
              setCapturing(false);
            }
          }}
          onFlip={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          onTorch={() => void toggleTorch()}
        />
      </div>
    </div>
  );
}
