import { useEffect, useState } from "react";

export interface DeviceLevel {
  /** Left/right roll in degrees, clamped to ±30 and rounded to 0.1. Positive = tilted right. */
  tilt: number;
  /** False until a real orientation sample arrives (desktops and locked-down iOS never send one). */
  available: boolean;
}

const MAX_TILT = 30;
const IDLE: DeviceLevel = { tilt: 0, available: false };

function toTilt(gamma: number): number {
  const clamped = Math.max(-MAX_TILT, Math.min(MAX_TILT, gamma));
  const rounded = Math.round(clamped * 10) / 10;
  // Fold -0 into 0 so the HUD never prints "−0.0°".
  return rounded === 0 ? 0 : rounded;
}

/**
 * Passive device-level readout for the framing HUD. Listens to the window's
 * "deviceorientation" events only — it never calls
 * DeviceOrientationEvent.requestPermission (iOS needs a user gesture for that),
 * so on devices that stay silent the hook simply reports { tilt: 0, available: false }.
 */
export function useDeviceLevel(): DeviceLevel {
  const [level, setLevel] = useState<DeviceLevel>(IDLE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma;
      // Desktop Chrome fires one all-null event; that is not a usable level.
      if (gamma === null || !Number.isFinite(gamma)) return;
      const tilt = toTilt(gamma);
      setLevel((prev) => (prev.available && prev.tilt === tilt ? prev : { tilt, available: true }));
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  return level;
}

export default useDeviceLevel;
