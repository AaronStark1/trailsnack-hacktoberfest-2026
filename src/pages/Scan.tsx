import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CameraView from "../components/scan/CameraView.tsx";
import FilePickerFallback from "../components/scan/FilePickerFallback.tsx";
import { fileToSquareFrame, videoFrameToSquare } from "../lib/image.ts";
import { useScanStore } from "../stores/scanStore.ts";

function draftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export default function Scan() {
  const nav = useNavigate();
  const setDraft = useScanStore((s) => s.setDraft);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setWorking(true);
    try {
      const frame = await fileToSquareFrame(file);
      const id = draftId();
      setDraft({
        id,
        blob: frame.storageBlob,
        width: frame.width,
        height: frame.height,
        createdAt: Date.now(),
      });
      sessionStorage.setItem(
        `trailsnack:draft:${id}`,
        JSON.stringify({ width: frame.width, height: frame.height }),
      );
      // Stash transferable RGBA for the Assess screen (same-tab navigation).
      (window as unknown as { __trailsnackFrame?: ArrayBuffer }).__trailsnackFrame = frame.rgba;
      nav(`/assess/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setWorking(false);
    }
  }

  async function handleVideo(video: HTMLVideoElement) {
    setError(null);
    setWorking(true);
    try {
      const frame = await videoFrameToSquare(video);
      const id = draftId();
      setDraft({
        id,
        blob: frame.storageBlob,
        width: frame.width,
        height: frame.height,
        createdAt: Date.now(),
      });
      (window as unknown as { __trailsnackFrame?: ArrayBuffer }).__trailsnackFrame = frame.rgba;
      nav(`/assess/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section aria-labelledby="scan-h" className="grid gap-4">
      <h1 id="scan-h" className="text-3xl font-extrabold">
        Trail Camera
      </h1>
      <CameraView onFrame={(v) => void handleVideo(v)} />
      <FilePickerFallback onFile={(f) => void handleFile(f)} />
      {working && <p role="status">Preparing your specimen…</p>}
      {error && (
        <p role="alert" className="rounded-2xl bg-(--color-caution-bg) p-3 text-(--color-caution)">
          {error}
        </p>
      )}
    </section>
  );
}
