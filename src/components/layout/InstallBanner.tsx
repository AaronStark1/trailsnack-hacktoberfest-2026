import { Download } from "lucide-react";
import Button from "../ui/Button.tsx";
import { useInstallPrompt } from "../../lib/pwa.ts";

export default function InstallBanner() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-(--color-edible-bg) p-4 text-(--color-edible)">
      <Download size={24} aria-hidden />
      <p className="flex-1 font-semibold">Install TrailSnack for offline use on the trail.</p>
      <Button variant="primary" onClick={() => void promptInstall()}>
        Install
      </Button>
      <Button variant="ghost" onClick={dismiss} aria-label="Dismiss install banner">
        Later
      </Button>
    </div>
  );
}
