import { useEffect, useRef } from "react";
import { CANOPY, THICKET, UNDERSTORY, type Bramble, type Frond } from "./forestArt.ts";

interface Props {
  /**
   * Hold the forest still: draw one frame and stop the loop. Set while the
   * camera, model downloads or on-device inference need the device's attention.
   */
  calm?: boolean;
  /** Changes whenever the colour mode changes, so the canvas re-reads its palette. */
  mode?: string;
}

interface Spore {
  x: number;
  y: number;
  r: number;
  /** 0 cream spore · 1 cloudberry firefly · 2 spruce glow · 3 elderberry mote */
  kind: 0 | 1 | 2 | 3;
  depth: number;
  drift: number;
  rise: number;
  phase: number;
  pace: number;
  /** Extra velocity from the cursor wake, decays every frame. */
  ex: number;
  ey: number;
}

const FRAME_MS = 1000 / 30;
const WAKE_RADIUS = 120;
const MAX_DPR = 1.5;

function sporeCount(width: number, height: number): number {
  const byArea = Math.round((width * height) / 26000);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const modest =
    (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) ||
    (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4);
  const count = Math.max(14, Math.min(60, byArea));
  return modest ? Math.round(count / 2) : count;
}

function seedSpores(count: number, width: number, height: number): Spore[] {
  return Array.from({ length: count }, () => {
    const roll = Math.random();
    const depth = 0.35 + Math.random() * 0.65;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: (0.7 + Math.random() * 1.5) * depth,
      kind: roll < 0.62 ? 0 : roll < 0.84 ? 1 : roll < 0.94 ? 2 : 3,
      depth,
      drift: (Math.random() - 0.5) * 5,
      rise: -(3 + Math.random() * 9) * depth,
      phase: Math.random() * Math.PI * 2,
      pace: 0.35 + Math.random() * 0.8,
      ex: 0,
      ey: 0,
    } satisfies Spore;
  });
}

function readPalette(): string[] {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return [
    pick("--color-ink", "#f5efe2"),
    pick("--color-amber", "#e59a34"),
    pick("--color-glow", "#2fe68b"),
    pick("--color-violet-ink", "#b99cf0"),
  ];
}

/** Drifting spores and fireflies. Isolated from app state; draws nothing it does not own. */
function SporeCanvas({ calm, mode }: { calm: boolean; mode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let palette = readPalette();
    let width = 0;
    let height = 0;
    let spores: Spore[] = [];
    let frame = 0;
    let last = 0;
    let clock = 0;
    let disposed = false;
    const pointer = { x: -9999, y: -9999, active: false };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of spores) {
        const twinkle = 0.55 + 0.45 * Math.sin(clock * s.pace * 1.7 + s.phase);
        const wake = Math.min(0.45, Math.hypot(s.ex, s.ey) / 70);
        const alpha = Math.min(1, (0.2 + 0.5 * s.depth) * twinkle + wake);
        ctx.fillStyle = palette[s.kind] ?? "#f5efe2";
        ctx.globalAlpha = alpha * 0.16;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      clock += dt;
      const decay = Math.pow(0.04, dt);
      for (const s of spores) {
        if (pointer.active) {
          const dx = s.x - pointer.x;
          const dy = s.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < WAKE_RADIUS && dist > 0.5) {
            const push = (1 - dist / WAKE_RADIUS) * 260 * s.depth * dt;
            s.ex += (dx / dist) * push;
            s.ey += (dy / dist) * push;
          }
        }
        s.x += (s.drift + Math.sin(clock * s.pace + s.phase) * 7 * s.depth + s.ex) * dt;
        s.y += (s.rise + s.ey) * dt;
        s.ex *= decay;
        s.ey *= decay;
        if (s.y < -12) {
          s.y = height + 12;
          s.x = Math.random() * width;
        } else if (s.y > height + 14) {
          s.y = -10;
        }
        if (s.x < -12) s.x = width + 12;
        else if (s.x > width + 12) s.x = -12;
      }
    };

    const shouldRun = () => !disposed && !calm && !reducedMotion.matches && document.visibilityState === "visible";

    const tick = (now: number) => {
      frame = 0;
      if (!shouldRun()) return;
      if (now - last >= FRAME_MS) {
        const dt = Math.min(0.05, last === 0 ? FRAME_MS / 1000 : (now - last) / 1000);
        last = now;
        step(dt);
        draw();
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame !== 0) return;
      if (shouldRun()) {
        last = 0;
        frame = requestAnimationFrame(tick);
      } else {
        draw();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spores = seedSpores(sporeCount(width, height), width, height);
      draw();
    };

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    };
    const onVisibility = () => start();
    const onMotionPreference = () => start();
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    resize();
    // Mode classes land on <html> in a parent effect; read the palette one frame later.
    const paletteFrame = requestAnimationFrame(() => {
      palette = readPalette();
      draw();
      start();
    });

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotionPreference);
    if (finePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(paletteFrame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionPreference);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [calm, mode]);

  return <canvas ref={canvasRef} id="forest-canvas" className="absolute inset-0 size-full" />;
}

