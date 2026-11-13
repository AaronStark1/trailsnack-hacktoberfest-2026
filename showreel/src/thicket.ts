/**
 * Camera work for the living thicket. Two films share the engine: the full
 * frame behind every scene, and the square "camera feed" of the Scan screen.
 * Each returns a complete ThicketFrame for a timestamp — no state survives
 * from one frame to the next.
 */
import {
  createThicketFilm,
  type ThicketFilm,
  type ThicketFrame,
  type ThicketFruit,
  type ThicketSprig,
} from "../../src/thicket/engine.ts";
import { H, SCALE, W, bar, clamp, inOutCubic, inOutSine, lerp, outCubic, span, track } from "./time.ts";
import { SWEEP, sweepAt, toNdc } from "./touch.ts";

/** The featured specimen: a cluster of wild strawberries in the middle of the path. */
export const SPRIG: ThicketSprig = { x: 0.02, y: -0.16, z: 5.5, fruits: 5, scale: 1.05 };

const SHAPE = [1, 1] as const;
const PORTRAIT_FOCAL = 1.22;
const SQUARE_FOCAL = 1.66;

export interface Films {
  main: ThicketFilm;
  finder: ThicketFilm;
}

export function createFilms(main: HTMLCanvasElement, finder: HTMLCanvasElement): Films | null {
  const a = createThicketFilm(main, {
    width: W * SCALE,
    height: H * SCALE,
    density: 1.15,
    shape: SHAPE,
    sprigs: [SPRIG],
  });
  const b = createThicketFilm(finder, { width: W * SCALE, height: W * SCALE, density: 1.15, shape: SHAPE, sprigs: [SPRIG] });
  return a && b ? { main: a, finder: b } : null;
}

/** View direction that places a point of the thicket at (ox, oy) in normalised device coordinates. */
function frameOn(
  film: ThicketFilm,
  travel: number,
  target: { x: number; y: number; z: number },
  focal: number,
  aspect: number,
  ox = 0,
  oy = 0,
): [number, number] {
  const [yaw, pitch] = film.aim(travel, target.x, target.y, target.z);
  return [yaw - Math.atan((ox * aspect) / focal), pitch - Math.atan(oy / focal)];
}

const mix2 = (a: readonly [number, number], b: readonly [number, number], k: number): [number, number] => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
];

/** The n-th fruit of a kind, nearest the middle of the path first. */
function fruitOf(film: ThicketFilm, kind: ThicketFruit["kind"], nth: number): ThicketFruit {
  const list = film.fruit
    .filter((f) => f.kind === kind && Math.hypot(f.x, f.y) < 1.5 && Math.hypot(f.x, f.y) > 0.75)
    .sort((p, q) => p.z - q.z);
  return list[nth % Math.max(1, list.length)] ?? { kind, x: 0.9, y: 0.2, z: 20, size: 1 };
}

/* ------------------------------------------------------------------------- */
/* Main film                                                                  */
/* ------------------------------------------------------------------------- */

const DROP = bar(6);
const PROOF = [bar(17), bar(18), bar(19)] as const;
const PROOF_FRUIT: readonly [ThicketFruit["kind"], number][] = [
  ["cloudberry", 2],
  ["elderberry", 1],
  ["currant", 3],
];

/** Position along the path for the continuous part of the reel (bars 1–16). */
function travelAt(t: number): number {
  return track(t, [
    [0, 2.2],
    [2, 2.7],
    [4, 3.55], // settled in front of the strawberries
    [6, 11.0], // bar 3: the glide
    [8, 11.7],
    [DROP, 12.1],
    [28.4, 15.6],
    [30, 17.9], // bar 15: pulling back out into the thicket
    [32, 18.4],
  ]);
}

