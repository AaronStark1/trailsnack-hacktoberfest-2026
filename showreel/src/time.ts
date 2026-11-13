/**
 * The reel's clock and the pure helpers every frame is built from.
 * 120 BPM: a beat is 0.5 s, a bar is 2 s, the reel is 20 bars.
 */

export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const BARS = 20;
export const DURATION = BAR * BARS;

/** Stage size in CSS pixels. Captured at a device scale of 2.5: 1080 × 1920. */
export const W = 432;
export const H = 768;
export const SCALE = 2.5;

/** Simulated iOS safe areas, in stage pixels. */
export const SAFE_TOP = 44;
export const SAFE_BOTTOM = 30;

/** Start of a bar, 1-based: bar(6) is the drop at 10 s. */
export const bar = (n: number): number => (n - 1) * BAR;

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** Progress of t through [a, b], clamped to 0..1. */
export const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

export const inCubic = (k: number): number => k * k * k;
export const outCubic = (k: number): number => 1 - (1 - k) ** 3;
export const outQuart = (k: number): number => 1 - (1 - k) ** 4;
export const outExpo = (k: number): number => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
export const inOutCubic = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const inOutSine = (k: number): number => 0.5 - 0.5 * Math.cos(Math.PI * k);

/** Rises over [a, a+up], holds, falls over [b-down, b]. */
export function window(t: number, a: number, b: number, up = 0.2, down = up): number {
  return Math.min(span(t, a, a + up), 1 - span(t, b - down, b));
}

/** Deterministic hash of an integer (and an optional salt) to 0..1. */
export function hash(n: number, salt = 0): number {
  let h = (Math.imul(n | 0, 0x9e3779b1) ^ Math.imul((salt | 0) + 0x85ebca6b, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Seeded generator for one-off tables built at start-up (never per frame). */
export function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Piecewise-linear track through [time, value] keys, with an ease per segment. */
export function track(t: number, keys: readonly (readonly [number, number])[], ease: (k: number) => number = inOutCubic): number {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return 0;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (a && b && t <= b[0]) return lerp(a[1], b[1], ease(span(t, a[0], b[0])));
  }
  return last[1];
}
