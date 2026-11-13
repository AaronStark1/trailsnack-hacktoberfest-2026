/**
 * The reel's scenes. `buildStage` writes the whole scene graph once; the
 * returned `update(t)` then sets every animated property from the timestamp
 * alone. Nothing here remembers the previous frame: seeking to any time, in
 * any order, produces the same picture.
 */
import { icon } from "./icons.ts";
import {
  BEAT,
  H,
  SAFE_BOTTOM,
  SAFE_TOP,
  W,
  bar,
  clamp,
  hash,
  inCubic,
  inOutCubic,
  inOutSine,
  lerp,
  outCubic,
  outExpo,
  outQuart,
  prng,
  span,
  track,
  window as hold,
} from "./time.ts";
import { lockAt, rollAt } from "./thicket.ts";
import { SWEEP, TAPS, sweepAt, thumbAt } from "./touch.ts";
import {
  DEEP_LOOK,
  HOME_INDICATOR,
  SPECIMEN_HASH,
  STATUS_BAR,
  appHeader,
  checklist,
  deepLookDrawer,
  deepLookTrigger,
  dock,
  emergency,
  landingHeader,
  logEntry,
  lookalikes,
  pill,
  ruleLedger,
  saveSection,
  sectionHeader,
  specimenPlate,
  verdictBadge,
  type LogEntry,
} from "./ui.ts";

export interface Stills {
  /** The frame the shutter caught at 10.0 s. */
  specimen: string;
  /** Earlier finds for the Field Log. */
  cloudberry: string;
  elderberry: string;
  currant: string;
}

type Styled = HTMLElement | SVGElement;

interface Refs {
  one(name: string): Styled;
  all(name: string): Styled[];
}

function collect(root: Element): Refs {
  const single = new Map<string, Styled>();
  const multi = new Map<string, Styled[]>();
  root.querySelectorAll<Styled>("[data-r]").forEach((el) => single.set(el.dataset.r ?? "", el));
  root.querySelectorAll<Styled>("[data-rs]").forEach((el) => {
    const name = el.dataset.rs ?? "";
    multi.set(name, [...(multi.get(name) ?? []), el]);
  });
  return {
    one(name) {
      const el = single.get(name);
      if (!el) throw new Error(`reel: no element named "${name}"`);
      return el;
    },
    all: (name) => multi.get(name) ?? [],
  };
}

/* Setters: each writes an absolute value, never a delta. */

function fade(el: Styled, opacity: number): void {
  const o = clamp(opacity);
  el.style.opacity = o.toFixed(4);
  el.style.visibility = o < 0.002 ? "hidden" : "visible";
}

function place(el: Styled, x = 0, y = 0, scale = 1, rotate = 0): void {
  el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(3)}deg)`;
}

function on(el: Styled, active: boolean): void {
  el.dataset.on = active ? "1" : "0";
}

function text(el: Styled, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

/** Distance from the top of `ancestor` to the top of `el`, ignoring transforms. */
function topIn(el: Styled, ancestor: Element): number {
  let y = 0;
  let node: Element | null = el;
  while (node instanceof HTMLElement && node !== ancestor) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

/* ------------------------------------------------------------------------- */
/* Timing                                                                     */
/* ------------------------------------------------------------------------- */

const T = {
  words: [bar(2), bar(2) + BEAT, bar(2) + 2 * BEAT] as const,
  glide: bar(3),
  home: bar(4),
  whip: bar(5),
  drop: bar(6),
  stamp: bar(6) + BEAT,
  lookalikes: bar(7),
  ledger: bar(8),
  checklist: bar(9),
  drawer: bar(10),
  latency: bar(11),
  emergency: bar(12),
  save: bar(13),
  log: bar(14),
  harmony: bar(15),
  dual: bar(16),
  proof: [bar(17), bar(18), bar(19)] as const,
  lockup: bar(19) + 0.85,
  final: bar(20),
  end: bar(21),
};

/** Bar 5's whip: the home page leaves to the left (0 → 1) as the camera arrives from the right (1 → 0). */
const whipOutAt = (t: number): number => inCubic(span(t, T.whip - 0.13, T.whip + 0.03));
const whipInAt = (t: number): number => 1 - outCubic(span(t, T.whip - 0.03, T.whip + 0.17));

/** Top of the page column below the sticky header, and the top edge of the dock. */
const PAGE_TOP = SAFE_TOP + 64 + 16;
const DOCK_TOP = H - SAFE_BOTTOM - 70;

/* ------------------------------------------------------------------------- */
/* Markup                                                                     */
/* ------------------------------------------------------------------------- */

/** A jagged alpine skyline: midpoint displacement from a fixed seed. */
function ridge(seed: number, base: number, relief: number, roughness: number): string {
  const random = prng(seed);
  let heights = [random(), random(), random()];
  for (let pass = 0, amp = 1; pass < 6; pass++, amp *= roughness) {
    const next: number[] = [];
    for (let i = 0; i < heights.length - 1; i++) {
      const a = heights[i] ?? 0;
      const b = heights[i + 1] ?? 0;
      next.push(a, (a + b) / 2 + (random() - 0.5) * amp);
    }
    next.push(heights[heights.length - 1] ?? 0);
    heights = next;
  }
  const step = W / (heights.length - 1);
  const points = heights.map((h, i) => `${(i * step).toFixed(1)} ${(base - h * relief).toFixed(1)}`);
  return `M0 480L${points.join("L")}L${W} 480Z`;
}

const RIDGE = `<svg viewBox="0 0 ${W} 480" width="${W}" height="480" class="absolute inset-x-0 bottom-0" aria-hidden="true">
  <defs>
    <radialGradient id="dusk" cx="50%" cy="58%" r="62%"><stop offset="0" stop-color="#2c6f5c" stop-opacity="0.5"/><stop offset="0.55" stop-color="#17382f" stop-opacity="0.26"/><stop offset="1" stop-color="#060b08" stop-opacity="0"/></radialGradient>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3d33"/><stop offset="1" stop-color="#0d1a15"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12261f"/><stop offset="1" stop-color="#08110d"/></linearGradient>
  </defs>
  <rect width="${W}" height="480" fill="url(#dusk)"/>
  <path data-r="ridgeFar" d="${ridge(11, 250, 150, 0.56)}" fill="url(#far)"/>
  <path data-r="ridgeMid" d="${ridge(29, 330, 130, 0.52)}" fill="url(#mid)"/>
  <path data-r="ridgeNear" d="${ridge(47, 420, 110, 0.5)}" fill="#060b08"/>
</svg>`;

const SIGNAL = `<svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true" class="-ml-0.5 shrink-0 opacity-80"><rect x="0.500" y="7.500" width="2" height="3" rx="0.500"/><rect x="4.500" y="5.500" width="2" height="5" rx="0.500"/><rect x="8.500" y="3" width="2" height="7.500" rx="0.500"/><rect x="12.500" y="0.500" width="2" height="10" rx="0.500"/></svg>`;

const WORDS = ["Zero<br />signal", "Zero<br />guesswork", "Wild, not<br />reckless"];

function hookScene(): string {
  return `<section data-scene="hook" class="layer">
    <div data-r="ridge" class="absolute inset-0">${RIDGE}</div>
    <div data-r="mistA" class="absolute top-[430px] -left-40 h-28 w-[680px] rounded-full bg-[#9fd8c4]/[0.07] blur-3xl"></div>
    <div data-r="mistB" class="absolute top-[560px] -left-24 h-24 w-[620px] rounded-full bg-ink/[0.06] blur-3xl"></div>
    <div data-r="offline" class="absolute right-4 origin-right" style="top:calc(var(--safe-top) + 12px)">
      <span class="mono-label inline-flex h-8 items-center gap-2 rounded-full border border-glow/40 bg-spruce/55 px-3 whitespace-nowrap text-glow">
        <span data-r="offlineDot" class="size-1.5 rounded-full bg-current"></span>${icon("plane", 14, 2.2, "rotate-45")}Airplane mode • 0 bars${SIGNAL}
      </span>
    </div>
    <p data-r="fix" class="mono-label on-film absolute right-4 flex items-center gap-2 text-right text-ink-muted" style="top:calc(var(--safe-top) + 58px)">${icon("mapPinCheck", 14, 2, "text-glow")}<span>32°14'42"N 77°10'33"E<br />2,480 m · offline fix</span></p>
    ${WORDS.map((w) => `<p data-rs="word" class="title absolute inset-x-0 top-[112px] origin-[50%_60%] text-center text-[112px]">${w}</p>`).join("")}
  </section>`;
}

