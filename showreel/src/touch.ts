/**
 * The hiker's thumb, as a function of time: one sweep through the thicket and
 * a handful of taps. Positions are stage pixels.
 */
import { H, W, clamp, inOutCubic, inOutSine, lerp, outCubic, span } from "./time.ts";

export interface Point {
  x: number;
  y: number;
}

/** Bar 3: a drag across the living thicket. */
export const SWEEP = { from: 4.2, to: 5.6 } as const;

export function sweepAt(t: number): Point {
  const k = inOutSine(span(t, SWEEP.from, SWEEP.to));
  return { x: lerp(52, 384, k), y: lerp(590, 262, k) - Math.sin(k * Math.PI) * 46 };
}

export interface Tap extends Point {
  t: number;
}

/** Every tap of the reel, in order. Targets are filled in once the layout is measured. */
export const TAPS: Tap[] = [
  { t: 7.74, x: 344, y: 76 }, // Launch Scanner
  { t: 9.9, x: 216, y: 598 }, // shutter (the capture lands on the drop at 10.0)
  { t: 16.5, x: 52, y: 300 }, // checklist 1
  { t: 17.0, x: 52, y: 380 }, // checklist 2
  { t: 17.5, x: 52, y: 460 }, // checklist 3
  { t: 18.0, x: 216, y: 610 }, // Deep Look
  { t: 23.3, x: 216, y: 330 }, // India poison control
  { t: 24.5, x: 216, y: 560 }, // Save to Field Log
  { t: 28.5, x: 330, y: 76 }, // Field Guide & Home
];

export interface Thumb extends Point {
  /** 0..1 visibility of the touch ring. */
  alpha: number;
  /** 0..1 pressure: the ring tightens while the thumb is down. */
  press: number;
  /** 0..1 progress of the ripple that leaves a tap; 0 when there is none. */
  ripple: number;
  rippleAt: Point;
}

const APPROACH = 0.34;
const LINGER = 0.3;

/** Where the thumb is, and what it is doing, at time t. */
export function thumbAt(t: number): Thumb {
  const idle: Thumb = { x: W / 2, y: H + 40, alpha: 0, press: 0, ripple: 0, rippleAt: { x: 0, y: 0 } };

  if (t >= SWEEP.from - 0.15 && t <= SWEEP.to + 0.25) {
    const p = sweepAt(t);
    const alpha = Math.min(span(t, SWEEP.from - 0.15, SWEEP.from), 1 - span(t, SWEEP.to, SWEEP.to + 0.25));
    return { ...idle, ...p, alpha, press: alpha };
  }

  let out = idle;
  for (let i = 0; i < TAPS.length; i++) {
    const tap = TAPS[i];
    if (!tap) continue;
    const prev = TAPS[i - 1];
    const next = TAPS[i + 1];
    const start = tap.t - APPROACH;
    const end = tap.t + LINGER;
    if (t < start || t > end) continue;
    // Arrive from the previous target when it was touched a moment ago; otherwise rise from below.
    const chained = prev !== undefined && tap.t - prev.t < APPROACH + LINGER + 0.4;
    const from: Point = chained && prev ? prev : { x: tap.x + 26, y: tap.y + 64 };
    const k = outCubic(span(t, start, tap.t - 0.06));
    const leaving = next !== undefined && next.t - tap.t < APPROACH + LINGER + 0.4;
    const alpha = Math.min(chained ? 1 : span(t, start, start + 0.14), leaving ? 1 : 1 - span(t, tap.t + 0.12, end));
    const press = Math.min(span(t, tap.t - 0.07, tap.t), 1 - span(t, tap.t + 0.02, tap.t + 0.14));
    out = { ...idle, x: lerp(from.x, tap.x, k), y: lerp(from.y, tap.y, k), alpha: clamp(alpha), press: inOutCubic(clamp(press)) };
  }

  // The ripple belongs to the most recent tap, wherever the thumb has moved on to.
  for (const tap of TAPS) {
    const k = span(t, tap.t, tap.t + 0.42);
    if (t >= tap.t && k < 1) {
      out = { ...out, ripple: Math.max(k, 0.0001), rippleAt: { x: tap.x, y: tap.y } };
    }
  }
  return out;
}

/** Stage pixels to the thicket's normalised device coordinates. */
export const toNdc = (p: Point): [number, number] => [(p.x / W) * 2 - 1, 1 - (p.y / H) * 2];
