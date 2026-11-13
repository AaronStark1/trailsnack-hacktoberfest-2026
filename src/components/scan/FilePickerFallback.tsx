import { useRef } from "react";
import { Images, Paperclip } from "lucide-react";
import Button from "../ui/Button.tsx";

/** Rugged field-clip attachment: a dashed card with a clipped tab, for photos taken elsewhere. */
export default function FilePickerFallback({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative mt-6 rounded-tac-lg border-2 border-dashed border-line-strong bg-surface p-4 pt-6">
      <span
        aria-hidden
        className="mono-label absolute -top-3 left-5 inline-flex h-7 items-center gap-1 rounded-sm bg-ink px-2 text-bg"
      >
        <Paperclip size={12} aria-hidden />
        FIELD CLIP
      </span>
      <p className="text-lg font-bold">Attach a photo instead</p>
      <p className="mt-1 text-ink-muted">
        Works without camera permission — good for testing and for pressed specimens.
      </p>
      <p className="mono-label mt-3 text-ink-muted">IMAGE/* · SQUARE CROP · 1024²</p>
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
      <Button variant="secondary" className="mt-4 min-h-14 w-full" onClick={() => ref.current?.click()}>
        <Images size={22} aria-hidden /> Pick a photo
      </Button>
    </div>
  );
}