const EMBERS = 46;

function glideScene(): string {
  let embers = "";
  for (let i = 0; i < EMBERS; i++) {
    const size = 2 + Math.round(hash(i, 1) * 3);
    embers += `<span data-rs="ember" class="absolute top-0 left-0 rounded-full bg-amber-bright shadow-[0_0_10px_2px_rgb(229_154_52/0.75)]" style="width:${size}px;height:${size}px"></span>`;
  }
  return `<section data-scene="glide" class="layer">
    ${embers}
    <div data-r="glideCaption" class="on-film absolute inset-x-5 bottom-[92px]">
      <p class="mono-label flex items-center gap-2.5 text-amber"><span class="h-px w-[26px] bg-current opacity-70"></span>The living thicket</p>
      <p class="title mt-3 text-[58px]">Touch it<br />and it moves</p>
      <p class="mono-label mt-3.5 text-ink-muted">WebGL2 point sprites · no textures · no network</p>
    </div>
  </section>`;
}

function homeScene(): string {
  const rules = ["Worst case wins", "No app confirms mushrooms", "AI can only lower a verdict"]
    .map((r) => `<li class="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-line-strong px-3.5 font-mono text-[11px] leading-none font-medium tracking-[0.12em] text-ink uppercase"><span class="size-1.5 rounded-full bg-amber"></span>${r}</li>`)
    .join("");
  return `<section data-scene="home" class="layer">
    <div data-r="homeBody" class="absolute inset-0">
      <div data-r="covenant" class="absolute inset-x-4 top-[134px]">
        <p class="mono-label on-film flex items-center gap-3 text-amber"><span class="h-px w-[26px] bg-current opacity-70"></span>The safety covenant</p>
        <article data-r="covenantCard" class="mt-3.5 overflow-hidden rounded-[18px] border border-amber/55 bg-glass shadow-[inset_0_1px_0_rgb(245_239_226/0.06),0_30px_60px_-36px_rgb(0_0_0/0.9)] backdrop-blur-[12px] backdrop-saturate-125">
          <div class="h-[9px] bg-amber [mask:url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2218%22%20height=%229%22%3E%3Cpath%20d=%22M0%200h18L9%209z%22/%3E%3C/svg%3E')_repeat-x]"></div>
          <div class="grid gap-[18px] px-[22px] pt-6 pb-[26px]">
            <p class="mono-label text-amber">Read before use</p>
            <p class="display text-[40px] leading-none text-ink">“The default answer is always: <span data-r="covenantAnswer" class="text-amber">Unidentified — do not ingest.</span>”</p>
            <p class="text-[0.9375rem] leading-relaxed text-ink-muted">TrailSnack is an <strong class="font-semibold text-ink">educational reference, not a permission slip.</strong> The app never declares any wild find safe. A deterministic safety engine applies worst-case rules, where <strong class="font-semibold text-ink">toxic lookalikes always win.</strong></p>
            <ul class="m-0 flex list-none flex-wrap gap-2.5 p-0">${rules}</ul>
          </div>
        </article>
      </div>
      <div data-r="homeHeader" class="absolute inset-x-0 top-0">${landingHeader()}</div>
    </div>
  </section>`;
}

const BRACKETS = [
  "top-0 left-0 rounded-tl-[10px] border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-[10px] border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-[10px] border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-[10px] border-b-2 border-r-2",
];
const RULER_X = "absolute inset-x-12 h-1.5 opacity-45 bg-[repeating-linear-gradient(90deg,var(--color-hud)_0_1px,transparent_1px_12px)]";
const RULER_Y = "absolute inset-y-12 w-1.5 opacity-45 bg-[repeating-linear-gradient(180deg,var(--color-hud)_0_1px,transparent_1px_12px)]";
const READOUT = "mono-label absolute rounded-full bg-black/55 px-2.5 py-1.5 text-hud backdrop-blur-sm data-[on=1]:text-glow";
const ROUND = "inline-flex size-[52px] items-center justify-center rounded-full border border-line-strong bg-surface text-ink";

/** src/components/scan: the viewfinder, its framing HUD and the capture rack. */
function finder(feed: string, live: boolean): string {
  return `<div class="relative aspect-square w-full overflow-hidden bg-black">
    ${feed}
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <span class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgb(0_0_0/0.5)_100%)]"></span>
      <div class="relative aspect-square w-[88%]">
        ${BRACKETS.map((c) => `<span ${live ? `data-rs="bracket"` : ""} class="absolute size-10 border-hud/90 ${c}"></span>`).join("")}
        <span class="${RULER_X} top-0"></span><span class="${RULER_Y} left-0"></span><span class="${RULER_Y} right-0"></span>
        <div ${live ? `data-r="level"` : ""} data-on="1" class="absolute inset-x-6 top-1/2 h-px text-hud/80 data-[on=1]:text-glow">
          <span class="absolute inset-y-0 right-[calc(50%+72px)] left-0 bg-current"></span><span class="absolute inset-y-0 right-0 left-[calc(50%+72px)] bg-current"></span>
        </div>
        <div ${live ? `data-r="reticle"` : ""} class="absolute top-1/2 left-1/2 -mt-16 -ml-16 size-32">
          <span class="absolute inset-0 rounded-full border border-amber-bright/90 shadow-[0_0_18px_-2px_var(--color-amber),inset_0_0_14px_-6px_var(--color-amber)]"></span>
          <span class="absolute -top-3 left-1/2 h-2 w-px -translate-x-1/2 bg-hud"></span><span class="absolute -bottom-3 left-1/2 h-2 w-px -translate-x-1/2 bg-hud"></span>
          <span class="absolute top-1/2 -left-3 h-px w-2 -translate-y-1/2 bg-hud"></span><span class="absolute top-1/2 -right-3 h-px w-2 -translate-y-1/2 bg-hud"></span>
          <span class="absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud"></span>
        </div>
        <span class="${READOUT} top-3 left-3">1:1 · 1024 px</span>
        <span ${live ? `data-r="roll"` : ""} data-on="1" class="${READOUT} top-3 right-3">Level +0.4°</span>
      </div>
    </div>
    <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/45 to-transparent px-5 pt-12 pb-4 text-center">
      <p class="text-[0.9375rem] leading-snug font-medium text-hud">Fill the frame with one specimen; include leaves, stem, or cap underside if possible.</p>
    </div>
  </div>`;
}

function captureRack(live: boolean): string {
  return `<div class="flex items-start justify-center gap-7">
    <div class="flex w-16 flex-col items-center gap-2 pt-2.5"><span class="${ROUND}">${icon("switchCamera", 22)}</span><span class="mono-label text-ink-faint">Flip</span></div>
    <div class="flex flex-col items-center gap-2">
      <span class="relative block size-[72px] rounded-full border-2 border-ink/85">
        <span ${live ? `data-r="shutterRing"` : ""} class="absolute -inset-0.5 rounded-full border-2 border-amber-bright opacity-0"></span>
        <span ${live ? `data-r="shutter"` : ""} class="absolute inset-[5px] rounded-full bg-amber shadow-[inset_0_2px_0_rgb(255_255_255/0.4),inset_0_-3px_6px_rgb(0_0_0/0.25),0_0_22px_-2px_var(--color-amber)]"></span>
      </span>
      <span class="mono-label text-ink-muted">Capture</span>
    </div>
    <div class="flex w-16 flex-col items-center gap-2 pt-2.5"><span class="${ROUND}">${icon("flashlightOff", 22)}</span><span class="mono-label text-ink-faint">Torch</span></div>
  </div>`;
}

