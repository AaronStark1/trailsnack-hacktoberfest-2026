/**
 * TrailSnack's interface, rebuilt as static markup with the app's own class
 * recipes (see src/components). Phone-width variants only: the stage is a
 * 432 px phone. Elements the timeline animates carry a data-r name.
 */
import { icon, type IconName } from "./icons.ts";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "violet";

const PILL_TONES: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface-2 text-ink-muted",
  accent: "border-amber/45 bg-amber/10 text-amber",
  ok: "border-glow/35 bg-spruce/45 text-glow",
  warn: "border-caution/50 bg-caution-bg text-caution",
  danger: "border-danger/60 bg-danger-bg text-danger-ink",
  violet: "border-violet-ink/40 bg-violet-bg text-violet-ink",
};

/** src/components/ui/Pill.tsx */
export function pill(text: string, tone: Tone = "neutral", opts: { dot?: boolean; icon?: IconName; r?: string; cls?: string } = {}): string {
  return `<span ${opts.r ? `data-r="${opts.r}"` : ""} class="mono-label inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 ${PILL_TONES[tone]} ${opts.cls ?? ""}">${
    opts.dot ? `<span class="size-1.5 rounded-full bg-current"></span>` : ""
  }${opts.icon ? `<span class="-ml-0.5 flex items-center">${icon(opts.icon, 14)}</span>` : ""}${text}</span>`;
}

const TITLE_TONE = { default: "text-ink", danger: "text-danger-ink", caution: "text-caution", violet: "text-violet-ink" } as const;
const EYEBROW_TONE = { default: "text-amber", danger: "text-danger-ink", caution: "text-caution", violet: "text-violet-ink" } as const;

/** src/components/ui/SectionHeader.tsx — h1 42.5 px, h2 29 px at this width. */
export function sectionHeader(opts: {
  eyebrow: string;
  title: string;
  tone?: keyof typeof TITLE_TONE;
  right?: string;
  level?: 1 | 2;
}): string {
  const tone = opts.tone ?? "default";
  const size = opts.level === 1 ? "text-[42.5px] leading-[0.94]" : "text-[29px] leading-none";
  return `<div class="flex items-end justify-between gap-4">
    <div class="min-w-0">
      <p class="mono-label mb-2 flex items-center gap-2 ${EYEBROW_TONE[tone]}"><span class="h-px w-5 shrink-0 bg-current opacity-70"></span>${opts.eyebrow}</p>
      <p class="display ${size} ${TITLE_TONE[tone]}">${opts.title}</p>
    </div>
    ${opts.right ? `<div class="shrink-0 pb-1">${opts.right}</div>` : ""}
  </div>`;
}

/** src/components/ui/Emblem.tsx — the bramble sprig. */
export function emblem(size: number, cls = ""): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 ${cls}" aria-hidden="true">
    <path d="M7 29c.6-8 4.6-14.600 13-19"/>
    <path d="M20 10c-.4-4.200 2.800-7.600 8.500-7.500.3 5.400-3 8.700-8.500 7.500Z"/>
    <path d="M20 10l5.200-4.600" stroke-width="1.1" opacity="0.7"/>
    <path d="M11.600 18.200c-4.300.6-7.600-2-8.300-6.700 4.700-.5 7.900 2.200 8.300 6.700Z"/>
    <path d="M11.600 18.200 6.400 13.900" stroke-width="1.1" opacity="0.7"/>
    <path d="M14.200 14.600c1.900.2 3.300 1 4.200 2.300M10.300 21.400c1.600.3 2.800 1 3.600 2M20.500 21.300l1.700 1.800" stroke-width="1.2"/>
    <g stroke="none" fill="var(--color-amber)"><circle cx="20.300" cy="19.200" r="3.300"/><circle cx="15.600" cy="25.200" r="3"/><circle cx="24" cy="25.400" r="2.700"/></g>
    <g stroke="none" fill="var(--color-ink)" opacity="0.75"><circle cx="19.200" cy="18" r="0.800"/><circle cx="14.600" cy="24.100" r="0.700"/><circle cx="23.100" cy="24.400" r="0.650"/></g>
  </svg>`;
}

const BRAND = `<span class="flex shrink-0 items-center gap-2.5 text-ink">${emblem(32)}<span class="display text-[1.625rem] leading-none tracking-[0.04em] uppercase">TrailSnack</span></span>`;
const DIVIDER = `<span class="h-4 w-px shrink-0 bg-line-strong"></span>`;

/** src/components/layout/TelemetryRack.tsx, offline with Tier 1 loaded and location allowed. */
const RACK = `<span class="flex h-10 items-center gap-2.5 rounded-full border border-line-strong bg-surface-2/70 px-3 shadow-inset">
  <span class="mono-label inline-flex shrink-0 items-center gap-1.5 text-amber">${icon("wifiOff", 15)}Offline</span>${DIVIDER}
  <span class="mono-label inline-flex shrink-0 items-center gap-1.5 text-glow"><span class="size-1.5 rounded-full bg-current shadow-glow-ok"></span>T1 Ready</span>${DIVIDER}
  <span class="mono-label inline-flex shrink-0 items-center text-glow">${icon("mapPinCheck", 15)}</span>
