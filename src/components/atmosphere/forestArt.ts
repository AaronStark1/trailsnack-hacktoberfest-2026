/**
 * Procedural botanical silhouettes for the forest backdrop. Everything here is
 * computed once at module load into plain SVG path strings — no images, no
 * network, no per-frame work. A tiny seeded PRNG keeps the shapes identical on
 * every render.
 */

type Pt = readonly [number, number];

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);
const p = ([x, y]: Pt) => `${f(x)} ${f(y)}`;
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const norm = ([x, y]: Pt): Pt => {
  const d = Math.hypot(x, y) || 1;
  return [x / d, y / d];
};
const perp = ([x, y]: Pt): Pt => [-y, x];

/** Almond leaflet from `base` towards `dir`, `len` long and `width` wide at the belly. */
function leaflet(base: Pt, dir: Pt, len: number, width: number): string {
  const side = perp(dir);
  const tip = add(base, dir, len);
  const c1 = add(add(base, dir, len * 0.42), side, width);
  const c2 = add(add(base, dir, len * 0.58), side, -width);
  return `M${p(base)}Q${p(c1)} ${p(tip)}Q${p(c2)} ${p(base)}Z`;
}

export interface Frond {
  /** Rachis centre line, drawn as a stroke. */
  stem: string;
  stemWidth: number;
  /** All pinnae as one filled path. */
  leaves: string;
}

interface FrondSpec {
  base: Pt;
  /** Length of the rachis. */
  length: number;
  /** Lean from vertical in degrees (positive = right). */
  lean: number;
  /** Sideways bow as a fraction of length (sign picks the side). */
  bend: number;
  pinnae: number;
  maxLeaf: number;
}

/** A fern frond: a bowed rachis carrying paired pinnae that swell then taper. */
export function frond({ base, length, lean, bend, pinnae, maxLeaf }: FrondSpec): Frond {
  const a = (lean * Math.PI) / 180;
  const axis: Pt = [Math.sin(a), -Math.cos(a)];
  const tip = add(base, axis, length);
  const ctrl = add(add(base, axis, length * 0.5), perp(axis), bend * length);
  const at = (t: number): Pt => [
    (1 - t) * (1 - t) * base[0] + 2 * (1 - t) * t * ctrl[0] + t * t * tip[0],
    (1 - t) * (1 - t) * base[1] + 2 * (1 - t) * t * ctrl[1] + t * t * tip[1],
  ];
  const tangent = (t: number): Pt =>
    norm([
      2 * (1 - t) * (ctrl[0] - base[0]) + 2 * t * (tip[0] - ctrl[0]),
      2 * (1 - t) * (ctrl[1] - base[1]) + 2 * t * (tip[1] - ctrl[1]),
    ]);

  const sweep = (30 * Math.PI) / 180;
  let leaves = "";
  for (let i = 1; i <= pinnae; i++) {
    const t = 0.1 + 0.88 * (i / pinnae);
    const swell = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04)), 0.7);
    const len = Math.max(3, maxLeaf * swell * (1 - 0.3 * t));
    const origin = at(t);
    const fwd = tangent(t);
    const out = perp(fwd);
    for (const side of [1, -1] as const) {
      const dir = norm([
        out[0] * side * Math.cos(sweep) + fwd[0] * Math.sin(sweep),
        out[1] * side * Math.cos(sweep) + fwd[1] * Math.sin(sweep),
      ]);
      leaves += leaflet(origin, dir, len, Math.max(1.4, len * 0.17));
    }
  }
  return { stem: `M${p(base)}Q${p(ctrl)} ${p(tip)}`, stemWidth: Math.max(1.5, length * 0.008), leaves };
}

export interface Bramble {
  cane: string;
  /** Thorns and trifoliate leaves as one filled path. */
  foliage: string;
  /** Stalks that carry the fruit, drawn as strokes. */
  stalks: string;
  /** Drupelets of every berry cluster. */
  berries: { cx: number; cy: number; r: number; lit: boolean }[];
  /** Soft light pools behind each cluster. */
  glows: { cx: number; cy: number; r: number }[];
}

interface BrambleSpec {
  /** Cubic Bézier control points of the cane. */
  points: readonly [Pt, Pt, Pt, Pt];
  /** Positions (0..1) along the cane that carry a leaf spray. */
  leafAt: readonly number[];
  /** Positions (0..1) along the cane that carry a berry cluster. */
  fruitAt: readonly number[];
  seed: number;
}

