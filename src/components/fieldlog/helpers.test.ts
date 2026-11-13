import { describe, expect, it } from "vitest";
import { relativeTime } from "./time.ts";
import { gpsStamp } from "./gps.ts";
import { badgeTextOf, badgeToneOf, scientificNameOf, topNameOf } from "./verdict.ts";

const NOW = Date.UTC(2026, 9, 22, 12, 0, 0);

describe("relativeTime", () => {
  it("stamps the recent past in minutes, hours and days", () => {
    expect(relativeTime(NOW, NOW)).toBe("JUST NOW");
    expect(relativeTime(NOW - 30_000, NOW)).toBe("JUST NOW");
    expect(relativeTime(NOW - 4 * 60_000, NOW)).toBe("4 MIN AGO");
    expect(relativeTime(NOW - 2 * 3_600_000, NOW)).toBe("2 H AGO");
    expect(relativeTime(NOW - 3 * 86_400_000, NOW)).toBe("3 D AGO");
  });

  it("falls back to an uppercase short date after a week", () => {
    const stamp = relativeTime(NOW - 9 * 86_400_000, NOW);
    expect(stamp).not.toMatch(/AGO/);
    expect(stamp).toBe(stamp.toUpperCase());
    expect(stamp.length).toBeGreaterThan(0);
  });

  it("treats clock skew into the future as just now", () => {
    expect(relativeTime(NOW + 60_000, NOW)).toBe("JUST NOW");
  });
});

describe("gpsStamp", () => {
  it("reports NO FIX without coordinates", () => {
    expect(gpsStamp(undefined)).toBe("NO FIX");
    expect(gpsStamp(null)).toBe("NO FIX");
  });

  it("formats hemispheres, altitude and accuracy", () => {
    expect(gpsStamp({ lat: 44.12347, lon: -71.98763 })).toBe("44.1235° N 71.9876° W");
    expect(gpsStamp({ lat: -33.8688, lon: 151.2093, altitudeM: 12.4 })).toBe("33.8688° S 151.2093° E · 12 M");
    expect(gpsStamp({ lat: 44.1, lon: -71.9, accuracyM: 8.6 }, { accuracy: true })).toBe("44.1000° N 71.9000° W · ±9 M");
    expect(gpsStamp({ lat: 44.1, lon: -71.9, accuracyM: 8.6 })).toBe("44.1000° N 71.9000° W");
  });
});

describe("verdict helpers", () => {
  it("keeps the stored badge text but narrows the tone", () => {
    expect(badgeTextOf({ badge: "TOXIC" })).toBe("TOXIC");
    expect(badgeTextOf({ badge: "LEGACY" })).toBe("LEGACY");
    expect(badgeTextOf({})).toBe("UNKNOWN");
    expect(badgeTextOf(null)).toBe("UNKNOWN");
    expect(badgeToneOf({ badge: "LEGACY" })).toBe("UNKNOWN");
    expect(badgeToneOf({ badge: "CAUTION" })).toBe("CAUTION");
  });

  it("reads the top candidate names defensively", () => {
    const verdict = { topCandidate: { common_names: ["Wild strawberry"], scientific_name: "Fragaria vesca" } };
    expect(topNameOf(verdict)).toBe("Wild strawberry");
    expect(scientificNameOf(verdict)).toBe("Fragaria vesca");
    expect(topNameOf({ topCandidate: null })).toBe("Unidentified");
    expect(scientificNameOf({})).toBeNull();
  });
});
