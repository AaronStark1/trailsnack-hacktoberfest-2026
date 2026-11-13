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
    <div role="status" className="tac-card border-l-8 border-l-caution p-4 animate-rise-in">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-tac bg-caution-bg text-caution">
          <RefreshCw size={24} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono-label text-caution">Update available</p>
          <p className="mt-1 font-semibold leading-snug text-ink">A new TrailSnack version is available.</p>
        </div>
      </div>
      <Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={reloadToUpdate}>
        Reload to update
      </Button>
    </div>
  );
}
