export interface GpsFix {
  lat: number;
  lon: number;
  accuracyM?: number;
  altitudeM?: number;
}

function coordinate(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(4)}° ${value < 0 ? negative : positive}`;
}

/**
 * Field-journal GPS stamp: "44.1234° N 71.5678° W · 812 M" (altitude when
 * present, "· ±12 M" accuracy when requested), or "NO FIX" without a fix.
 */
export function gpsStamp(gps: GpsFix | null | undefined, opts: { accuracy?: boolean } = {}): string {
  if (!gps || !Number.isFinite(gps.lat) || !Number.isFinite(gps.lon)) return "NO FIX";
  const parts = [`${coordinate(gps.lat, "N", "S")} ${coordinate(gps.lon, "E", "W")}`];
  if (typeof gps.altitudeM === "number" && Number.isFinite(gps.altitudeM)) {
    parts.push(`${Math.round(gps.altitudeM)} M`);
  }
  if (opts.accuracy && typeof gps.accuracyM === "number" && Number.isFinite(gps.accuracyM)) {
    parts.push(`±${Math.round(gps.accuracyM)} M`);
  }
  return parts.join(" · ");
}
