import { useRef } from "react";
import { Image } from "lucide-react";
import Button from "../ui/Button.tsx";

export default function FilePickerFallback({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-dashed border-black/25 p-4">
      <p className="font-semibold">Or choose a photo</p>
      <p className="mt-1 text-base opacity-80">
        Works without camera permission — good for testing and for pressed specimens.
      </p>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Choose a specimen photo"
        className="mt-3 block w-full text-lg"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" className="mt-3 w-full" onClick={() => ref.current?.click()}>
        <Image size={22} aria-hidden /> Pick a photo
      </Button>
    </div>
  );
}