function scanScene(): string {
  return `<section data-scene="scan" class="layer">
    <div data-r="scanBody" class="absolute inset-0">
      <div class="absolute inset-x-0" style="top:${SAFE_TOP + 64}px">${finder(`<div data-slot="finder"></div>`, true)}</div>
      <div class="absolute inset-x-0" style="top:${SAFE_TOP + 64 + W + 16}px">${captureRack(true)}</div>
    </div>
  </section>`;
}

function assessScene(photo: string, saved: LogEntry): string {
  return `<section data-scene="assess" class="layer">
    <div data-r="page" class="absolute inset-x-0 top-0 origin-[50%_420px]">
      <div data-r="column" class="on-thicket relative grid gap-6 px-4 pb-48" style="padding-top:${PAGE_TOP}px">
        <div class="grid gap-4">${specimenPlate(photo)}${verdictBadge()}</div>
        ${lookalikes()}
        ${ruleLedger()}
        ${checklist()}
        ${deepLookTrigger()}
        ${emergency()}
        ${saveSection(saved)}
      </div>
    </div>
  </section>`;
}

function logScene(entries: LogEntry[]): string {
  return `<section data-scene="log" class="layer">
    <div data-r="logPage" class="on-thicket absolute inset-x-0 top-0 grid origin-[50%_40%] gap-6 px-4" style="padding-top:${PAGE_TOP + 8}px">
      <div data-r="logHead">${sectionHeader({ eyebrow: "03 · Field Log", title: "Specimen Archive", level: 1, right: pill(`${entries.length} entries`, "accent", { icon: "notebookPen" }) })}</div>
      <ol class="m-0 grid gap-4 p-0">${entries.map((e) => logEntry(e)).join("")}</ol>
    </div>
  </section>`;
}

function harmonyScene(): string {
  return `<section data-scene="harmony" class="layer">
    <div data-r="promise" class="absolute inset-x-6 top-[214px] text-center">
      <p class="mono-label on-film inline-flex items-center gap-3 text-amber"><span class="h-px w-[26px] bg-current opacity-70"></span>Offline wild foraging companion<span class="h-px w-[26px] bg-current opacity-70"></span></p>
      <p class="title mt-5 text-[62px]">The offline trail<br />companion that<br />never says<br /><span class="text-amber">“eat this”</span></p>
      <p class="mono-label on-film mt-6 text-ink-muted">One thicket · home and app share the path</p>
    </div>
    <div data-r="harmonyHeader" class="absolute inset-x-0 top-0">${landingHeader("launchAgain")}</div>
  </section>`;
}

const DESKTOP = { width: 1600, height: 1000, scale: 0.25 };
const PHONE = { width: 390, height: 844, scale: 0.4 };

function dualScene(photo: string): string {
  const desktop = `<div class="forest-floor relative overflow-hidden text-ink" style="width:${DESKTOP.width}px;height:${DESKTOP.height}px;transform:scale(${DESKTOP.scale});transform-origin:0 0">
    ${appHeader({ wide: true })}
    <div class="mx-auto grid max-w-5xl grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-8 px-6 pt-8">
      ${specimenPlate(photo, true)}
      <div class="grid gap-6">${verdictBadge()}${lookalikes()}</div>
    </div>
  </div>`;
  const phone = `<div class="forest-floor relative overflow-hidden text-ink" style="width:${PHONE.width}px;height:${PHONE.height}px;transform:scale(${PHONE.scale});transform-origin:0 0">
    ${appHeader()}
    ${finder(`<img src="${photo}" alt="" class="absolute inset-0 size-full object-cover" />`, false)}
    <div class="mt-5">${captureRack(false)}</div>
    <div class="absolute inset-x-0 bottom-0">${dock("scan")}</div>
  </div>`;
  const phoneW = PHONE.width * PHONE.scale;
  const phoneH = PHONE.height * PHONE.scale;
  return `<section data-scene="dual" class="layer">
    <div data-r="dualHead" class="on-film absolute inset-x-5 top-[58px]">
      <p class="mono-label flex items-center gap-2.5 text-amber"><span class="h-px w-[26px] bg-current opacity-70"></span>Frosted architecture</p>
      <p class="title mt-3 text-[54px]">One trail,<br />every screen</p>
    </div>
    <div data-r="desktop" class="absolute top-[206px] left-4 origin-[30%_50%]">
      <div class="overflow-hidden rounded-[12px] border border-line-strong bg-bg shadow-float" style="width:${DESKTOP.width * DESKTOP.scale}px">
        <div class="flex h-[18px] items-center gap-1.5 border-b border-line bg-surface-2 px-2.5"><span class="size-1.5 rounded-full bg-bark"></span><span class="size-1.5 rounded-full bg-bark"></span><span class="size-1.5 rounded-full bg-bark"></span><span class="ml-2 font-mono text-[7px] leading-none tracking-[0.08em] text-ink-faint">trailsnack.onrender.com/assess</span></div>
        <div style="height:${DESKTOP.height * DESKTOP.scale}px">${inert(desktop)}</div>
      </div>
    </div>
    <div data-r="phone" class="absolute top-[352px] right-5 origin-[70%_50%]">
      <div class="overflow-hidden rounded-[22px] border-2 border-line-strong bg-bg shadow-float" style="width:${phoneW + 4}px;height:${phoneH + 4}px">${inert(phone)}</div>
      <div data-r="glove" class="absolute rounded-[10px] border border-amber-bright shadow-glow-amber" style="left:${phoneW / 2 - 17}px;top:${(44 + 64 + 390 + 20 - 3) * PHONE.scale}px;width:38px;height:38px"></div>
    </div>
    <div data-r="ruler" class="on-film absolute left-4" style="top:${206 + 18 + DESKTOP.height * DESKTOP.scale + 16}px">
      <div class="flex items-center gap-2 text-amber"><span class="h-2.5 w-px bg-current"></span><span data-r="rulerBar" class="h-px bg-current" style="width:0"></span><span class="h-2.5 w-px bg-current"></span></div>
      <p class="mono-label mt-2 text-ink">Viewport <span data-r="rulerPx" class="text-amber">1600</span> px</p>
      <p class="mono-label mt-1.5 text-ink-muted">1600 px desktop → 390 px phone</p>
    </div>
    <p data-r="gloveLabel" class="mono-label on-film absolute left-4 text-amber" style="top:${352 + (44 + 64 + 390 + 30) * PHONE.scale}px">48 px glove targets<span class="ml-2.5 inline-block h-px w-24 bg-current align-middle opacity-70"></span></p>
  </section>`;
}

const PROOFS: { lines: [string, string]; sub: string; glyph: string }[] = [
  { lines: ["100% offline", "Airplane mode"], sub: "After a one-time setup over Wi-Fi", glyph: icon("plane", 26, 1.9, "rotate-45") },
  { lines: ["On-device", "Gemma AI"], sub: "EmbeddingGemma 2 · Gemma 4 E2B · WebGPU / WASM", glyph: icon("cpu", 26, 1.9) },
  { lines: ["Worst-case", "always wins"], sub: "Deterministic safety engine · AI can only lower a verdict", glyph: icon("shieldAlert", 26, 1.9) },
];

function proofScene(): string {
  return `<section data-scene="proof" class="layer">
    ${PROOFS.map(
      (p) => `<div data-rs="proof" class="absolute inset-x-5 top-[150px] origin-[50%_45%] text-center">
        <span class="mx-auto flex size-14 items-center justify-center rounded-full border border-amber/60 bg-bg/55 text-amber">${p.glyph}</span>
        <p class="title mt-6 text-[104px]">${p.lines[0]}<br /><span class="text-amber">${p.lines[1]}</span></p>
        <p class="mono-label glass mx-auto mt-6 inline-block max-w-[372px] rounded-[14px] border border-line-strong px-3.5 py-2.5 leading-relaxed text-ink">${p.sub}</p>
      </div>`,
    ).join("")}
  </section>`;
}

