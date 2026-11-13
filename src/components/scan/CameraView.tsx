import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import Button from "../ui/Button.tsx";
import FramingOverlay from "./FramingOverlay.tsx";
import CaptureControls from "./CaptureControls.tsx";
import { useDeviceLevel } from "./useDeviceLevel.ts";
import { useAtmosphereStore } from "../../stores/atmosphereStore.ts";

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
  /** True once the video element reports frames are actually playing. */
  const [live, setLive] = useState(false);
  const { tilt, available: levelAvailable } = useDeviceLevel();

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setError(null);
      setLive(false);
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

  // Focus dimming: while real frames are on screen the backdrop steps right back.
  const setCameraLive = useAtmosphereStore((s) => s.setCameraLive);
  useEffect(() => {
    setCameraLive(live && !error);
    return () => setCameraLive(false);
  }, [live, error, setCameraLive]);

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
        <div role="alert" className="rounded-plate border border-caution/50 bg-caution-bg p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-caution/50 text-caution">
              <CameraOff size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="mono-label text-caution">Camera unavailable</p>
              <p className="mt-2 text-lg leading-snug font-semibold text-ink">The live viewfinder could not start</p>
              <p className="mt-1.5 text-ink-muted">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Viewfinder: edge to edge on phones; from tablet width up an etched plate
           sized so the square and the shutter share one screen. */
        <div className="relative -mx-4 overflow-hidden bg-black sm:mx-auto sm:max-w-[min(100%,52dvh)] sm:rounded-plate sm:border sm:border-line-strong sm:shadow-plate">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="Live camera view"
            onPlaying={() => setLive(true)}
            className="aspect-square w-full object-cover"
          />
          <FramingOverlay level={tilt} levelAvailable={levelAvailable} />
          {!live && (
            <p
              role="status"
              className="mono-label absolute inset-x-0 top-[calc(50%+5.5rem)] text-center text-hud/80"
            >
              {needsGesture ? "Camera paused — tap below to start" : "Starting camera…"}
            </p>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/45 to-transparent px-5 pt-12 pb-4 text-center">
            <p className="text-[0.9375rem] leading-snug font-medium text-hud">
              Fill the frame with one specimen; include leaves, stem, or cap underside if possible.
            </p>
          </div>
        </div>
      )}
      {needsGesture && (
        <Button
          variant="primary"
          size="lg"
          className="mt-4 w-full"
          onClick={() => void videoRef.current?.play().then(() => setNeedsGesture(false)).catch(() => undefined)}
        >
          <Camera size={24} aria-hidden />
          Tap to start the camera
        </Button>
      )}
      <div className="mt-5">
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
