import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crosshair, TriangleAlert } from "lucide-react";
import CameraView from "../components/scan/CameraView.tsx";
import FilePickerFallback from "../components/scan/FilePickerFallback.tsx";
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
    <section aria-labelledby="scan-h" className="grid gap-4">
      <SectionHeader
        as="h1"
        id="scan-h"
        eyebrow="01 · CAPTURE"
        title="Trail Camera"
        right={
          <Pill tone="trail" icon={<Crosshair />}>
            SQ · 1024
          </Pill>
        }
      />
      <CameraView onFrame={(v) => void handleVideo(v)} />
      {working && (
        <div role="status" className="well overflow-hidden rounded-tac">
          <div className="relative overflow-hidden px-4 py-3">
            {/* Sweeping scan bar: `scanline` translates by ±120% of the element's own height, so a
                half-height slab carries its lit 2px bottom edge from just above the strip to just
                below it — the line stays on screen for most of the cycle. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 animate-scanline border-b-2 border-trail-glow bg-linear-to-b from-transparent via-transparent via-55% to-trail-glow/25"
            />
            <p className="mono-label relative flex items-center gap-2 text-trail">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-trail-glow animate-blink" />
              CROPPING TO 1024² · PREPARING SPECIMEN
            </p>
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-tac-lg border-2 border-caution/50 bg-caution-bg p-4 text-ink"
        >
          <TriangleAlert size={24} aria-hidden className="mt-0.5 shrink-0 text-caution" />
          <span>{error}</span>
        </p>
      )}
      <FilePickerFallback onFile={(f) => void handleFile(f)} />
    </section>
  );
}