/** The emblem at title size: strokes that draw on, and a highlight that crosses the berries. */
const LOCKUP_EMBLEM = `<svg width="132" height="132" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-ink" style="stroke-dasharray:1" aria-hidden="true">
  <defs>
    <clipPath id="beads"><circle cx="20.300" cy="19.200" r="3.300"/><circle cx="15.600" cy="25.200" r="3"/><circle cx="24" cy="25.400" r="2.700"/></clipPath>
    <linearGradient id="specular" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6dc" stop-opacity="0"/><stop offset="0.5" stop-color="#fff6dc" stop-opacity="0.95"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></linearGradient>
  </defs>
  <path data-rs="sprig" pathLength="1" d="M7 29c.6-8 4.6-14.600 13-19"/>
  <path data-rs="sprig" pathLength="1" d="M20 10c-.4-4.200 2.800-7.600 8.500-7.500.3 5.400-3 8.700-8.500 7.500Z"/>
  <path data-rs="sprig" pathLength="1" d="M20 10l5.200-4.600" stroke-width="1" opacity="0.7"/>
  <path data-rs="sprig" pathLength="1" d="M11.600 18.200c-4.300.6-7.600-2-8.300-6.700 4.700-.5 7.900 2.200 8.300 6.700Z"/>
  <path data-rs="sprig" pathLength="1" d="M11.600 18.200 6.400 13.900" stroke-width="1" opacity="0.7"/>
  <path data-rs="sprig" pathLength="1" d="M14.200 14.600c1.900.2 3.300 1 4.200 2.300M10.300 21.400c1.600.3 2.800 1 3.600 2M20.500 21.300l1.700 1.800" stroke-width="1.1"/>
  <g data-r="beads" stroke="none">
    <g fill="var(--color-amber)"><circle cx="20.300" cy="19.200" r="3.300"/><circle cx="15.600" cy="25.200" r="3"/><circle cx="24" cy="25.400" r="2.700"/></g>
    <g fill="var(--color-ink)" opacity="0.75"><circle cx="19.200" cy="18" r="0.800"/><circle cx="14.600" cy="24.100" r="0.700"/><circle cx="23.100" cy="24.400" r="0.650"/></g>
    <g clip-path="url(#beads)"><rect data-r="specular" x="-3" y="12" width="6" height="20" fill="url(#specular)"/></g>
  </g>
</svg>`;