</span>`;

/** Desktop rack: every word, plus storage. */
const RACK_WIDE = `<span class="flex h-10 items-center gap-3 rounded-full border border-line-strong bg-surface-2/70 px-4 shadow-inset">
  <span class="mono-label inline-flex items-center gap-1.5 text-amber">${icon("wifiOff", 15)}Offline</span>${DIVIDER}
  <span class="mono-label inline-flex items-center gap-1.5 text-glow"><span class="size-1.5 rounded-full bg-current shadow-glow-ok"></span>${icon("gpu", 15)}T1 Ready</span>${DIVIDER}
  <span class="mono-label inline-flex items-center gap-1.5 text-glow">${icon("mapPinCheck", 15)}GPS Allowed</span>${DIVIDER}
  <span class="mono-label inline-flex items-center gap-1.5 text-ink-muted">${icon("database", 15)}12%</span>
</span>`;

/**
 * src/components/layout/AppShell.tsx header. `link` swaps the telemetry rack
 * for the way back to the landing page (bar 15).
 */
export function appHeader(opts: { link?: boolean; wide?: boolean } = {}): string {
  if (opts.wide) {
    return `<header class="glass border-b border-line">
      <div class="mx-auto flex min-h-[72px] w-[min(100%-2.5rem,72rem)] items-center gap-4">
        ${BRAND}
        <span class="mono-label inline-flex h-[26px] items-center gap-2 rounded-full border border-line-strong px-2.5 text-[0.625rem] tracking-[0.14em] whitespace-nowrap text-ink-muted"><span class="size-1.5 rounded-full bg-glow shadow-glow-ok"></span>Offline Wild Foraging Companion</span>
        <div class="ml-auto flex items-center gap-1"><span class="inline-flex min-h-12 items-center rounded-full px-3.5 text-[0.9375rem] leading-none font-medium text-ink-muted">Home</span>${RACK_WIDE}</div>
      </div>
    </header>`;
  }
  const right = opts.link
    ? `<span data-r="homeLink" class="inline-flex h-12 items-center gap-1.5 rounded-full border border-line-strong bg-surface-2/70 px-3.5 text-[0.875rem] leading-none font-medium whitespace-nowrap text-ink">Field Guide &amp; Home ${icon("arrowUpRight", 15, 2, "text-amber")}</span>`
    : RACK;
  return `<header class="glass border-b border-line" style="padding-top:var(--safe-top)">
    <div class="mx-auto flex min-h-16 w-[calc(100%-2rem)] items-center gap-3">${BRAND}<div class="ml-auto flex min-w-0 items-center">${right}</div></div>
  </header>`;
}

const CELL = "relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full";
const CELL_ACTIVE = `${CELL} bg-amber/12 text-amber shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-amber)_45%,transparent),0_0_18px_-6px_var(--color-amber)]`;
const CELL_LABEL = "max-w-full truncate px-0.5 text-[0.6875rem] leading-[1.3] font-semibold tracking-wide";

/** src/components/layout/TabBar.tsx — the floating pill dock, above the home indicator. */
export function dock(active: "scan" | "assess" | "log", opts: { safe?: boolean } = { safe: true }): string {
  const tabs: { id: string; label: string; icon: IconName; disabled?: boolean }[] = [
    { id: "home", label: "Home", icon: "house" },
    { id: "scan", label: "Scan", icon: "scanLine" },
    { id: "assess", label: "Assess", icon: "microscope", disabled: active === "scan" },
    { id: "log", label: "Field Log", icon: "notebookPen" },
    { id: "models", label: "Models", icon: "cpu" },
    { id: "settings", label: "Settings", icon: "slidersHorizontal" },
  ];
  const cells = tabs
    .map((tab) => {
      const on = tab.id === active;
      const cls = on ? CELL_ACTIVE : tab.disabled ? `${CELL} text-ink-faint opacity-45` : `${CELL} text-ink-muted`;
      return `<span class="${cls}">${icon(tab.icon, 22, on ? 2.1 : 1.8)}<span class="${CELL_LABEL}">${tab.label}</span></span>`;
    })
    .join("");
  return `<nav class="px-3" style="padding-bottom:${opts.safe === false ? "0.75rem" : "max(0.75rem,var(--safe-bottom))"}">
    <div class="glass mx-auto flex max-w-lg items-center gap-0.5 rounded-full border border-line-strong p-1.5 shadow-float">${cells}</div>
  </nav>`;
}

/** The phone's own chrome: clock, airplane mode, battery. */
export const STATUS_BAR = `<div class="flex h-[44px] items-center justify-between px-7 pt-2 text-ink">
  <span class="font-sans text-[15px] leading-none font-semibold tracking-tight">19:42</span>
  <span class="flex items-center gap-2">
    ${icon("plane", 15, 2.2, "rotate-45 text-amber")}
    <span class="mono-label text-[0.5625rem] tracking-[0.1em] text-ink-muted">0 bars</span>
    <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden="true"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.45"/><rect x="2" y="2" width="15" height="9" rx="2" fill="currentColor"/><path d="M24 4.500v4c.9-.3 1.500-1.100 1.500-2s-.6-1.700-1.500-2Z" fill="currentColor" opacity="0.5"/></svg>
  </span>
