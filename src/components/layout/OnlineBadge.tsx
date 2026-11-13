import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../lib/pwa.ts";

/** Plain-language signal state for the telemetry rack's accessible name. */
export function describeSignal(online: boolean): string {
  return online ? "Online" : "Offline, on-device features still work";
}

/**
 * Signal segment of the telemetry capsule, driven by navigator.onLine. Offline
 * is the designed state for a field tool, so it is called out in amber rather
 * than as an error. Keeps the role="status" + aria-label "Online"/"Offline"
 * contract; the icon changes with the state, so it never rests on colour.
 */
export default function OnlineBadge() {
  const online = useOnlineStatus();
  return (
    <span
      role="status"
      aria-label={online ? "Online" : "Offline"}
      title={
        online
          ? "Online — setup downloads available"
          : "Offline — on-device identification still works after setup"
      }
      className={`mono-label inline-flex shrink-0 items-center gap-1.5 ${online ? "text-ink-muted" : "text-amber"}`}
    >
      {online ? <Wifi size={15} aria-hidden /> : <WifiOff size={15} aria-hidden />}
      <span className={online ? "hidden sm:inline" : ""}>{online ? "Online" : "Offline"}</span>
    </span>
  );
}