function outroScene(): string {
  return `<section data-scene="outro" class="layer">
    <div data-r="glow" class="absolute top-[150px] left-1/2 -ml-[170px] size-[340px] rounded-full bg-amber/25 blur-3xl"></div>
    <div data-r="lockup" class="absolute inset-x-0 top-[196px] text-center">
      ${LOCKUP_EMBLEM}
      <p data-r="wordmark" class="title mt-4 text-[92px] tracking-[0.04em]">TrailSnack</p>
    </div>
    <div class="absolute inset-x-6 top-[452px] text-center">
      <p data-rs="closing" class="title text-[56px]">Rooted in caution</p>
      <p data-rs="closing" class="title mt-1.5 text-[56px] text-amber">Built for the wild</p>
      <p data-r="url" class="on-film mt-7 font-mono text-[17px] leading-none font-medium tracking-[0.04em] text-ink">trailsnack.onrender.com</p>
      <p data-r="footnote" class="mono-label on-film mx-auto mt-5 max-w-[320px] leading-relaxed text-ink-muted">Educational reference · confirm every find with a local expert</p>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------------- */
/* Stage                                                                      */
/* ------------------------------------------------------------------------- */

export interface Stage {
  /** Set every animated property for time t (seconds). */
  update(t: number): void;
  /** The canvases the thicket films render into. */
  canvas: { main: HTMLCanvasElement; finder: HTMLCanvasElement };
}

/** The token stream: the Deep Look JSON, cut into deterministic chunks. */
const STREAM = JSON.stringify(DEEP_LOOK, null, 1);
const STREAM_CUTS: number[] = (() => {
  const cuts = [0];
  let at = 0;
  for (let i = 0; at < STREAM.length; i++) {
    at = Math.min(STREAM.length, at + 2 + Math.floor(hash(i, 7) * 5));
    cuts.push(at);
  }
  return cuts;
})();
const STREAM_LINE = 13 * 1.625;
const STREAM_VIEW = 292 - 32;

/** Elements the timeline never touches: copies of app screens shown inside device frames. */
const inert = (markup: string): string => markup.replace(/ data-rs?="[^"]*"/g, "");

export function buildStage(host: HTMLElement, stills: Stills, canvas: Stage["canvas"]): Stage {
  const featured: LogEntry = {
    no: 7,
    badge: "CAUTION",
    name: "Wild strawberry",
    scientific: "Fragaria vesca",
    when: "Just now",
    gps: "32.2450° N 77.1758° E · 2480 M",
    photo: stills.specimen,
  };
  const earlier: LogEntry[] = [
    { no: 6, badge: "UNKNOWN", name: "Unidentified", scientific: null, when: "2 H ago", gps: "32.2437° N 77.1741° E · 2412 M", photo: stills.cloudberry },
    { no: 5, badge: "TOXIC", name: "Red baneberry", scientific: "Actaea rubra", when: "5 H ago", gps: "32.2391° N 77.1702° E · 2260 M", photo: stills.currant },
    { no: 4, badge: "CAUTION", name: "American elderberry", scientific: "Sambucus canadensis", when: "1 D ago", gps: "No fix", photo: stills.elderberry },
  ];

  host.innerHTML = `
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <filter id="whip-out" x="-30%" y="0" width="160%" height="100%"><feGaussianBlur data-r="whipOutBlur" stdDeviation="0 0" /></filter>
      <filter id="whip-in" x="-30%" y="0" width="160%" height="100%"><feGaussianBlur data-r="whipInBlur" stdDeviation="0 0" /></filter>
    </svg>
    <div data-slot="thicket"></div>
    <div data-r="veil" class="layer bg-bg"></div>
    <div data-r="scrim" class="layer bg-[radial-gradient(70%_46%_at_50%_42%,rgb(6_11_8/0.7),transparent_74%)]"></div>
    ${hookScene()}${glideScene()}${homeScene()}${scanScene()}${assessScene(stills.specimen, featured)}${logScene([featured, ...earlier])}
    ${harmonyScene()}${dualScene(stills.specimen)}${proofScene()}${outroScene()}
    <div data-scene="chrome" class="layer">
      <div data-r="chromeHeader" class="absolute inset-x-0 top-0">
        <div data-r="headerRack">${appHeader()}</div>
        <div data-r="headerLink" class="absolute inset-x-0 top-0">${appHeader({ link: true })}</div>
      </div>
      <div data-r="chromeDock" class="absolute inset-x-0 bottom-0">
        <div class="absolute inset-x-0 bottom-0 h-[132px] bg-linear-to-t from-bg via-bg/85 to-transparent"></div>
        <div data-r="dockScan" class="relative">${dock("scan")}</div>
        <div data-r="dockAssess" class="absolute inset-x-0 bottom-0">${dock("assess")}</div>
        <div data-r="dockLog" class="absolute inset-x-0 bottom-0">${dock("log")}</div>
      </div>
    </div>
    <div data-scene="sheet" class="layer">
      <div data-r="sheetScrim" class="absolute inset-0 bg-black/60"></div>
      ${deepLookDrawer()}
    </div>
    <div data-r="status" class="layer">${STATUS_BAR}${HOME_INDICATOR}</div>
    <div data-r="wave" class="absolute top-0 left-0 -mt-10 -ml-10 size-20 rounded-full border-2 border-amber-bright shadow-[0_0_28px_4px_rgb(229_154_52/0.55),inset_0_0_22px_rgb(229_154_52/0.35)]"></div>
    <div data-r="thumb" class="absolute top-0 left-0 -mt-[19px] -ml-[19px] size-[38px] rounded-full border border-ink/80 bg-ink/20 shadow-[0_0_0_1px_rgb(6_11_8/0.35),0_2px_14px_rgb(0_0_0/0.45)]"></div>
    <div data-r="tap" class="absolute top-0 left-0 -mt-[19px] -ml-[19px] size-[38px] rounded-full border-2 border-amber-bright"></div>
    <div data-r="curtain" class="layer bg-bg"></div>`;

  canvas.main.className = "absolute inset-0 size-full";
  canvas.finder.className = "absolute inset-0 size-full";
  canvas.finder.dataset.r = "feed";
  host.querySelector('[data-slot="thicket"]')?.replaceWith(canvas.main);
  host.querySelector('[data-slot="finder"]')?.replaceWith(canvas.finder);

  const R = collect(host);
  const scenes = new Map<string, HTMLElement>();
  host.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => scenes.set(el.dataset.scene ?? "", el));
  const show = (name: string, visible: boolean): void => {
    const el = scenes.get(name);
    if (el) el.style.display = visible ? "block" : "none";
  };

  /* ---------------------------- measured layout ---------------------------- */

  // Title cards are set as wide as the stage allows.
  for (const el of [...R.all("word"), ...R.all("proof").map((p) => p.querySelector<HTMLElement>(".title")), ...R.all("closing"), R.one("wordmark")]) {
    if (!(el instanceof HTMLElement)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    const probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;white-space:nowrap";
    probe.innerHTML = el.innerHTML;
    el.replaceChildren(probe);
    const fitted = Math.min(size, (size * (W - 44)) / probe.offsetWidth);
    el.innerHTML = probe.innerHTML;
    el.style.fontSize = `${fitted.toFixed(2)}px`;
  }

  const column = R.one("column");
  const top = (name: string): number => topIn(R.one(name), column);
  const heightOf = (el: Styled): number => (el instanceof HTMLElement ? el.offsetHeight : 0);
  const ledgerHeight = heightOf(R.one("ledgerInner"));
  const scroll = {
    verdict: Math.max(0, top("verdict") + heightOf(R.one("verdict")) - (DOCK_TOP - 12)),
    lookalikes: top("lookalikes") - PAGE_TOP,
    hazardEnd: top("hazard") + heightOf(R.one("hazard")) - (DOCK_TOP - 14),
    ledger: top("ledger") - PAGE_TOP,
    checklist: top("checklist") - PAGE_TOP,
    deep: top("deepTrigger") + heightOf(R.one("deepTrigger")) - (DOCK_TOP - 14),
    emergency: top("emergency") - PAGE_TOP,
    save: top("save") - PAGE_TOP,
    entry: top("savedEntry") - topIn(R.all("entry")[1] ?? R.one("savedEntry"), R.one("logPage")),
  };
  const scrollAt = (t: number): number =>
    track(t, [
      [T.stamp + 0.35, 0],
      [T.stamp + 0.9, scroll.verdict],
      [T.lookalikes, scroll.verdict],
      [T.lookalikes + 0.55, scroll.lookalikes],
      [T.lookalikes + 1.0, scroll.lookalikes],
      [T.lookalikes + 1.5, Math.max(scroll.lookalikes, scroll.hazardEnd)],
      [T.ledger, Math.max(scroll.lookalikes, scroll.hazardEnd)],
      [T.ledger + 0.5, scroll.ledger],
      [T.checklist, scroll.ledger],
      [T.checklist + 0.4, scroll.checklist],
      [T.drawer - 0.45, scroll.checklist],
      [T.drawer - 0.12, scroll.deep],
      [T.emergency, scroll.deep],
      [T.emergency + 0.55, scroll.emergency],
      [T.save, scroll.emergency],
      [T.save + 0.4, scroll.save],
      [T.save + 1.15, scroll.save],
      [T.save + 1.65, scroll.entry],
    ]);

  // Aim the thumb at what was actually laid out.
  const aim = (index: number, x: number, y: number): void => {
    const tap = TAPS[index];
    if (tap) Object.assign(tap, { x, y });
  };
  const centre = (el: Styled, at: number): number => topIn(el, column) + heightOf(el) / 2 - at;
  aim(0, W - 16 - 78, SAFE_TOP + 32);
  aim(1, W / 2, SAFE_TOP + 64 + W + 16 + 36);
  R.all("check").forEach((row, i) => aim(2 + i, 50, centre(row, scroll.checklist)));
  aim(5, W / 2, centre(R.one("deepButton"), scroll.deep));
  aim(6, W / 2 - 40, centre(R.one("indiaCall"), scroll.emergency));
  aim(7, W / 2, centre(R.one("saveButton"), scroll.save));
  aim(8, W - 16 - 92, SAFE_TOP + 32);
  const [tapLaunch, tapShutter, tapCheck1, tapCheck2, tapCheck3, tapDeep, tapCall, tapSave, tapHome] = TAPS.map((tap) => tap.t);
  const tickTimes = [tapCheck1 ?? 0, tapCheck2 ?? 0, tapCheck3 ?? 0];

  const words = R.all("word");
  const embers = R.all("ember");
  const proofs = R.all("proof");
  const entries = R.all("entry");
  const logEntries = entries.slice(1);

  /* --------------------------------- frames -------------------------------- */

  function update(t: number): void {
    /* Backdrop ------------------------------------------------------------ */
    // Reading veil: the app's 20% wash behind every screen, deeper in the dark of bar 1.
    const appUi = hold(t, T.home, T.dual, 0.4, 0.5);
    const opening = 1 - inOutSine(span(t, 1.5, 2.6));
    fade(R.one("veil"), Math.max(0.2 * appUi, 0.9 * opening, 0.34 * hold(t, T.dual, T.proof[0], 0.3, 0.05)));
    // Title scrim: a soft pool behind type set straight on the thicket.
    fade(
      R.one("scrim"),
      Math.max(hold(t, T.words[0], T.glide + 0.2, 0.05, 0.3), hold(t, T.harmony + 0.7, T.dual, 0.4, 0.2), span(t, T.proof[0], T.proof[0] + 0.05)) * 0.9,
    );

    /* Bars 1–2: the zero-signal hook ----------------------------------------- */
    const hook = t < T.glide + 0.2;
    show("hook", hook);
    if (hook) {
      const rise = outCubic(span(t, 0.25, 2.0));
      fade(R.one("ridge"), span(t, 0.2, 1.5) * (1 - span(t, 1.9, 2.5)));
      place(R.one("ridge"), 0, lerp(34, 0, rise));
      place(R.one("ridgeFar"), 0, lerp(16, 0, rise));
      place(R.one("ridgeMid"), 0, lerp(30, 0, rise));
      place(R.one("ridgeNear"), 0, lerp(52, 0, rise));
      const mist = span(t, 0.2, 1.4) * (1 - span(t, 1.9, 2.7));
      fade(R.one("mistA"), mist);
      fade(R.one("mistB"), mist);
      place(R.one("mistA"), 40 * t, 0);
      place(R.one("mistB"), -26 * t, 0);

      // The offline pill lights on beat 2 of bar 1.
      const lit = span(t, BEAT, BEAT + 0.22);
      fade(R.one("offline"), lit * (1 - span(t, T.glide - 0.25, T.glide)));
      place(R.one("offline"), lerp(10, 0, outCubic(lit)), 0);
      const pulse = Math.exp(-Math.max(0, t - BEAT) * 3.2);
      R.one("offline").style.filter = `drop-shadow(0 0 ${(4 + 14 * pulse).toFixed(2)}px rgb(47 230 139 / ${(0.35 + 0.5 * pulse).toFixed(3)}))`;
      fade(R.one("offlineDot"), 0.55 + 0.45 * Math.cos(t * Math.PI * 2));
      fade(R.one("fix"), span(t, 2 * BEAT, 2 * BEAT + 0.3) * (1 - span(t, T.words[0] - 0.3, T.words[0])));

      // Three words, one per beat. Each cuts in hard and yields to the next.
      words.forEach((word, i) => {
        const start = T.words[i] ?? 0;
        const end = T.words[i + 1] ?? T.glide + 0.12;
        const last = i === words.length - 1;
        const visible = t >= start && t < end;
        const slam = outExpo(span(t, start, start + 0.16));
        fade(word, visible ? Math.min(span(t, start, start + 0.045), last ? 1 - span(t, T.glide - 0.12, end) : 1) : 0);
        place(word, 0, 0, lerp(1.24, 1, slam) + 0.022 * span(t, start, end));
      });
    }

    /* Bar 3: the living thicket ---------------------------------------------- */
    const glide = t >= SWEEP.from - 0.3 && t < T.home + 0.4;
    show("glide", glide);
    if (glide) {
      const caption = hold(t, T.glide + 0.25, T.home + 0.05, 0.35, 0.3);
      fade(R.one("glideCaption"), caption);
      place(R.one("glideCaption"), 0, lerp(14, 0, outCubic(span(t, T.glide + 0.25, T.glide + 0.7))));
      // Embers are shed along the thumb's path and drift up as they cool.
      embers.forEach((ember, i) => {
        const born = lerp(SWEEP.from + 0.05, SWEEP.to, i / (embers.length - 1));
        const age = t - born;
        if (age < 0 || age > 1.7) {
          fade(ember, 0);
          return;
        }
        const origin = sweepAt(born);
        const drift = (hash(i, 2) - 0.5) * 46;
        fade(ember, Math.min(1, age * 14) * Math.exp(-age * 2.1));
        place(
          ember,
          origin.x + (hash(i, 3) - 0.5) * 30 + drift * age + Math.sin(age * 5 + i) * 5,
          origin.y + (hash(i, 4) - 0.5) * 30 - (26 + 44 * hash(i, 5)) * age,
          1 + 0.5 * hash(i, 6) - 0.3 * age,
        );
      });
    }

    /* Bar 4: the home page and the Safety Covenant --------------------------- */
    const whipOut = whipOutAt(t);
    const whipIn = whipInAt(t);
    // A whip pan smears along its direction of travel: horizontal blur in proportion to speed.
    const smear = (at: (time: number) => number): number => Math.min(30, (Math.abs(at(t + 0.004) - at(t - 0.004)) / 0.008) * W * 1.1 * 0.0045);
    const smearOut = smear(whipOutAt);
    const smearIn = smear(whipInAt);
    R.one("whipOutBlur").setAttribute("stdDeviation", `${smearOut.toFixed(2)} 0`);
    R.one("whipInBlur").setAttribute("stdDeviation", `${smearIn.toFixed(2)} 0`);
    R.one("homeBody").style.filter = smearOut > 0.25 ? "url(#whip-out)" : "none";
    for (const name of ["scanBody", "chromeHeader", "chromeDock"]) R.one(name).style.filter = smearIn > 0.25 ? "url(#whip-in)" : "none";
    const home = t >= T.home - 0.05 && t < T.whip + 0.04;
    show("home", home);
    if (home) {
      place(R.one("homeBody"), -W * 1.1 * whipOut, 0);
      const drop = outCubic(span(t, T.home, T.home + 0.42));
      place(R.one("homeHeader"), 0, lerp(-(SAFE_TOP + 70), 0, drop));
      const card = outCubic(span(t, T.home + 0.22, T.home + 0.78));
      fade(R.one("covenant"), span(t, T.home + 0.22, T.home + 0.5));
      place(R.one("covenant"), 0, lerp(34, 0, card));
      // The answer itself warms on the third beat.
      const answer = Math.exp(-Math.abs(t - (T.home + 2 * BEAT)) * 5);
      R.one("covenantAnswer").style.textShadow = `0 0 ${(22 * answer).toFixed(2)}px rgb(229 154 52 / ${(0.75 * answer).toFixed(3)})`;
      const press = thumbAt(t).press * (Math.abs(t - (tapLaunch ?? 0)) < 0.2 ? 1 : 0);
      place(R.one("launch"), 0, 0, 1 - 0.04 * press);
    }

    /* Persistent phone chrome ------------------------------------------------ */
    fade(R.one("status"), Math.min(span(t, T.home, T.home + 0.4), 1 - span(t, T.dual - 0.25, T.dual)));
    const chrome = t >= T.whip - 0.04 && t < T.harmony + 1.0;
    show("chrome", chrome);
    if (chrome) {
      const leave = inOutCubic(span(t, (tapHome ?? 0) + 0.1, (tapHome ?? 0) + 0.55));
      place(R.one("chromeHeader"), W * 1.1 * whipIn, -(SAFE_TOP + 70) * leave);
      place(R.one("chromeDock"), W * 1.1 * whipIn, 120 * leave);
      fade(R.one("headerRack"), t < T.log ? 1 : 0);
      fade(R.one("headerLink"), t >= T.log ? 1 : 0);
      fade(R.one("dockScan"), t < T.drop ? 1 : 0);
      fade(R.one("dockAssess"), t >= T.drop && t < T.log ? 1 : 0);
      fade(R.one("dockLog"), t >= T.log ? 1 : 0);
      if (t >= T.log) place(R.one("homeLink"), 0, 0, 1 - 0.05 * (Math.abs(t - (tapHome ?? 0)) < 0.2 ? thumbAt(t).press : 0));
    }

    /* Bar 5: the trail camera ------------------------------------------------ */
    const scan = t >= T.whip - 0.04 && t < T.drop;
    show("scan", scan);
    if (scan) {
      place(R.one("scanBody"), W * 1.1 * whipIn, 0);
      const roll = rollAt(t);
      const level = Math.abs(roll) < 3;
      const lock = lockAt(t);
      place(R.one("feed"), 0, 0, 1.14, roll * 0.55);
      place(R.one("level"), 0, 0, 1, -roll);
      on(R.one("level"), level);
      on(R.one("roll"), level);
      text(R.one("roll"), `${level ? "Level" : "Tilt"} +${Math.abs(roll).toFixed(1)}°`);
      // The reticle tightens as the frame settles; the brackets close in with it.
      const settled = outExpo(span(t, 9.3, 9.5));
      place(R.one("reticle"), lerp(-34, 0, lock), lerp(26, 0, lock), lerp(1.34, 1, lock) - 0.1 * settled);
      R.all("bracket").forEach((bracket, i) => {
        const dx = i % 2 === 0 ? -1 : 1;
        const dy = i < 2 ? -1 : 1;
        place(bracket, dx * 10 * (1 - lock), dy * 10 * (1 - lock));
      });
      // The thumb comes down on the shutter; the capture itself is the drop.
      const press = inOutCubic(span(t, (tapShutter ?? 0) - 0.06, T.drop - 0.02));
      place(R.one("shutter"), 0, 0, 1 - 0.14 * press);
      const ring = span(t, (tapShutter ?? 0) - 0.02, T.drop);
      fade(R.one("shutterRing"), 0.7 * ring);
      place(R.one("shutterRing"), 0, 0, lerp(0.92, 1.12, ring));
    }

    // The amber ripple leaves the shutter on the drop and crosses the new screen.
    const wave = span(t, T.drop, T.drop + 0.62);
    fade(R.one("wave"), t >= T.drop && wave < 1 ? (1 - wave) ** 1.6 : 0);
    place(R.one("wave"), W / 2, SAFE_TOP + 64 + W + 16 + 36, lerp(0.8, 17, outCubic(wave)));

    /* Bars 6–13: the assessment ---------------------------------------------- */
    const assess = t >= T.drop && t < T.log;
    show("assess", assess);
    if (assess) {
      const push = 0.03 * inOutSine(span(t, T.lookalikes, T.ledger)) * (1 - inOutCubic(span(t, T.ledger, T.ledger + 0.5)));
      place(R.one("page"), 0, -scrollAt(t), 1 + push);

      // Bar 6: the specimen plate, its etched ticks, then the verdict coming down.
      const plate = outCubic(span(t, T.drop, T.drop + 0.3));
      fade(R.one("specimen"), 0.35 + 0.65 * span(t, T.drop, T.drop + 0.12));
      place(R.one("specimen"), 0, lerp(10, 0, plate), lerp(1.025, 1, plate));
      R.all("tick").forEach((tick, i) => {
        const k = outCubic(span(t, T.drop + 0.1 + i * 0.05, T.drop + 0.34 + i * 0.05));
        fade(tick, k);
        place(tick, 0, 0, lerp(2.4, 1, k));
      });
      R.all("datum").forEach((row, i) => {
        const k = span(t, T.drop + 0.16 + i * 0.07, T.drop + 0.34 + i * 0.07);
        fade(row, k);
        place(row, lerp(8, 0, outCubic(k)), 0);
      });
      const frame = outCubic(span(t, T.drop + 0.12, T.drop + 0.42));
      fade(R.one("verdict"), span(t, T.drop + 0.12, T.drop + 0.3));
      const hit = Math.exp(-Math.max(0, t - T.stamp) * 16) * (t >= T.stamp ? 1 : 0);
      place(R.one("verdict"), 0, lerp(16, 0, frame) + 3 * hit, 1 - 0.012 * hit);
      const stamp = outExpo(span(t, T.stamp - 0.07, T.stamp + 0.05));
      fade(R.one("stamp"), span(t, T.stamp - 0.07, T.stamp - 0.01));
      place(R.one("stamp"), 0, 0, lerp(1.7, 1, stamp));
      ["qualifier", "banner", "headline"].forEach((name, i) => {
        const k = span(t, T.stamp + 0.14 + i * 0.12, T.stamp + 0.34 + i * 0.12);
        fade(R.one(name), k);
        place(R.one(name), 0, lerp(6, 0, outCubic(k)));
      });

      // Bar 7: the crimson card slides out; the two plants are drawn side by side.
      const card = outQuart(span(t, T.lookalikes + 0.3, T.lookalikes + 0.8));
      fade(R.one("hazard"), span(t, T.lookalikes + 0.3, T.lookalikes + 0.5));
      place(R.one("hazard"), lerp(70, 0, card), 0);
      R.all("ink").forEach((path, i, all) => {
        const k = inOutCubic(span(t, T.lookalikes + 0.6 + (i / all.length) * 0.6, T.lookalikes + 1.0 + (i / all.length) * 0.6));
        path.style.strokeDashoffset = (1 - k).toFixed(4);
      });
      R.all("diff").forEach((row, i) => {
        const k = span(t, T.lookalikes + 1.05 + i * 0.16, T.lookalikes + 1.3 + i * 0.16);
        fade(row, k);
        place(row, lerp(10, 0, outCubic(k)), 0);
      });

      // Bar 8: the rule ledger opens.
      const open = inOutCubic(span(t, T.ledger + 0.3, T.ledger + 0.85));
      R.one("ledgerBody").style.height = `${(ledgerHeight * (t >= T.ledger + 0.85 ? 1 : open)).toFixed(2)}px`;
      place(R.one("chevron"), 0, 0, 1, 180 * open);
      const title = outExpo(span(t, T.ledger + BEAT, T.ledger + BEAT + 0.2));
      fade(R.one("ledgerTitle"), span(t, T.ledger + BEAT - 0.02, T.ledger + BEAT + 0.05));
      place(R.one("ledgerTitle"), 0, 0, lerp(1.16, 1, title));
      R.all("reason").forEach((row, i) => {
        const k = span(t, T.ledger + 0.9 + i * 0.24, T.ledger + 1.15 + i * 0.24);
        fade(row, k);
        place(row, 0, lerp(8, 0, outCubic(k)));
      });

      // Bar 9: three ticks, one per beat.
      let ticked = 0;
      R.all("check").forEach((row, i) => {
        const at = tickTimes[i] ?? 0;
        const done = t >= at;
        if (done) ticked++;
        on(row, done);
        const mark = R.all("checkMark")[i];
        if (mark) place(mark, 0, 0, lerp(0.3, 1, outExpo(span(t, at, at + 0.16))));
        row.style.boxShadow = `inset 0 0 0 1px rgb(229 154 52 / ${(done ? 0.6 * Math.exp(-(t - at) * 7) : 0).toFixed(3)})`;
      });
      text(R.one("checkCount"), String(ticked));
      fade(R.one("checkPill"), ticked < 3 ? 1 : 0);
      fade(R.one("checkPillDone"), ticked < 3 ? 0 : 1);
      place(R.one("deepButton"), 0, 0, 1 - 0.035 * (Math.abs(t - (tapDeep ?? 0)) < 0.2 ? thumbAt(t).press : 0));

      // Bar 12: the regional lifelines.
      R.all("region").forEach((block, i) => {
        const k = span(t, T.emergency + 0.3 + i * 0.14, T.emergency + 0.6 + i * 0.14);
        fade(block, 0.25 + 0.75 * k);
        place(block, 0, lerp(8, 0, outCubic(k)));
      });
      const dial = t >= (tapCall ?? 0) ? Math.exp(-(t - (tapCall ?? 0)) * 3.5) : 0;
      const call = R.one("indiaCall");
      place(call, 0, 0, 1 - 0.03 * (Math.abs(t - (tapCall ?? 0)) < 0.2 ? thumbAt(t).press : 0));
      call.style.boxShadow = `0 0 0 ${(1 + 3 * dial).toFixed(2)}px rgb(255 123 116 / ${(0.3 + 0.6 * dial).toFixed(3)}), 0 0 ${(10 + 30 * dial).toFixed(2)}px rgb(217 56 58 / ${(0.35 + 0.5 * dial).toFixed(3)})`;

      // Bar 13: save — the fingerprint resolves, and the entry is written.
      const saveAt = tapSave ?? 0;
      const saved = t >= saveAt;
      place(R.one("saveButton"), 0, 0, 1 - 0.03 * (Math.abs(t - saveAt) < 0.2 ? thumbAt(t).press : 0));
      fade(R.one("saveButton"), t < saveAt + 0.62 ? 1 : 0);
      fade(R.one("savedButton"), span(t, saveAt + 0.62, saveAt + 0.74));
      fade(R.one("savedPill"), span(t, saveAt + 0.62, saveAt + 0.8));
      let digest = "";
      for (let i = 0; i < SPECIMEN_HASH.length; i++) {
        const settle = saveAt + 0.06 + i * 0.008;
        digest += !saved ? "·" : t >= settle ? SPECIMEN_HASH.charAt(i) : Math.floor(hash(i, Math.floor(t * 45)) * 16).toString(16);
      }
      text(R.one("hash"), digest);
      R.one("hash").style.color = saved ? "" : "var(--color-ink-faint)";
      const bound = saved ? Math.exp(-(t - saveAt) * 2.4) : 0;
      for (const name of ["geotag", "hashRow"]) {
        R.one(name).style.boxShadow = `var(--shadow-inset), 0 0 0 1px rgb(47 230 139 / ${(0.75 * bound).toFixed(3)}), 0 0 ${(18 * bound).toFixed(2)}px rgb(47 230 139 / ${(0.4 * bound).toFixed(3)})`;
      }
      const written = outCubic(span(t, saveAt + 0.66, saveAt + 1.1));
      fade(R.one("savedEntry"), span(t, saveAt + 0.66, saveAt + 0.9));
      place(R.one("savedEntry"), 0, lerp(14, 0, written));
    }

    /* Bars 10–11: Tier 2 Deep Look, in a drawer ------------------------------ */
    const sheet = t >= T.drawer - 0.02 && t < T.emergency + 0.5;
    show("sheet", sheet);
    if (sheet) {
      const up = outQuart(span(t, T.drawer, T.drawer + 0.5)) * (1 - inCubic(span(t, T.emergency - 0.05, T.emergency + 0.36)));
      fade(R.one("sheetScrim"), up);
      place(R.one("drawer"), 0, lerp(640, 0, up));

      const streamStart = T.drawer + 0.5;
      const streamEnd = T.latency - 0.12;
      const k = span(t, streamStart, streamEnd);
      const shown = STREAM.slice(0, STREAM_CUTS[Math.floor(k * (STREAM_CUTS.length - 1))] ?? 0);
      text(R.one("streamText"), shown);
      const lines = shown.split("\n").length;
      place(R.one("streamRoll"), 0, -Math.max(0, lines * STREAM_LINE - STREAM_VIEW));
      fade(R.one("caret"), 0.675 + 0.325 * Math.cos((t * Math.PI * 2) / 0.9));

      const done = span(t, T.latency - 0.06, T.latency + 0.12);
      fade(R.one("streamBox"), 1 - done);
      fade(R.one("resultBox"), done);
      fade(R.one("tagLive"), t < T.latency - 0.06 ? 1 : 0);
      fade(R.one("tagDot"), 0.675 + 0.325 * Math.cos((t * Math.PI * 2) / 0.9));
      fade(R.one("tagValid"), t < T.latency - 0.06 ? 0 : 1);
      R.all("feature").forEach((chip, i) => {
        const c = span(t, T.latency + 0.05 + i * 0.06, T.latency + 0.22 + i * 0.06);
        fade(chip, c);
        place(chip, 0, lerp(5, 0, outCubic(c)));
      });

      // The latency badge lands on the downbeat and pulses with each beat after it.
      const badge = R.one("latency");
      const beat = t >= T.latency ? Math.exp(-(((t - T.latency) % BEAT) / BEAT) * 3.2) : 0;
      fade(badge, span(t, T.latency - 0.04, T.latency + 0.08));
      place(badge, 0, lerp(8, 0, outCubic(span(t, T.latency - 0.04, T.latency + 0.2))), 1 + 0.035 * beat);
      badge.style.boxShadow = `0 0 0 1px rgb(185 156 240 / ${(0.2 + 0.5 * beat).toFixed(3)}), 0 0 ${(8 + 24 * beat).toFixed(2)}px rgb(122 77 184 / ${(0.3 + 0.55 * beat).toFixed(3)})`;
    }

    /* Bar 14: the field log -------------------------------------------------- */
    const log = t >= T.log && t < T.harmony + 1.0;
    show("log", log);
    if (log) {
      const leave = inOutCubic(span(t, (tapHome ?? 0) + 0.08, (tapHome ?? 0) + 0.6));
      const page = R.one("logPage");
      fade(page, 1 - leave);
      place(page, 0, -18 * leave, 1 - 0.05 * leave);
      const head = span(t, T.log + 0.02, T.log + 0.3);
      fade(R.one("logHead"), head);
      place(R.one("logHead"), 0, lerp(-8, 0, outCubic(head)));
      // The first entry is the match-cut: it is already where the saved one was.
      logEntries.forEach((entry, i) => {
        if (i === 0) {
          fade(entry, 1);
          place(entry, 0, 0);
          return;
        }
        const k = span(t, T.log + 0.1 + i * 0.11, T.log + 0.5 + i * 0.11);
        fade(entry, k);
        place(entry, 0, lerp(16, 0, outCubic(k)));
      });
    }

    /* Bar 15: back out to the thicket and the home page ---------------------- */
    const harmony = t >= T.harmony + 0.5 && t < T.dual + 0.1;
    show("harmony", harmony);
    if (harmony) {
      const enter = outCubic(span(t, T.harmony + 0.75, T.harmony + 1.2));
      const exit = span(t, T.dual - 0.22, T.dual);
      place(R.one("harmonyHeader"), 0, lerp(-(SAFE_TOP + 70), 0, enter) - (SAFE_TOP + 70) * inCubic(exit));
      const promise = span(t, T.harmony + 0.95, T.harmony + 1.3);
      fade(R.one("promise"), promise * (1 - exit));
      place(R.one("promise"), 0, lerp(16, 0, outCubic(promise)), 1 + 0.02 * span(t, T.harmony + 0.95, T.dual));
    }

    /* Bar 16: one layout, two viewports -------------------------------------- */
    const dual = t >= T.dual - 0.02 && t < T.proof[0];
    show("dual", dual);
    if (dual) {
      const float = t - T.dual;
      fade(R.one("dualHead"), span(t, T.dual, T.dual + 0.25));
      place(R.one("dualHead"), 0, lerp(-10, 0, outCubic(span(t, T.dual, T.dual + 0.4))));
      const desk = outCubic(span(t, T.dual + 0.05, T.dual + 0.6));
      fade(R.one("desktop"), span(t, T.dual + 0.05, T.dual + 0.3));
      place(R.one("desktop"), lerp(-40, 0, desk), 3 * Math.sin(float * 1.4), lerp(0.94, 1, desk));
      const phone = outCubic(span(t, T.dual + 0.3, T.dual + 0.85));
      fade(R.one("phone"), span(t, T.dual + 0.3, T.dual + 0.55));
      place(R.one("phone"), lerp(50, 0, phone), -4 * Math.sin(float * 1.4 + 0.8), lerp(0.94, 1, phone));
      // The ruler narrows from the desktop's 1600 px to the phone's 390.
      const shrink = inOutCubic(span(t, T.dual + 0.7, T.dual + 1.5));
      const px = Math.round(lerp(1600, 390, shrink));
      fade(R.one("ruler"), span(t, T.dual + 0.45, T.dual + 0.7));
      R.one("rulerBar").style.width = `${(px * DESKTOP.scale - 18).toFixed(2)}px`;
      text(R.one("rulerPx"), String(px));
      const glove = span(t, T.dual + 1.2, T.dual + 1.45);
      fade(R.one("glove"), glove);
      place(R.one("glove"), 0, 0, lerp(1.5, 1, outCubic(glove)));
      fade(R.one("gloveLabel"), glove);
    }

    /* Bars 17–19: three push-cuts -------------------------------------------- */
    const proof = t >= T.proof[0] && t < T.lockup + 0.2;
    show("proof", proof);
    if (proof) {
      proofs.forEach((card, i) => {
        const start = T.proof[i] ?? 0;
        const end = T.proof[i + 1] ?? T.lockup + 0.12;
        const last = i === proofs.length - 1;
        const visible = t >= start && t < end;
        const cut = outExpo(span(t, start, start + 0.18));
        fade(card, visible ? Math.min(span(t, start, start + 0.04), last ? 1 - span(t, T.lockup - 0.1, end) : 1) : 0);
        place(card, 0, 0, lerp(1.2, 1, cut) + 0.03 * span(t, start, end));
      });
    }

    /* Bars 19–20: lockup and sign-off ---------------------------------------- */
    const outro = t >= T.lockup - 0.1;
    show("outro", outro);
    if (outro) {
      const arrive = outCubic(span(t, T.lockup, T.lockup + 0.45));
      const lift = inOutCubic(span(t, T.final - 0.25, T.final + 0.2));
      fade(R.one("lockup"), span(t, T.lockup - 0.05, T.lockup + 0.2));
      place(R.one("lockup"), 0, lerp(12, 0, arrive) - 108 * lift, 1 - 0.14 * lift);
      R.all("sprig").forEach((path, i) => {
        path.style.strokeDashoffset = (1 - inOutCubic(span(t, T.lockup + i * 0.04, T.lockup + 0.4 + i * 0.04))).toFixed(4);
      });
      fade(R.one("beads"), span(t, T.lockup + 0.3, T.lockup + 0.5));
      fade(R.one("wordmark"), span(t, T.lockup + 0.12, T.lockup + 0.4));
      // The highlight crosses the three berries once, left to right.
      const sweep = inOutSine(span(t, T.lockup + 0.5, T.final - 0.05));
      R.one("specular").setAttribute("x", lerp(8, 27, sweep).toFixed(3));
      fade(R.one("glow"), 0.35 * span(t, T.lockup, T.lockup + 0.4) + 0.65 * Math.sin(Math.PI * sweep));
      place(R.one("glow"), 0, -108 * lift, 1);

      R.all("closing").forEach((line, i) => {
        const start = T.final + i * BEAT;
        const k = outExpo(span(t, start, start + 0.2));
        fade(line, span(t, start, start + 0.06));
        place(line, 0, 0, lerp(1.12, 1, k));
      });
      const url = span(t, T.final + 2 * BEAT, T.final + 2 * BEAT + 0.25);
      fade(R.one("url"), url);
      place(R.one("url"), 0, lerp(6, 0, outCubic(url)));
      fade(R.one("footnote"), span(t, T.final + 2 * BEAT + 0.15, T.final + 2 * BEAT + 0.45));
    }

    /* The thumb -------------------------------------------------------------- */
    const thumb = thumbAt(t);
    fade(R.one("thumb"), thumb.alpha * 0.9);
    place(R.one("thumb"), thumb.x, thumb.y, 1 - 0.2 * thumb.press);
    fade(R.one("tap"), thumb.ripple > 0 ? (1 - thumb.ripple) ** 1.5 * 0.85 : 0);
    place(R.one("tap"), thumb.rippleAt.x, thumb.rippleAt.y, lerp(0.8, 2.3, outCubic(thumb.ripple)));

    /* First and last light --------------------------------------------------- */
    fade(R.one("curtain"), Math.max(1 - span(t, 0, 0.5), inOutSine(span(t, T.end - 0.85, T.end - 0.1))));
  }

  return { update, canvas };
}
