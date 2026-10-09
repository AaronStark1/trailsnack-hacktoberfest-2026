import { useEffect, useState } from "react";
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
    <div role="status" className="rounded-2xl bg-(--color-caution-bg) p-4 text-(--color-caution)">
      <p className="font-semibold">A new TrailSnack version is available.</p>
      <Button variant="secondary" className="mt-2" onClick={reloadToUpdate}>
        Reload to update
      </Button>
    </div>
  );
}
