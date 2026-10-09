import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../lib/pwa.ts";

export default function OnlineBadge() {
  const online = useOnlineStatus();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-base"
      role="status"
      aria-label={online ? "Online" : "Offline"}
      title={online ? "Online — setup downloads available" : "Offline — on-device identification still works after setup"}
    >
      {online ? <Wifi size={18} aria-hidden /> : <WifiOff size={18} aria-hidden />}
      {online ? "Online" : "Offline"}
    </span>
  );
}