</div>`;

export const HOME_INDICATOR = `<div class="absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/75"></div>`;

/** index.html — the landing page header at phone width: brand and the scanner pill. */
export function landingHeader(r = "launch"): string {
  return `<header class="glass border-b border-line" style="padding-top:var(--safe-top)">
    <div class="mx-auto flex min-h-16 w-[calc(100%-2rem)] items-center gap-3">
      ${BRAND}
      <span data-r="${r}" class="ml-auto inline-flex h-12 items-center justify-center rounded-full bg-ink px-[22px] text-[15px] leading-none font-semibold whitespace-nowrap text-[#0b130e] shadow-[inset_0_-2px_0_rgb(0_0_0/0.14),0_10px_30px_-14px_rgb(245_239_226/0.7)]">Launch Scanner</span>
    </div>
  </header>`;
}

/* ------------------------------------------------------------------------- */
/* Assess                                                                     */
/* ------------------------------------------------------------------------- */

const TICK = "pointer-events-none absolute size-4 border-hud/85 [filter:drop-shadow(0_0_1.5px_rgb(0_0_0/0.8))]";

function datum(label: string, value: string): string {
  return `<div data-rs="datum" class="min-w-0"><p class="mono-label text-ink-faint">${label}</p><p class="mono-value mt-1 text-[0.8125rem] leading-snug break-words text-ink">${value}</p></div>`;
}

/** src/components/assess/SpecimenFrame.tsx — compact on phones, opened out on desktop. */
export function specimenPlate(photo: string, expanded = false): string {
  return `<figure data-r="specimen" class="plate overflow-hidden">
    <div class="grid ${expanded ? "grid-cols-1" : "grid-cols-[minmax(0,9fr)_minmax(0,10fr)]"}">
      <div class="relative block bg-black">
        <img src="${photo}" alt="" class="aspect-square w-full object-cover" />
        <span data-rs="tick" class="${TICK} top-2.5 left-2.5 origin-top-left border-t border-l"></span>
        <span data-rs="tick" class="${TICK} top-2.5 right-2.5 origin-top-right border-t border-r"></span>
        <span data-rs="tick" class="${TICK} bottom-2.5 left-2.5 origin-bottom-left border-b border-l"></span>
        <span data-rs="tick" class="${TICK} right-2.5 bottom-2.5 origin-bottom-right border-r border-b"></span>
      </div>
      <figcaption class="min-w-0 ${expanded ? "border-t border-line p-5" : "self-center p-3.5"}">
        <p class="mono-label flex items-center gap-2 text-amber"><span class="h-px w-4 shrink-0 bg-current opacity-70"></span>Specimen</p>
        <div class="mt-3 grid gap-x-5 gap-y-3 ${expanded ? "grid-cols-2" : "grid-cols-1"}">
          ${datum("Captured", "13 Nov 2026, 19:42")}
          ${datum("Tier 1 inference", "184 ms · WebGPU")}
          ${datum("Safety database", "2026.11.1")}
        </div>
      </figcaption>
    </div>
  </figure>`;
}

/**
 * src/components/assess/VerdictBadge.tsx, CAUTION. The reference class rides
 * under the word with its full qualifier — never the bare word "edible".
 */
export function verdictBadge(): string {
  return `<div data-r="verdict" class="relative overflow-hidden rounded-plate border-2 border-caution/70 bg-caution-bg shadow-plate">
    <div class="thorn-edge text-caution"></div>
    <span class="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-caution opacity-[0.13] blur-3xl"></span>
    <div class="relative p-5">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p class="mono-label flex items-center gap-2 text-caution"><span class="h-px w-5 bg-current opacity-70"></span>Field verdict</p>
        <p class="flex items-center gap-2"><span class="mono-label text-ink-faint">Confidence</span><span class="mono-label rounded-full border border-current px-2.5 py-1.5 text-caution">confident</span></p>
      </div>
      <div data-r="stamp" class="mt-4 flex origin-[30%_50%] items-center gap-4">
        <span class="flex size-14 shrink-0 items-center justify-center rounded-full border border-current/45 bg-bg/40 text-caution">${icon("triangleAlert", 32, 1.9)}</span>
        <span class="display text-[74px] leading-[0.86] text-caution">CAUTION</span>
      </div>
      <p data-r="qualifier" class="mono-label mt-4 inline-flex min-h-7 items-center rounded-full border border-caution/50 bg-bg/45 px-3 py-1.5 tracking-[0.1em] text-caution">Edible per reference • verify checklist</p>
      <p data-r="banner" class="mt-3.5 text-[0.9375rem] leading-snug font-bold tracking-wide text-caution uppercase">Lookalike hazard — verify before any contact</p>
      <p data-r="headline" class="mt-2 text-lg leading-snug font-semibold text-ink">Caution — do not ingest without expert confirmation.</p>
      <p class="mono-label mt-4 text-ink-faint">Deterministic safety engine · worst case wins</p>
    </div>
  </div>`;
}

/* Botanical plates for the lookalike card: line drawings, drawn on by the timeline. */

function leaflet(cx: number, cy: number, length: number, width: number, angle: number, teeth: number): string {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (u: number, v: number): string => `${(cx + u * cos - v * sin).toFixed(1)} ${(cy + u * sin + v * cos).toFixed(1)}`;
  const side = (sign: number): string[] => {
    const points: string[] = [];
    for (let i = 0; i <= teeth * 2; i++) {
      const k = i / (teeth * 2);
      const profile = Math.sin(Math.PI * k ** 0.85) * width * (1 - 0.25 * k);
      points.push(at(k * length, sign * profile * (teeth > 0 && i % 2 === 1 ? 1.16 : 1)));
    }
    return points;
  };
  const outline = [...side(1), ...side(-1).reverse()];
  let veins = `M${at(0, 0)}L${at(length, 0)}`;
  for (let i = 1; i <= 5; i++) {
    const k = i / 6.5;
    const reach = Math.sin(Math.PI * k ** 0.85) * width * 0.86;
    veins += `M${at(k * length, 0)}L${at(k * length + length * 0.13, reach)}M${at(k * length, 0)}L${at(k * length + length * 0.13, -reach)}`;
  }
  return `<path data-rs="ink" pathLength="1" d="M${outline.join("L")}Z"/><path data-rs="ink" pathLength="1" stroke-width="0.7" opacity="0.75" d="${veins}"/>`;
}

const SVG_OPEN = `fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1" aria-hidden="true"`;

