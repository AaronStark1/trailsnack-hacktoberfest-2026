export interface GpsFix {
  lat: number;
  lon: number;
  accuracyM: number;
  altitudeM?: number;
  capturedAt: number;
}

export async function getCurrentFix(timeoutMs = 10_000): Promise<GpsFix> {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation is not available on this device.");
  }
  return new Promise<GpsFix>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("GPS timed out.")), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          ...(pos.coords.altitude !== null ? { altitudeM: pos.coords.altitude } : {}),
          capturedAt: pos.timestamp,
        });
      },
      (err) => {
        clearTimeout(timer);
        reject(new Error(err.message || "GPS unavailable."));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