export function mainFrame(film: ThicketFilm, t: number): ThicketFrame {
  const aspect = W / H;

  // Bars 17–19: three push-cuts, each on its own fruit; the last one carries the outro.
  if (t >= PROOF[0]) {
    const cut = t >= PROOF[2] ? 2 : t >= PROOF[1] ? 1 : 0;
    const [kind, nth] = PROOF_FRUIT[cut] ?? ["cloudberry", 0];
    const fruit = fruitOf(film, kind, nth);
    const since = t - (PROOF[cut] ?? 0);
    const zoom = 1.12 + 0.05 * since;
    const travel = fruit.z - 2.3 + 0.1 * since;
    return {
      time: t,
      travel,
      look: frameOn(film, travel, fruit, PORTRAIT_FOCAL * zoom, aspect, 0, -0.42),
      zoom,
      breathe: 0.6,
      disperse: inOutSine(span(t, 38.2, 39.9)),
      rush: 0.25 * (1 - span(since, 0, 0.5)),
    };
  }

  const travel = travelAt(t);
  const speed = (travelAt(t + 0.02) - travelAt(t - 0.02)) / 0.04;
  const rush = clamp((speed - 0.5) / 9);

  // Bar 2: the lens settles on the strawberries as they gather out of the embers.
  const toSprig = inOutCubic(span(t, 1.4, 3.0)) * (1 - inOutCubic(span(t, 4.0, 4.7)));
  const zoomIn = inOutCubic(span(t, 1.6, 3.6)) * (1 - inOutCubic(span(t, 4.0, 4.8)));
  const zoom = 1 + 0.3 * zoomIn - 0.18 * inOutCubic(span(t, 28.5, 29.8)) * (1 - inOutCubic(span(t, 31.2, 32)));
  const look = mix2(
    film.heading(travel),
    frameOn(film, travel, SPRIG, PORTRAIT_FOCAL * zoom, aspect, 0, -0.3),
    toSprig,
  );

  // Bar 3: the thumb's wake, newest point first.
  const wake: [number, number, number][] = [];
  if (t > SWEEP.from && t < SWEEP.to + 1.6) {
    for (let i = 0; i < 6; i++) {
      const at = t - i * 0.075;
      if (at < SWEEP.from) break;
      const [x, y] = toNdc(sweepAt(Math.min(at, SWEEP.to)));
      const strength = clamp((at - SWEEP.from) * 7) * Math.exp(-2.4 * i * 0.075) * Math.exp(-2.4 * Math.max(0, t - SWEEP.to));
      wake.push([x, y, strength]);
    }
  }

  return {
    time: t,
    travel,
    look,
    zoom,
    rush,
    wake,
    breathe: 0.55,
    // Bars 1–2: the fruit starts as drifting embers and gathers into the cluster.
    disperse: 1 - inOutCubic(span(t, 1.9, 3.3)),
  };
}

/** Opacity of the main canvas: the Scan screen steps the backdrop right back, as the app does. */
export function mainOpacity(t: number): number {
  return 1 - 0.8 * Math.min(span(t, 7.95, 8.2), 1 - span(t, DROP, DROP + 0.001));
}

/* ------------------------------------------------------------------------- */
/* Finder film: the Scan screen's camera feed                                 */
/* ------------------------------------------------------------------------- */

/** 0..1: how far the hiker has settled the frame on the cluster. */
export const lockAt = (t: number): number => outCubic(span(t, 8.25, 9.45));

/** Device roll in degrees, as the HUD's level line reads it. */
export function rollAt(t: number): number {
  const settle = outCubic(span(t, 8.2, 9.2));
  return lerp(8.4, 0.4, settle) + 0.25 * Math.sin(t * 7.3) * (1 - 0.6 * settle);
}

export function finderFrame(film: ThicketFilm, t: number): ThicketFrame {
  const at = Math.min(t, DROP); // the shutter freezes the frame
  const lock = lockAt(at);
  const zoom = lerp(1.0, 1.32, lock);
  const travel = SPRIG.z - 1.9 + 0.06 * Math.sin(at * 0.9);
  const hand = 1 - 0.85 * lock;
  const [yaw, pitch] = frameOn(film, travel, { x: SPRIG.x, y: SPRIG.y + 0.1, z: SPRIG.z }, SQUARE_FOCAL * zoom, 1);
  return {
    time: at,
    travel,
    look: [
      yaw + 0.2 * (1 - lock) + 0.012 * hand * Math.sin(at * 5.3),
      pitch - 0.13 * (1 - lock) + 0.01 * hand * Math.cos(at * 4.1),
    ],
    zoom,
    breathe: 0.4,
  };
}

/** A fixed portrait of one fruit, for Field Log thumbnails. */
export function portraitFrame(film: ThicketFilm, kind: ThicketFruit["kind"], nth: number): ThicketFrame {
  const fruit = fruitOf(film, kind, nth);
  const zoom = 1.7;
  const travel = fruit.z - 1.75;
  return { time: 12.5, travel, look: frameOn(film, travel, fruit, SQUARE_FOCAL * zoom, 1), zoom, breathe: 0.4 };
}
