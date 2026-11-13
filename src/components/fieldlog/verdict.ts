import type { Badge } from "../../engine/types.ts";

interface StoredVerdict {
  badge?: unknown;
  topCandidate?: { common_names?: unknown; scientific_name?: unknown } | null;
}

const TONES: ReadonlySet<string> = new Set<Badge>(["EDIBLE", "CAUTION", "TOXIC", "UNKNOWN"]);

function asVerdict(verdict: unknown): StoredVerdict {
  return verdict && typeof verdict === "object" ? (verdict as StoredVerdict) : {};
}

/** Badge text exactly as stored (imports may carry any string); UNKNOWN when missing. */
export function badgeTextOf(verdict: unknown): string {
  const badge = asVerdict(verdict).badge;
  return typeof badge === "string" ? badge : "UNKNOWN";
}

/** Badge narrowed to the four engine tones, for class lookups only. */
export function badgeToneOf(verdict: unknown): Badge {
  const badge = badgeTextOf(verdict);
  return TONES.has(badge) ? (badge as Badge) : "UNKNOWN";
}

export function topNameOf(verdict: unknown): string {
  const names = asVerdict(verdict).topCandidate?.common_names;
  const first = Array.isArray(names) ? (names[0] as unknown) : undefined;
  return typeof first === "string" && first ? first : "Unidentified";
}

export function scientificNameOf(verdict: unknown): string | null {
  const name = asVerdict(verdict).topCandidate?.scientific_name;
  return typeof name === "string" && name ? name : null;
}

/** Left rim of a specimen index card. Full class strings so Tailwind emits them. */
export const rimClass: Record<Badge, string> = {
  TOXIC: "border-l-danger",
  CAUTION: "border-l-caution",
  EDIBLE: "border-l-edible",
  UNKNOWN: "border-l-unknown",
};

/** Ink colour of the rubber-stamp verdict seal. */
export const stampClass: Record<Badge, string> = {
  TOXIC: "text-danger",
  CAUTION: "text-caution",
  EDIBLE: "text-edible",
  UNKNOWN: "text-unknown",
};