const STRAWBERRY_PLATE = `<svg viewBox="0 0 170 104" class="w-full text-edible" ${SVG_OPEN}>
  <path data-rs="ink" pathLength="1" d="M44 90C28 82 21 64 25 52c3-9 11-11 19-9 8-2 16 0 19 9 4 12-3 30-19 38Z"/>
  <path data-rs="ink" pathLength="1" d="M27 49l7-11 5 8 5-13 5 13 5-8 7 11"/>
  <path data-rs="ink" pathLength="1" d="M44 33c0-9 3-15 9-19"/>
  <g data-rs="ink" pathLength="1" stroke-width="1.6">${[[36, 58], [45, 55], [53, 59], [33, 68], [42, 66], [50, 69], [57, 67], [38, 77], [47, 78]]
    .map(([x, y]) => `<path pathLength="1" d="M${x} ${y}v2.200"/>`)
    .join("")}</g>
  ${leaflet(104, 60, 44, 15, -Math.PI / 2, 7)}${leaflet(100, 62, 40, 14, -Math.PI * 0.86, 7)}${leaflet(108, 62, 40, 14, -Math.PI * 0.14, 7)}
  <path data-rs="ink" pathLength="1" d="M104 60v36"/>
</svg>`;

const NIGHTSHADE_PLATE = `<svg viewBox="0 0 170 104" class="w-full text-danger-ink" ${SVG_OPEN}>
  <path data-rs="ink" pathLength="1" d="M18 16c14 4 26 12 34 26M38 27c-3 8-4 16-3 24M52 42c2 6 2 12 0 18M46 34c8 4 14 10 18 18"/>
  <ellipse data-rs="ink" pathLength="1" cx="35" cy="62" rx="7.500" ry="11"/>
  <ellipse data-rs="ink" pathLength="1" cx="52" cy="71" rx="7.500" ry="11"/>
  <ellipse data-rs="ink" pathLength="1" cx="66" cy="62" rx="7" ry="10.500"/>
  <path data-rs="ink" pathLength="1" stroke-width="0.8" d="M31 52l4 3 4-3M48 61l4 3 4-3M62 52l4 3 4-3"/>
  <path data-rs="ink" pathLength="1" d="M122 96c-1-12-1-22 0-30-9 3-17 1-22-6 7-3 14-3 20 1-6-16-3-33 4-48 9 14 13 31 7 48 6-4 13-4 19-1-5 7-13 9-21 6 1 9 1 19 0 30"/>
  <path data-rs="ink" pathLength="1" stroke-width="0.7" opacity="0.75" d="M124 62V16M124 50c5-3 8-8 9-14M124 50c-4-3-6-8-7-14M124 36c3-2 5-6 6-10M124 36c-3-2-4-6-5-10M122 64c-6 1-12 0-18-3M127 63c6 1 11 0 16-2"/>
</svg>`;

function difference(text: string): string {
  return `<li data-rs="diff" class="flex gap-2.5 leading-snug font-medium text-ink"><span class="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-danger"></span><span>${text}</span></li>`;
}