/** A blackberry cane: an arching stem with thorns, trifoliate leaves and hanging fruit. */
export function bramble({ points, leafAt, fruitAt, seed }: BrambleSpec): Bramble {
  const [p0, p1, p2, p3] = points;
  const rand = prng(seed);
  const at = (t: number): Pt => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  const tangent = (t: number): Pt => {
    const u = 1 - t;
    return norm([
      3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
      3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
    ]);
  };

  let foliage = "";
  // Thorns: small back-swept hooks, alternating sides.
  for (let i = 0; i < 16; i++) {
    const t = 0.05 + (i / 16) * 0.9 + (rand() - 0.5) * 0.02;
    const o = at(t);
    const fwd = tangent(t);
    const side = perp(fwd);
    const s = i % 2 === 0 ? 1 : -1;
    const apex = add(add(o, side, s * 8), fwd, -4);
    foliage += `M${p(add(o, fwd, -3.2))}L${p(apex)}L${p(add(o, fwd, 3.2))}Z`;
  }
  // Trifoliate leaf sprays on short petioles.
  let stalks = "";
  leafAt.forEach((t, i) => {
    const o = at(t);
    const fwd = tangent(t);
    const s = i % 2 === 0 ? 1 : -1;
    const out = norm(add(perp(fwd), fwd, 0.5 * s));
    const dir: Pt = [out[0] * s, out[1] * s];
    const hub = add(o, dir, 20);
    stalks += `M${p(o)}L${p(hub)}`;
    const size = 34 + rand() * 14;
    for (const spread of [-0.85, 0, 0.85]) {
      const c = Math.cos(spread);
      const sn = Math.sin(spread);
      const d: Pt = [dir[0] * c - dir[1] * sn, dir[0] * sn + dir[1] * c];
      foliage += leaflet(hub, d, spread === 0 ? size : size * 0.78, size * 0.3);
    }
  });

  const berries: Bramble["berries"] = [];
  const glows: Bramble["glows"] = [];
  for (const t of fruitAt) {
    const o = at(t);
    const drop = 30 + rand() * 22;
    const sway = (rand() - 0.5) * 16;
    const centre: Pt = [o[0] + sway, o[1] + drop + 15];
    stalks += `M${p(o)}Q${f(o[0] + sway * 0.2)} ${f(o[1] + drop * 0.6)} ${f(centre[0])} ${f(centre[1] - 15)}`;
    // Calyx: two little sepals above the fruit.
    foliage += leaflet([centre[0], centre[1] - 15], norm([-1, -0.5]), 9, 3);
    foliage += leaflet([centre[0], centre[1] - 15], norm([1, -0.5]), 9, 3);
    // Drupelets: hex-packed beads inside an egg-shaped outline.
    const rx = 12.5;
    const ry = 16;
    const bead = 3.3;
    let row = 0;
    for (let y = -ry + bead; y <= ry - bead + 0.1; y += bead * 1.62, row++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry))) - bead * 0.5;
      const offset = row % 2 === 0 ? 0 : bead * 0.95;
      for (let x = -half + offset; x <= half + 0.1; x += bead * 1.9) {
        berries.push({
          cx: centre[0] + x + (rand() - 0.5) * 0.6,
          cy: centre[1] + y + (rand() - 0.5) * 0.6,
          r: bead * (0.92 + rand() * 0.16),
          lit: rand() > 0.62,
        });
      }
    }
    glows.push({ cx: centre[0], cy: centre[1], r: 46 });
  }

  return {
    cane: `M${p(p0)}C${p(p1)} ${p(p2)} ${p(p3)}`,
    foliage,
    stalks,
    berries,
    glows,
  };
}

/* ------------------------------------------------------------------------- */
/* The three corner compositions used by ForestBackdrop                       */
/* ------------------------------------------------------------------------- */

/** Bottom-left understory: viewBox 0 0 520 620. `far` sits behind `near`. */
export const UNDERSTORY = {
  far: [
    frond({ base: [120, 650], length: 610, lean: 26, bend: -0.1, pinnae: 30, maxLeaf: 74 }),
    frond({ base: [10, 650], length: 430, lean: -6, bend: 0.1, pinnae: 22, maxLeaf: 52 }),
  ],
  near: [
    frond({ base: [60, 660], length: 520, lean: 8, bend: 0.14, pinnae: 28, maxLeaf: 68 }),
    frond({ base: [90, 660], length: 420, lean: 44, bend: -0.2, pinnae: 24, maxLeaf: 56 }),
    frond({ base: [30, 660], length: 300, lean: 64, bend: -0.24, pinnae: 18, maxLeaf: 40 }),
  ],
};

/** Top-right canopy edge: viewBox 0 0 560 440. */
export const CANOPY = bramble({
  points: [
    [590, -20],
    [430, 70],
    [250, 30],
    [70, 250],
  ],
  leafAt: [0.16, 0.34, 0.5, 0.68, 0.84, 0.97],
  fruitAt: [0.42, 0.6, 0.9],
  seed: 20261113,
});

/** Bottom-right thicket (desktop only): viewBox 0 0 380 380. */
export const THICKET = {
  fronds: [
    frond({ base: [400, 400], length: 360, lean: -52, bend: 0.18, pinnae: 22, maxLeaf: 50 }),
    frond({ base: [380, 410], length: 300, lean: -24, bend: 0.16, pinnae: 18, maxLeaf: 42 }),
  ],
  cane: bramble({
    points: [
      [400, 250],
      [330, 230],
      [270, 250],
      [200, 330],
    ],
    leafAt: [0.3, 0.75],
    fruitAt: [0.55, 0.95],
    seed: 7,
  }),
};
