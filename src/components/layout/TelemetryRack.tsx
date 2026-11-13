import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HardDrive, MapPin, MapPinCheck, MapPinOff, MapPinX } from "lucide-react";
import OnlineBadge, { describeSignal } from "./OnlineBadge.tsx";
import CacheStatusPill, { describeFieldId } from "./CacheStatusPill.tsx";
import { useGeoPermission, type GeoPermission } from "./useGeoPermission.ts";
import { useOnlineStatus } from "../../lib/pwa.ts";
import { useModelStore } from "../../stores/modelStore.ts";
import { useSettingsStore } from "../../stores/settingsStore.ts";
import { getStorageEstimate, type StorageEstimate } from "../../db/persistence.ts";
import { formatBytes } from "../../lib/format.ts";

const UNKNOWN_ESTIMATE: StorageEstimate = { usageBytes: null, quotaBytes: null };
const WARN_RATIO = 0.85;

interface StorageTelemetry {
  /** Compact capsule text: "12%" (or "—" when the browser will not say). */
  short: string;
  sentence: string;
  warn: boolean;
}

/** Storage use as a percentage plus its spoken form; unknown stays unknown. */
export function describeStorage(est: StorageEstimate): StorageTelemetry {
  const { usageBytes, quotaBytes } = est;
  if (usageBytes === null || quotaBytes === null) {
    return { short: "—", sentence: "Storage unknown", warn: false };
  }
  const warn = quotaBytes > 0 && usageBytes / quotaBytes > WARN_RATIO;
  const pct = quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0;
  return {
    short: `${pct}%`,
    sentence: `Storage ${formatBytes(usageBytes)} of ${formatBytes(quotaBytes)} used`,
    warn,
  };
}

interface GpsTelemetry {
  text: string;
  sentence: string;
  ink: string;
  icon: typeof MapPin;
}

/**
 * GPS tagging state from two real sources only: the user's setting and the
 * browser's permission. A fix is taken on demand at save time, so the header
 * never claims one.
 */
export function describeGps(enabled: boolean, permission: GeoPermission): GpsTelemetry {
  if (!enabled) {
    return { text: "GPS Off", sentence: "GPS tagging off", ink: "text-ink-faint", icon: MapPinOff };
  }
  switch (permission) {
    case "granted":
      return { text: "GPS Allowed", sentence: "GPS tagging on, location allowed", ink: "text-glow", icon: MapPinCheck };
    case "denied":
      return {
        text: "GPS Blocked",
        sentence: "GPS tagging on, but location is blocked in the browser",
        ink: "text-danger-ink",
        icon: MapPinX,
      };
    case "prompt":
      return {
        text: "GPS Ask",
        sentence: "GPS tagging on, the browser will ask for location",
        ink: "text-amber",
        icon: MapPin,
      };
    default:
      return { text: "GPS On", sentence: "GPS tagging on, permission state not reported", ink: "text-ink-muted", icon: MapPin };
  }
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

const DIVIDER = <span aria-hidden className="h-4 w-px shrink-0 bg-line-strong" />;

/**
 * Header telemetry capsule: signal · model readiness · GPS · storage, as one
 * ≥48px link to the Models screen. Every segment mirrors live application
 * state. On phones the secondary words collapse to icons and storage drops
 * away; the aria-label always carries the full sentence.
 */
export default function TelemetryRack() {
  const online = useOnlineStatus();
  const fieldId = useModelStore((s) => s.fieldId);
  const gpsEnabled = useSettingsStore((s) => s.gpsEnabled);
  const gps = describeGps(gpsEnabled, useGeoPermission());
  const storage = describeStorage(useStorageEstimate());
  const compute = describeFieldId(fieldId);
  const GpsIcon = gps.icon;
  const label = `Telemetry: ${describeSignal(online)}. ${compute.sentence}. ${gps.sentence}. ${storage.sentence}. Open models and diagnostics.`;

  return (
    <Link
      to="/models"
      aria-label={label}
      className="group ml-auto flex min-h-12 min-w-0 items-center rounded-full press"
    >
      <span className="flex h-10 min-w-0 items-center gap-2.5 overflow-hidden rounded-full border border-line-strong bg-surface-2/70 px-3.5 shadow-inset transition-colors duration-200 group-hover:border-ink/40 sm:gap-3 sm:px-4">
        <OnlineBadge />
        {DIVIDER}
        <CacheStatusPill />
        {DIVIDER}
        <span title={gps.sentence} className={`mono-label inline-flex shrink-0 items-center gap-1.5 ${gps.ink}`}>
          <GpsIcon size={15} aria-hidden />
          <span className="hidden md:inline">{gps.text}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-3 lg:inline-flex">
          {DIVIDER}
          <span
            title={storage.sentence}
            className={`mono-label inline-flex items-center gap-1.5 ${storage.warn ? "text-caution" : "text-ink-muted"}`}
          >
            <HardDrive size={15} aria-hidden />
            {storage.short}
          </span>
        </span>
      </span>
    </Link>
  );
}
