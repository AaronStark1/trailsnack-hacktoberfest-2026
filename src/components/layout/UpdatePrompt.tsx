import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import Button from "../ui/Button.tsx";

export const SW_UPDATE_EVENT = "trailsnack:sw-update";

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const handler = () => setNeedRefresh(true);
    window.addEventListener(SW_UPDATE_EVENT, handler);
    return () => window.removeEventListener(SW_UPDATE_EVENT, handler);
  }, []);

  if (!needRefresh) return null;
  function reloadToUpdate() {
    const update = window.__trailsnackUpdateSW;
    if (update) {
      void update(true);
    } else {
      window.location.reload();
    }
  }
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-4 rounded-plate border border-caution/50 bg-caution-bg p-4 animate-rise-in"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-caution/50 text-caution">
        <RefreshCw size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-44">
        <p className="mono-label text-caution">Update available</p>
        <p className="mt-1.5 leading-snug font-semibold text-ink">A new TrailSnack version is available.</p>
      </div>
      <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={reloadToUpdate}>
        Reload to update
      </Button>
    </div>
  );
}