/** src/components/assess/LookalikeCards.tsx — one flagged lookalike, with the two plants side by side. */
export function lookalikes(): string {
  return `<section data-r="lookalikes" class="grid gap-4">
    ${sectionHeader({ eyebrow: "Hazard · check first", title: "Hazardous lookalikes", tone: "danger", right: pill("1 flagged", "danger", { dot: true }) })}
    <article data-r="hazard" class="overflow-hidden rounded-plate border border-danger/70 bg-danger-bg shadow-plate">
      <div class="thorn-edge text-danger"></div>
      <div class="p-5">
        <div class="flex items-start gap-4">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-full border border-danger/60 bg-bg/40 text-danger-ink">${icon("biohazard", 24)}</span>
          <div class="min-w-0 flex-1">
            <p class="font-sans text-xl leading-tight font-bold tracking-normal text-ink">Bittersweet nightshade</p>
            <p class="sci mt-0.5 text-ink-muted">Solanum dulcamara</p>
            <p class="mt-2.5 flex flex-wrap items-center gap-2"><span class="mono-label text-ink-faint">Reference class</span>${pill("toxic", "danger", { icon: "biohazard" })}</p>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 border-t border-danger/35 pt-4">
          <div class="rounded-field border border-edible-line/70 bg-bg/45 p-2.5">${STRAWBERRY_PLATE}<p class="mono-label mt-1.5 text-[0.5625rem] text-edible">Your specimen</p><p class="sci text-[0.8125rem] leading-tight text-ink">Fragaria vesca</p></div>
          <div class="rounded-field border border-danger/60 bg-bg/45 p-2.5">${NIGHTSHADE_PLATE}<p class="mono-label mt-1.5 text-[0.5625rem] text-danger-ink">Toxic lookalike</p><p class="sci text-[0.8125rem] leading-tight text-ink">Solanum dulcamara</p></div>
        </div>
        <p class="mono-label mt-4 text-danger-ink">How to tell apart</p>
        <ul class="mt-2.5 grid gap-2 text-[0.9375rem]">
          ${difference("Strawberry wears a leafy green calyx and carries its seeds on the skin")}
          ${difference("Nightshade berries are smooth, glossy ovals with the seeds inside")}
          ${difference("Toothed leaflets in threes with straight veins — not an eared, arrow-shaped leaf")}
        </ul>
      </div>
    </article>
  </section>`;
}

const REASONS = [
  "Confidence confident: top1 0.462, margin over top2 0.071.",
  "Worst-case rule: top candidate lists hazardous confusable bittersweet-nightshade; included as lookalike.",
  "Hazardous lookalike is outside the plausible set → CAUTION; expert must exclude it.",
];

/** src/components/assess/ReasonTrace.tsx, opening as the timeline plays. */
export function ruleLedger(): string {
  return `<section data-r="ledger" class="plate overflow-hidden">
    <div class="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3">
      <span class="flex min-w-0 items-center gap-3.5">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-ink-muted">${icon("listChecks", 20)}</span>
        <span class="min-w-0"><span class="mono-label block text-ink-faint">Engine trace · ${REASONS.length} rules</span><span class="mt-1 block text-lg leading-tight font-semibold text-ink">Why this verdict</span></span>
      </span>
      <span data-r="chevron" class="shrink-0 text-amber">${icon("chevronDown", 22)}</span>
    </div>
    <div data-r="ledgerBody" class="overflow-hidden">
      <div data-r="ledgerInner" class="border-t border-line">
        <div class="px-4 pt-5 pb-4">
          <p class="mono-label flex items-center gap-2 text-amber"><span class="h-px w-5 bg-current opacity-70"></span>Rule ledger</p>
          <p data-r="ledgerTitle" class="display mt-2.5 origin-left text-[54px] leading-[0.9] text-ink uppercase">Worst-case<br /><span class="text-amber">always wins</span></p>
        </div>
        <ol class="divide-y divide-line border-t border-line">
          ${REASONS.map((r, i) => `<li data-rs="reason" class="flex gap-3.5 px-4 py-3"><span class="mono-value w-6 shrink-0 pt-0.5 text-sm text-amber">${String(i + 1).padStart(2, "0")}</span><span class="text-[0.9375rem] leading-snug text-ink">${r}</span></li>`).join("")}
        </ol>
        <p class="mono-label border-t border-line px-4 py-3.5 text-ink-faint">Rules decide · the model only ranks</p>
      </div>
    </div>
  </section>`;
}

const CHECKS: { text: string; tag: string; icon: IconName }[] = [
  { text: "Serrated leaf margins confirmed", tag: "Leaf", icon: "leaf" },
  { text: "Solitary flower bracts verified", tag: "Feature", icon: "eye" },
  { text: "Stem lacks milky latex", tag: "Stem", icon: "ruler" },
];

