import { Download } from "lucide-react";
import Button from "../ui/Button.tsx";
import { useInstallPrompt } from "../../lib/pwa.ts";

export default function InstallBanner() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <div role="status" className="tac-card flex flex-wrap items-center gap-3 p-4 animate-rise-in">
      <span className="well flex size-12 shrink-0 items-center justify-center rounded-tac text-trail">
        <Download size={24} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="mono-label text-ink-faint">System</p>
        <p className="mt-1 font-semibold leading-snug text-ink">Install TrailSnack for offline use on the trail.</p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button variant="primary" className="flex-1 sm:flex-none" onClick={() => void promptInstall()}>
          Install
        </Button>
        <Button variant="ghost" onClick={dismiss} aria-label="Dismiss install banner">
          Later
        </Button>
      </div>
    </div>
  );
}
