import { useEffect, useRef, useState } from "react";
import FramingOverlay from "./FramingOverlay.tsx";
import CaptureControls from "./CaptureControls.tsx";

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
        <div role="alert" className="rounded-2xl bg-(--color-caution-bg) p-4 text-(--color-caution)">
          <p className="font-semibold">Camera unavailable</p>
          <p className="mt-1">{error}</p>
          {needsGesture && (
            <button
              className="mt-2 min-h-12 rounded-xl border-2 border-current px-4 font-semibold"
              onClick={() => void videoRef.current?.play().then(() => setNeedsGesture(false)).catch(() => undefined)}
            >
              Tap to start the camera
            </button>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted autoPlay aria-label="Live camera view" className="aspect-square w-full object-cover" />
          <FramingOverlay />
          <p className="absolute inset-x-0 bottom-2 text-center text-base text-white/90">
            Fill the square with one specimen; include leaves, stem, or cap underside if possible.
          </p>
        </div>
      )}
      <div className="mt-3">
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