/** src/components/assess/Checklist.tsx. data-on flips each row as the thumb lands. */
export function checklist(): string {
  const rows = CHECKS.map(
    (c) => `<li data-rs="check" data-on="0" class="group relative flex min-h-16 items-center gap-4 p-4 data-[on=1]:bg-surface-3/50">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] border-2 border-line-strong bg-surface-2 text-transparent shadow-inset group-data-[on=1]:border-amber group-data-[on=1]:bg-amber group-data-[on=1]:text-on-amber group-data-[on=1]:shadow-none"><span data-rs="checkMark">${icon("check", 22, 3)}</span></span>
      <span class="min-w-0 flex-1">
        <span class="mono-label flex items-center gap-1.5 text-ink-faint group-data-[on=1]:text-amber">${icon(c.icon, 14)}${c.tag}</span>
        <span class="mt-1.5 block leading-snug text-ink group-data-[on=1]:text-ink-muted">${c.text}</span>
      </span>
    </li>`,
  ).join("");
  return `<section data-r="checklist" class="grid gap-4">
    ${sectionHeader({
      eyebrow: "In the field",
      title: "Verification checklist",
      right: `<span class="relative inline-flex">${pill(`<span data-r="checkCount">0</span>/3 checked`, "neutral", { r: "checkPill" })}<span data-r="checkPillDone" class="absolute inset-0">${pill("3/3 checked", "accent", { dot: true })}</span></span>`,
    })}
    <ul class="plate divide-y divide-line overflow-hidden">${rows}</ul>
    <p class="text-[0.875rem] leading-snug text-ink-muted"><strong class="text-ink">A finished checklist is not proof of edibility.</strong> Only a qualified local expert can confirm a wild specimen.</p>
  </section>`;
}

/** The Deep Look trigger panel (src/pages/Assess.tsx). */
export function deepLookTrigger(): string {
  return `<div data-r="deepTrigger" class="relative overflow-hidden rounded-plate border border-violet-ink/35 bg-violet-bg shadow-plate">
    <span class="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-violet opacity-25 blur-3xl"></span>
    <div class="relative grid gap-4 p-5">
      <div class="flex items-start gap-4">
        <span class="flex size-12 shrink-0 items-center justify-center rounded-full border border-violet-ink/45 bg-bg/40 text-violet-ink">${icon("microscope", 22)}</span>
        <div class="min-w-0 flex-1"><p class="mono-label text-violet-ink">Tier 2 · feature inspection</p><p class="display mt-2 text-[29px] leading-none text-ink">Deep Look</p></div>
      </div>
      <span data-r="deepButton" class="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full border border-violet-ink/40 bg-violet px-6 text-base leading-tight font-semibold text-on-violet">${icon("microscope", 20)}Describe visible features</span>
    </div>
  </div>`;
}

/** What Gemma streams, shaped by src/engine/deepLookSchema.ts. */
export const DEEP_LOOK = {
  observed_features: ["small red conical fruit", "golden achenes on the skin", "green calyx crown", "toothed leaflets in threes"],
  candidate_assessments: [
    {
      species_id: "wild-strawberry",
      confirmed: ["external seeds (achenes)", "leafy green cap (calyx)", "toothed trifoliate leaves"],
      contradicted: [],
      not_visible: ["ground runners", "white five-petaled flowers"],
    },
  ],
  photo_quality_issues: ["none"],
};

const TAG = "mono-label inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5";

function findings(label: string, glyph: IconName, ink: string, items: string[]): string {
  return `<div class="mt-2.5 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3">
    <p class="mono-label flex items-center gap-1.5 self-start pt-1 ${ink}">${icon(glyph, 13)}${label}</p>
    <ul class="grid gap-0.5">${items.map((item) => `<li class="text-[0.875rem] leading-snug ${ink === "text-ink-faint" ? "text-ink-muted" : "text-ink"}">${item}</li>`).join("")}</ul>
  </div>`;
}

/**
 * Tier 2 Deep Look as a drawer: src/components/ui/Sheet.tsx holding the
 * src/components/assess/DeepLookPanel.tsx transcript, first as the raw token
 * stream, then as the parsed findings.
 */