const FAR_FILL = "color-mix(in oklab, var(--color-spruce) 34%, var(--color-bg))";
const NEAR_FILL = "color-mix(in oklab, var(--color-spruce) 58%, var(--color-bg))";

function Fronds({ fronds, fill }: { fronds: Frond[]; fill: string }) {
  return (
    <g fill={fill} stroke={fill} strokeLinecap="round">
      {fronds.map((fr) => (
        <g key={fr.stem}>
          <path d={fr.stem} fill="none" strokeWidth={fr.stemWidth} />
          <path d={fr.leaves} stroke="none" />
        </g>
      ))}
    </g>
  );
}

function Cane({ cane, id }: { cane: Bramble; id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="var(--color-violet)" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="var(--color-violet)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--color-violet)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {cane.glows.map((g) => (
        <circle key={`${g.cx}-${g.cy}`} cx={g.cx} cy={g.cy} r={g.r} fill={`url(#${id})`} />
      ))}
      <g fill="none" stroke={NEAR_FILL} strokeLinecap="round">
        <path d={cane.cane} strokeWidth={4.5} />
        <path d={cane.stalks} strokeWidth={1.8} />
      </g>
      <path d={cane.foliage} fill={NEAR_FILL} />
      {cane.berries.map((b, i) => (
        <circle
          key={i}
          cx={b.cx.toFixed(1)}
          cy={b.cy.toFixed(1)}
          r={b.r.toFixed(1)}
          fill={
            b.lit
              ? "color-mix(in oklab, var(--color-violet) 78%, var(--color-ink))"
              : "color-mix(in oklab, var(--color-violet) 62%, var(--color-bg))"
          }
        />
      ))}
    </g>
  );
}

const DRIFT_FAR = { transform: "translate3d(calc(var(--px, 0) * 6px), calc(var(--py, 0) * 4px), 0)" };
const DRIFT_NEAR = { transform: "translate3d(calc(var(--px, 0) * 14px), calc(var(--py, 0) * 9px), 0)" };
const LAYER = "absolute transition-transform duration-700 ease-out-soft will-change-transform";

/**
 * The twilight forest behind the app: a static gradient floor, procedural
 * fern and bramble silhouettes with restrained cursor parallax, a light spore
 * canvas and a paper grain. Purely decorative and fully inert — fixed,
 * pointer-transparent and hidden from assistive tech. High-contrast mode
 * removes it entirely; with canvas or motion unavailable the gradient and
 * silhouettes still stand on their own.
 */
export default function ForestBackdrop({ calm = false, mode = "" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Parallax: desktop pointers only, one style write per frame, never under reduced motion.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      root.style.setProperty("--px", x.toFixed(3));
      root.style.setProperty("--py", y.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      x = 0.5 - event.clientX / window.innerWidth;
      y = 0.5 - event.clientY / window.innerHeight;
      if (frame === 0) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="forest-floor pointer-events-none fixed inset-0 -z-10 overflow-hidden hc:hidden"
    >
      {/* Top-right canopy edge: a blackberry cane arching into frame. */}
      <svg
        viewBox="0 0 560 440"
        className={`${LAYER} top-0 right-0 w-[clamp(250px,44vw,600px)] opacity-90`}
        style={DRIFT_FAR}
      >
        <Cane cane={CANOPY} id="forest-berry-glow-a" />
      </svg>

      {/* Bottom-left understory: fern fronds in two depths. */}
      <svg
        viewBox="0 0 520 620"
        className={`${LAYER} bottom-0 left-0 w-[clamp(220px,40vw,540px)] opacity-80`}
        style={DRIFT_FAR}
      >
        <Fronds fronds={UNDERSTORY.far} fill={FAR_FILL} />
      </svg>
      <svg
        viewBox="0 0 520 620"
        className={`${LAYER} bottom-0 left-0 w-[clamp(220px,40vw,540px)]`}
        style={DRIFT_NEAR}
      >
        <Fronds fronds={UNDERSTORY.near} fill={NEAR_FILL} />
      </svg>

      {/* Bottom-right thicket: room for it on desktop only. */}
      <svg
        viewBox="0 0 380 380"
        className={`${LAYER} right-0 bottom-0 hidden w-[clamp(240px,26vw,400px)] md:block`}
        style={DRIFT_NEAR}
      >
        <Fronds fronds={THICKET.fronds} fill={FAR_FILL} />
        <Cane cane={THICKET.cane} id="forest-berry-glow-b" />
      </svg>

      {/* Depth fog: sinks the silhouettes into the floor so content stays legible. */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-bg/25 to-bg/70" />

      <SporeCanvas calm={calm} mode={mode} />
      <div className="grain absolute inset-0" />
    </div>
  );
}
