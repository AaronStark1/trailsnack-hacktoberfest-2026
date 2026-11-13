import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HardDrive } from "lucide-react";
import Pill from "../ui/Pill.tsx";
import OnlineBadge, { describeSignal } from "./OnlineBadge.tsx";
import CacheStatusPill, { describeFieldId } from "./CacheStatusPill.tsx";
import { useOnlineStatus } from "../../lib/pwa.ts";
import { useModelStore } from "../../stores/modelStore.ts";
import { getStorageEstimate, type StorageEstimate } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";

const UNKNOWN_ESTIMATE: StorageEstimate = { usageBytes: null, quotaBytes: null };
const WARN_RATIO = 0.85;

/** "1.20" → "1.2", "8.00" → "8.0", "1.25" stays. Keeps the pill short. */
function trimZero(n: string): string {
  return n.replace(/\.(\d)0$/, ".$1");
}

interface StorageTelemetry {
  text: string;
  /** Phone-width variant: "STO 12%" (or "STO —"). */
  short: string;
  sentence: string;
  warn: boolean;
}

/** Compact "STO 1.2 / 8.0 GB" readout plus its spoken form. */
export function describeStorage(est: StorageEstimate): StorageTelemetry {
  const { usageBytes, quotaBytes } = est;
  if (usageBytes === null || quotaBytes === null) {
    return { text: "STO —", short: "STO —", sentence: "Storage unknown", warn: false };
  }
  const used = formatBytes(usageBytes);
  const quota = formatBytes(quotaBytes);
  const [usedNum = used, usedUnit = ""] = used.split(" ");
  const [quotaNum = quota, quotaUnit = ""] = quota.split(" ");
  const text =
    usedUnit === quotaUnit
      ? `STO ${trimZero(usedNum)} / ${trimZero(quotaNum)} ${quotaUnit}`
      : `STO ${used} / ${quota}`;
  const warn = quotaBytes > 0 && usageBytes / quotaBytes > WARN_RATIO;
  const pct = quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0;
  return { text, short: `STO ${pct}%`, sentence: `Storage ${used} of ${quota}`, warn };
}

/** Polls navigator.storage on mount, on window focus and when the tab becomes visible. */
function useStorageEstimate(): StorageEstimate {
  const [est, setEst] = useState<StorageEstimate>(UNKNOWN_ESTIMATE);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void getStorageEstimate().then((next) => {
        if (alive) setEst(next);
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return est;
}

/**
 * Header telemetry rack: signal · compute · storage, as one ≥52px link to the
 * Models screen. Takes whatever width the wordmark leaves; on phones the pills
 * use their short text, right-align when they fit, and otherwise scroll
 * sideways under a right-edge fade. The aria-label always carries the full
 * sentence.
 */
export default function TelemetryRack() {
  const online = useOnlineStatus();
  const fieldId = useModelStore((s) => s.fieldId);
  const storage = describeStorage(useStorageEstimate());
  const compute = describeFieldId(fieldId);
  const label = `Telemetry: ${describeSignal(online)}. ${compute.sentence}. ${storage.sentence}. Manage models.`;

  return (
    <Link
      to="/models"
      aria-label={label}
      className="ml-auto flex min-h-[52px] min-w-0 flex-1 items-center overflow-x-auto scrollbar-none rounded-tac tac-press [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] sm:[mask-image:none]"
    >
      <span className="ml-auto flex w-max items-center gap-2 pr-7 pl-1 sm:pr-1">
        <OnlineBadge />
        <CacheStatusPill />
        <Pill tone={storage.warn ? "warn" : "neutral"} icon={<HardDrive />} title={storage.sentence}>
          <span className="sm:hidden">{storage.short}</span>
          <span className="hidden sm:inline">{storage.text}</span>
        </Pill>
      </span>
    </Link>
  );
}
