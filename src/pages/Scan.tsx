import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crop } from "lucide-react";
import CameraView from "../components/scan/CameraView.tsx";
import FilePickerFallback from "../components/scan/FilePickerFallback.tsx";
import Notice from "../components/ui/Notice.tsx";
import Pill from "../components/ui/Pill.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
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
        thumbnailBlob: frame.thumbnailBlob,
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
        thumbnailBlob: frame.thumbnailBlob,
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
    <section aria-labelledby="scan-h" className="grid gap-6">
      <SectionHeader
        as="h1"
        id="scan-h"
        eyebrow="01 · Capture"
        title="Trail Camera"
        right={
          <Pill tone="neutral" icon={<Crop />} title="Every capture is centre-cropped to a 1024 px square">
            1:1 · 1024 px
          </Pill>
        }
      />
      <CameraView onFrame={(v) => void handleVideo(v)} />
      {working && (
        <div role="status" className="well relative overflow-hidden rounded-field px-4 py-3.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-linear-to-r from-transparent via-amber/25 to-transparent"
          />
          <p className="mono-label relative flex items-center gap-2.5 text-amber">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current animate-pulse-soft" />
            Cropping to a 1024 px square · preparing specimen
          </p>
        </div>
      )}
      {error && (
        <Notice tone="warn" role="alert" label="Could not use that photo">
          {error}
        </Notice>
      )}
      <FilePickerFallback onFile={(f) => void handleFile(f)} />
    </section>
  );
}
