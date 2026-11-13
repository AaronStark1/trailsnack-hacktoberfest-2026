import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { formatDateTime } from "../../lib/format.ts";

interface Props {
  photoUrl: string | null;
  /** Epoch ms the frame was captured or picked. */
  capturedAt: number;
  /** Stored frame dimensions in pixels. */
  width: number;
  height: number;
  /** Tier 1 inference time for this frame. */
  inferenceMs: number;
  /** Short SHA-256 of the stored image bytes; null until computed or when unavailable. */
  imageHash: string | null;
  /** Backend that ran Tier 1, when the model store knows it. */
  device: "webgpu" | "wasm" | null;
  dbVersion: string;
}

const TICK = "pointer-events-none absolute size-4 border-hud/85 [filter:drop-shadow(0_0_1.5px_rgb(0_0_0/0.8))]";

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="mono-label text-ink-faint">{label}</dt>
      <dd className="mono-value mt-1 text-[0.8125rem] leading-snug break-words text-ink">{value}</dd>
    </div>
  );
}

/**
 * Specimen plate: the captured photo mounted like a herbarium sheet, with its
 * label of real capture data beside it. On phones the plate starts compact so
 * the verdict stays in view; tapping the photo opens it to full width. The
 * image itself is shown untouched — corner ticks only, nothing over the subject.
 */
export default function SpecimenFrame({
  photoUrl,
  capturedAt,
  width,
  height,
  inferenceMs,
  imageHash,
  device,
  dbVersion,
}: Props) {
  const [expanded, setExpanded] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 640px)").matches,
  );
  const deviceName = device === "webgpu" ? "WebGPU" : device === "wasm" ? "WASM" : null;

  return (
    <figure className="plate overflow-hidden">
      <div className={`grid ${expanded ? "grid-cols-1" : "grid-cols-[minmax(0,9fr)_minmax(0,10fr)]"}`}>
        {photoUrl && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Shrink specimen photo" : "Enlarge specimen photo"}
            className="group relative block cursor-zoom-in bg-black aria-expanded:cursor-zoom-out"
          >
            <img src={photoUrl} alt="Your specimen photo" className="aspect-square w-full object-cover" />
            <span aria-hidden className={`${TICK} top-2.5 left-2.5 border-t border-l`} />
            <span aria-hidden className={`${TICK} top-2.5 right-2.5 border-t border-r`} />
            <span aria-hidden className={`${TICK} bottom-2.5 left-2.5 border-b border-l`} />
            <span
              aria-hidden
              className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-hud backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 sm:opacity-70"
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </span>
          </button>
        )}
        <figcaption className={`min-w-0 ${expanded ? "border-t border-line p-4 sm:p-5" : "self-center p-3.5"}`}>
          <p className="mono-label flex items-center gap-2 text-amber">
            <span aria-hidden className="h-px w-4 shrink-0 bg-current opacity-70" />
            Specimen
          </p>
          <dl className={`mt-3 grid gap-x-5 gap-y-3 ${expanded ? "grid-cols-2" : "grid-cols-1"}`}>
            <Datum label="Captured" value={formatDateTime(capturedAt)} />
            <Datum label="Frame" value={`${width} × ${height} px`} />
            <Datum
              label="Tier 1 inference"
              value={`${inferenceMs} ms${deviceName ? ` · ${deviceName}` : ""}`}
            />
            {imageHash && <Datum label="Image SHA-256" value={`${imageHash}…`} />}
            <Datum label="Safety database" value={dbVersion} />
          </dl>
        </figcaption>
      </div>
    </figure>
  );
}