export function deepLookDrawer(): string {
  const assessment = DEEP_LOOK.candidate_assessments[0];
  return `<div data-r="drawer" class="plate absolute inset-x-0 bottom-0 rounded-b-none border-violet-ink/30 px-5 pt-3 shadow-float" style="padding-bottom:calc(var(--safe-bottom) + 18px)">
    <span class="mx-auto mb-4 block h-1 w-10 rounded-full bg-line-strong"></span>
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3.5">
        <span class="flex size-12 shrink-0 items-center justify-center rounded-full border border-violet-ink/45 bg-violet-bg text-violet-ink">${icon("microscope", 22)}</span>
        <div><p class="mono-label text-violet-ink">Tier 2 · Deep Look</p><p class="display mt-1.5 text-[29px] leading-none text-ink">Feature transcript</p></div>
      </div>
      <span class="relative inline-flex">
        <span data-r="tagLive" class="${TAG} border-violet-ink/50 text-violet-ink"><span data-r="tagDot" class="size-1.5 rounded-full bg-current"></span>Generating</span>
        <span data-r="tagValid" class="${TAG} absolute right-0 border-violet-ink/50 bg-violet-bg whitespace-nowrap text-violet-ink">${icon("check", 13)}Valid JSON</span>
      </span>
    </div>
    <p class="mono-label mt-4 border-t border-violet-ink/25 pt-4 text-violet-ink">Gemma 4 E2B · on-device · JSON-schema constrained</p>

    <div class="relative mt-3 h-[292px]">
      <div data-r="streamBox" class="absolute inset-0 overflow-hidden rounded-field border border-violet-ink/25 bg-bg/60 p-4 font-mono text-[0.8125rem] leading-[1.625] whitespace-pre text-ink"><div data-r="streamRoll"><span data-r="streamText"></span><span data-r="caret" class="ml-0.5 text-violet-ink">▌</span></div></div>
      <div data-r="resultBox" class="absolute inset-0 overflow-hidden rounded-field border border-violet-ink/25 bg-bg/60 p-4">
        <p class="mono-label text-ink-faint">Observed features</p>
        <ul class="mt-2 flex flex-wrap gap-1.5">${DEEP_LOOK.observed_features.map((f) => `<li data-rs="feature" class="rounded-full border border-violet-ink/35 bg-violet-bg px-2.5 py-1 text-[0.8125rem] leading-snug text-ink">${f}</li>`).join("")}</ul>
        <div class="mt-3.5 border-t border-line pt-3">
          <p class="mono-label text-ink-faint">Checked against</p>
          <p class="mono-value mt-1 font-medium text-ink">${assessment?.species_id ?? ""}</p>
          ${findings("Confirmed", "check", "text-violet-ink", assessment?.confirmed ?? [])}
          ${findings("Not visible", "eyeOff", "text-ink-faint", assessment?.not_visible ?? [])}
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-center">
      <span data-r="latency" class="inline-flex h-10 items-center gap-2 rounded-full border border-violet-ink/60 bg-violet-bg px-3.5 font-mono text-[0.6875rem] leading-none font-medium tracking-[0.07em] whitespace-nowrap text-violet-ink uppercase">${icon("gpu", 15)}On-device Gemma • Tier 1 <span class="text-ink">184ms</span> • 100% private</span>
    </div>
    <p class="mt-4 text-[0.8125rem] leading-snug text-ink-muted">A model-generated description of the photo, not a verdict. It can lower the verdict through the safety engine; it can never raise it.</p>
  </div>`;
}

const CALL = "flex min-h-14 w-full items-center gap-3 rounded-full px-5 py-2 leading-tight font-semibold";
const CALL_SOLID = `${CALL} border border-danger-ink/40 bg-danger text-on-danger`;
const CALL_OUTLINE = `${CALL} border border-danger/70 bg-bg/40 text-danger-ink`;

function region(flag: string, name: string, service: string, calls: string, r = ""): string {
  return `<div ${r ? `data-r="${r}"` : ""} data-rs="region" class="grid gap-2">
    <p class="flex items-baseline gap-2.5"><span class="text-xl leading-none">${flag}</span><span class="text-lg leading-tight font-bold text-ink">${name}</span><span class="min-w-0 truncate text-[0.8125rem] text-ink-muted">${service}</span></p>
    ${calls}
  </div>`;
}

/**
 * src/components/assess/EmergencyCard.tsx, widened to the landing page's
 * regional matrix. India leads: the hiker is at 2,480 m in Himachal Pradesh.
 */
export function emergency(): string {
  const phone = icon("phone", 20, 2.2);
  const siren = icon("siren", 20, 2.2);
  return `<section data-r="emergency" class="overflow-hidden rounded-plate border border-danger/60 bg-danger-bg shadow-plate">
    <div class="thorn-edge text-danger"></div>
    <div class="p-5">
      ${sectionHeader({ eyebrow: "Works offline · regional lifelines", title: "Emergency", tone: "danger", right: pill("Direct dial", "danger", { icon: "phone" }) })}
      <div class="mt-5 grid gap-4">
        ${region(
          "🇮🇳",
          "India",
          "",
          `<p class="-mt-1 text-[0.8125rem] leading-snug text-ink-muted">National Poisons Information Centre · AIIMS, New Delhi</p>
           <span data-r="indiaCall" class="${CALL_SOLID} min-h-16"><span class="shrink-0">${phone}</span><span class="min-w-0"><span class="block text-[0.6875rem] leading-none font-medium tracking-wide uppercase opacity-85">Poison control · toll-free</span><span class="mt-1 block font-mono text-[1.375rem] leading-none font-semibold tracking-tight">1800-116-117</span></span></span>
           <span class="${CALL_OUTLINE}"><span class="shrink-0">${siren}</span><span>Emergency: <span class="font-mono text-lg">112</span></span></span>`,
          "india",
        )}
        <div class="vein"></div>
        ${region(
          "🇺🇸",
          "North America",
          "Poison Help",
          `<div class="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-2"><span class="${CALL_SOLID} px-4">${phone}<span class="font-mono text-[0.9375rem] whitespace-nowrap">1-800-222-1222</span></span><span class="${CALL_OUTLINE} px-4">${siren}<span class="font-mono">911</span></span></div>`,
        )}
        ${region(
          "🇪🇺",
          "Europe &amp; UK",
          "NHS · EU emergency",
          `<div class="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-2"><span class="${CALL_SOLID} px-4">${phone}<span class="whitespace-nowrap">NHS <span class="font-mono">111</span></span></span><span class="${CALL_OUTLINE} px-4">${siren}<span class="font-mono">112</span></span></div>`,
        )}
      </div>
    </div>
  </section>`;
}

