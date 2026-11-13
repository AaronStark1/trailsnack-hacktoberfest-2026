import { Plane, Wifi } from "lucide-react";
import Pill from "../ui/Pill.tsx";
import { useOnlineStatus } from "../../lib/pwa.ts";

/** Plain-language signal state for the telemetry rack's accessible name. */
export function describeSignal(online: boolean): string {
  return online ? "Online, link up" : "Offline, 0 bars";
}

/**
 * Signal pill. Offline is the designed state for a field unit, so it reads
 * as OK ("airplane ready"); online is merely neutral. Keeps the role="status"
 * + aria-label "Online"/"Offline" contract.
 */
export default function OnlineBadge() {
  const online = useOnlineStatus();
  return (
    <span
      role="status"
      aria-label={online ? "Online" : "Offline"}
      className="inline-flex shrink-0 items-center"
    >
      <Pill
        tone={online ? "neutral" : "ok"}
        icon={online ? <Wifi /> : <Plane />}
        title={
          online
            ? "Online — setup downloads available"
            : "Offline — on-device identification still works after setup"
        }
      >
        <span className="sm:hidden">{online ? "LINK" : "0 BARS"}</span>
        <span className="hidden sm:inline">{online ? "LINK · ONLINE" : "0 BARS · AIRPLANE READY"}</span>
      </Pill>
    </span>
  );
}
