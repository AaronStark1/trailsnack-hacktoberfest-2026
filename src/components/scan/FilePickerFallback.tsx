import { useRef, useState, type DragEvent } from "react";
import { Images } from "lucide-react";
import Button from "../ui/Button.tsx";

/**
 * Photo-library path into the same capture flow: a dashed, etched tray for a
 * photo taken elsewhere. The picker button is the primary, keyboard-accessible
 * route; dropping an image file onto the tray is an extra convenience for
 * desktop pointers and hands the file to the same handler.
 */
export default function FilePickerFallback({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function hasFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
  }

  return (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`rounded-plate border border-dashed p-5 transition-colors duration-200 sm:p-6 ${
        dragging ? "border-amber bg-amber/10" : "border-line-strong bg-surface/70"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-ink-muted">
          <Images size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono-label text-ink-faint">From your photos</p>
          <p className="mt-1.5 text-lg leading-snug font-semibold text-ink">Use an existing photo instead</p>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">
            Works without camera permission — good for testing and for pressed specimens.
            <span className="hidden sm:inline"> You can also drop an image file here.</span>
          </p>
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Choose a specimen photo"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" className="w-full shrink-0 sm:w-auto" onClick={() => ref.current?.click()}>
          <Images size={20} aria-hidden /> Pick a photo
        </Button>
      </div>
      <p className="mono-label mt-4 border-t border-line pt-3 text-ink-faint">
        Any image · centre-cropped to a 1024 px square
      </p>
    </div>
  );
}