/** The fingerprint of the featured specimen record (SHA-256 of "Fragaria vesca|32.2450N,77.1758E|2480m"). */
export const SPECIMEN_HASH = "498ba1281ed7c00f660d4c0b06638f54c9aa0128384d15968185c9ab454471a3";

const TAG_CLASS = {
  TOXIC: "border-danger/60 bg-danger-bg text-danger-ink",
  CAUTION: "border-caution/50 bg-caution-bg text-caution",
  UNKNOWN: "border-line-strong bg-unknown-bg text-unknown",
} as const;
const RIM_CLASS = { TOXIC: "border-l-danger", CAUTION: "border-l-caution", UNKNOWN: "border-l-line-strong" } as const;
const TAG_ICON: Record<keyof typeof TAG_CLASS, IconName> = { TOXIC: "shieldAlert", CAUTION: "triangleAlert", UNKNOWN: "circleHelp" };

export interface LogEntry {
  no: number;
  badge: keyof typeof TAG_CLASS;
  name: string;
  scientific: string | null;
  when: string;
  gps: string;
  photo: string;
}

/** One row of src/pages/FieldLog.tsx. */
export function logEntry(e: LogEntry, r = ""): string {
  return `<li ${r ? `data-r="${r}"` : ""} data-rs="entry" class="plate list-none overflow-hidden border-l-[3px] ${RIM_CLASS[e.badge]}">
    <div class="flex items-center gap-4 p-4 text-ink">
      <img src="${e.photo}" alt="" class="size-[5.5rem] shrink-0 rounded-field border border-line-strong bg-surface-2 object-cover" />
      <span class="min-w-0 flex-1">
        <span class="mono-label inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 ${TAG_CLASS[e.badge]}">${icon(TAG_ICON[e.badge], 13)}<span class="truncate">${e.badge}</span></span>
        <span class="mt-2 block truncate text-lg leading-tight font-semibold text-ink">${e.name}</span>
        ${e.scientific ? `<span class="sci mt-0.5 block truncate text-ink-muted">${e.scientific}</span>` : ""}
        <span class="mono-label mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-faint">
          <span class="inline-flex items-center gap-1.5">${icon("clock", 12)}${e.when}</span>
          <span class="inline-flex items-center gap-1.5">${icon("mapPin", 12)}${e.gps}</span>
        </span>
      </span>
    </div>
    <div class="flex items-center justify-between gap-3 border-t border-line py-1 pr-4 pl-4">
      <span class="mono-label text-ink-faint">№ ${String(e.no).padStart(3, "0")}</span>
      <span class="inline-flex min-h-12 items-center gap-2.5 text-[0.9375rem] leading-tight font-semibold text-ink-muted">${icon("trash", 16)}Delete entry</span>
    </div>
  </li>`;
}

/** "Save to Field Log" (src/pages/Assess.tsx): geotag and fingerprint, then the entry that was written. */
export function saveSection(entry: LogEntry): string {
  return `<section data-r="save" class="grid gap-4">
    <div class="plate grid gap-4 p-5">
      ${sectionHeader({ eyebrow: "Field journal", title: "Save to Field Log", right: `<span data-r="savedPill">${pill("IndexedDB", "ok", { icon: "database" })}</span>` })}
      <p data-r="geotag" class="well flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field px-4 py-3">
        <span class="mono-label inline-flex items-center gap-1.5 text-glow">${icon("mapPinCheck", 14)}Geotag · offline fix</span>
        <span class="mono-value w-full text-[0.9375rem] text-ink">32°14'42"N 77°10'33"E • 2,480m</span>
      </p>
      <p data-r="hashRow" class="well flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field px-4 py-3">
        <span class="mono-label inline-flex items-center gap-1.5 text-amber">${icon("fingerprint", 14)}SHA-256 fingerprint</span>
        <span data-r="hash" class="mono-value w-full text-[0.8125rem] leading-snug break-all text-ink">${SPECIMEN_HASH}</span>
      </p>
      <span class="relative block">
        <span data-r="saveButton" class="inline-flex min-h-16 w-full items-center justify-center gap-2.5 rounded-full border border-amber-bright/60 bg-amber px-7 text-lg leading-tight font-semibold text-on-amber shadow-cta">${icon("save", 22)}Save to Field Log</span>
        <span data-r="savedButton" class="absolute inset-0 inline-flex items-center justify-center gap-2.5 rounded-full border border-glow/45 bg-spruce px-7 text-lg leading-tight font-semibold text-glow">${icon("check", 22, 2.6)}Saved on this device</span>
      </span>
    </div>
    <ol class="m-0 grid p-0">${logEntry(entry, "savedEntry")}</ol>
  </section>`;
}
