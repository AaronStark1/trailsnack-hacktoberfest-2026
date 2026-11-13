#!/usr/bin/env node
/**
 * Renders the TrailSnack showcase reel to an MP4.
 *
 *   npm install                 # once, inside showreel/ (ffmpeg-static)
 *   npm run build               # showreel/dist/trailsnack-reel.html (standalone)
 *   npm run render              # ../docs/trailsnack-showreel.mp4 (1080 × 1920, 60 fps, 40 s) and its poster
 *
 * Headless Chromium opens the standalone harness and calls window.seek(t) for
 * every sub-frame: 3 per output frame, 180 per second. The PNGs are piped
 * straight into ffmpeg, which blends each group of three (tmix) into one frame
 * with a real shutter's motion blur and muxes the score — itself rendered in
 * the page by an OfflineAudioContext and already at -14 LUFS, under -1 dBTP once encoded.
 *
 * Options
 *   --out <file>        output path                (docs/trailsnack-showreel.mp4)
 *   --from <s> --to <s> render part of the reel    (0 … 40)
 *   --fps <n>           output frame rate          (60)
 *   --subframes <n>     sub-frames per frame       (3; 1 turns motion blur off)
 *   --crf <n>           x264 quality               (20; about 29 MB)
 *   --frames <dir>      also keep every captured sub-frame as a PNG in <dir>
 *   --no-encode         capture only (needs --frames): no ffmpeg involved
 *   --audio-only        write the WAV and stop
 *   --headed            show the browser while it renders
 *
 * ffmpeg comes from $FFMPEG, else the ffmpeg-static package, else PATH. It needs
 * the tmix filter, libx264 and aac, which any stock build has.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const harness = join(here, "dist", "trailsnack-reel.html");

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const docs = resolve(here, "..", "docs");
const out = resolve(option("out", join(docs, "trailsnack-showreel.mp4")));
const poster = out.replace(/\.[^.]+$/, "") + "-poster.jpg";
/** The frame used as the poster: the third title over the strawberries. */
const POSTER_T = 3.4;
const fps = Number(option("fps", 60));
const subframes = Math.max(1, Number(option("subframes", 3)));
const crf = String(option("crf", 20));
const keep = option("frames", null);
const audioOnly = flag("audio-only");
const encode = !flag("no-encode");
if (!encode && !keep) {
  console.error("--no-encode needs --frames <dir> to put the sub-frames somewhere.");
  process.exit(1);
}

if (!existsSync(harness)) {
  console.error("showreel/dist/trailsnack-reel.html is missing — run `npm run build` in showreel/ first.");
  process.exit(1);
}

/* ------------------------------- ffmpeg ---------------------------------- */

const ffmpeg =
  process.env.FFMPEG ||
  (await import("ffmpeg-static").then((m) => m.default, () => null)) ||
  "ffmpeg";
if (!audioOnly && encode) {
  const probe = (args) => spawnSync(ffmpeg, ["-hide_banner", ...args], { encoding: "utf8" });
  const filters = probe(["-filters"]);
  const encoders = probe(["-encoders"]);
  const missing = [];
  if (filters.error || filters.status !== 0) missing.push("ffmpeg itself");
  else {
    if (subframes > 1 && !/\btmix\b/.test(filters.stdout)) missing.push("the tmix filter");
    if (!/\blibx264\b/.test(encoders.stdout)) missing.push("the libx264 encoder");
    if (!/\baac\b/.test(encoders.stdout)) missing.push("the aac encoder");
  }
  if (missing.length) {
    console.error(`Cannot encode: ${missing.join(", ")} not found (looked for "${ffmpeg}").`);
    console.error("Run `npm install` in showreel/ (ffmpeg-static), or point $FFMPEG at a stock ffmpeg. `--audio-only` needs no ffmpeg.");
    process.exit(1);
  }
}

/* ------------------------------- browser --------------------------------- */

const browser = await chromium.launch({
  headless: !flag("headed"),
  args: [
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    `--use-angle=${process.platform === "darwin" ? "metal" : "default"}`,
  ],
});
// 432 × 768 CSS px at a device scale of 2.5: every screenshot is exactly 1080 × 1920.
const page = await browser.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5 });
page.on("pageerror", (error) => {
  console.error(`[reel] ${error.message}`);
  process.exitCode = 1;
});
await page.goto(`${pathToFileURL(harness).href}?capture`);
await page.waitForFunction(() => window.reelReady === true, null, { timeout: 60_000 });

const reel = await page.evaluate(() => ({ duration: window.reel.duration, width: window.reel.width, height: window.reel.height }));
const renderer = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl?.getExtension("WEBGL_debug_renderer_info");
  return gl && info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log(`[reel] ${reel.width} × ${reel.height}, ${reel.duration} s · WebGL: ${renderer}`);
if (/swiftshader|llvmpipe/i.test(String(renderer))) console.warn("[reel] software WebGL: the render will be correct but slow.");

const from = Math.max(0, Number(option("from", 0)));
const to = Math.min(reel.duration, Number(option("to", reel.duration)));

/* -------------------------------- audio ---------------------------------- */

mkdirSync(dirname(out), { recursive: true });
mkdirSync(join(here, "out"), { recursive: true });
const wavPath = join(here, "out", "trailsnack-showreel.wav");
{
  const started = Date.now();
  const score = await page.evaluate(() => window.reel.audio());
  const wav = Buffer.from(score.wav, "base64");
  writeFileSync(wavPath, wav);
  const sha = createHash("sha256").update(wav).digest("hex").slice(0, 16);
  console.log(
    `[reel] score: ${score.lufs.toFixed(2)} LUFS integrated, peak ${score.peakDb.toFixed(2)} dBFS, sha256 ${sha}… (${((Date.now() - started) / 1000).toFixed(1)} s) → ${wavPath}`,
  );
}
if (audioOnly) {
  await browser.close();
  process.exit(0);
}

/* -------------------------------- video ---------------------------------- */

const frames = Math.round((to - from) * fps);
const filter = [
  subframes > 1 ? `tmix=frames=${subframes}` : null,
  // tmix emits a running blend; keep the one that covers each whole group of sub-frames.
  subframes > 1 ? `select='eq(mod(n\\,${subframes})\\,${subframes - 1})'` : null,
  `setpts=N/${fps}/TB`,
  "scale=out_color_matrix=bt709:out_range=tv",
  "format=yuv420p",
]
  .filter(Boolean)
  .join(",");

const encoder = !encode ? null : spawn(
  ffmpeg,
  [
    "-hide_banner", "-loglevel", "warning", "-y",
    "-f", "image2pipe", "-framerate", String(fps * subframes), "-c:v", "png", "-i", "pipe:0",
    "-ss", String(from), "-t", String(to - from), "-i", wavPath,
    "-filter_complex", `[0:v]${filter}[v]`,
    "-map", "[v]", "-map", "1:a",
    "-r", String(fps),
    "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-c:a", "aac", "-b:a", "256k",
    "-movflags", "+faststart", "-shortest",
    out,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const encoded = new Promise((done, fail) => {
  if (!encoder) return done();
  encoder.on("error", fail);
  encoder.on("close", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited with ${code}`))));
});
encoder?.stdin.on("error", () => {}); // a dead encoder is reported by its exit code

if (keep) mkdirSync(resolve(keep), { recursive: true });
const started = Date.now();

for (let frame = 0; frame < frames; frame++) {
  for (let sub = 0; sub < subframes; sub++) {
    const t = from + (frame + sub / subframes) / fps;
    // seek() paints the frame; two animation frames later it has been presented.
    await page.evaluate((time) => {
      window.seek(time);
      return new Promise((shown) => requestAnimationFrame(() => requestAnimationFrame(shown)));
    }, t);
    const png = await page.screenshot({ type: "png" });
    if (frame === 0 && sub === 0) {
      // PNG header: width and height at bytes 16 and 20. Anything but the full frame is a broken capture.
      const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      if (w !== reel.width || h !== reel.height) throw new Error(`captured ${w} × ${h}, expected ${reel.width} × ${reel.height}`);
    }
    if (keep) writeFileSync(join(resolve(keep), `${String(frame).padStart(5, "0")}-${sub}.png`), png);
    if (encoder && !encoder.stdin.write(png)) await new Promise((drained) => encoder.stdin.once("drain", drained));
  }
  if (frame % fps === fps - 1 || frame === frames - 1) {
    const elapsed = (Date.now() - started) / 1000;
    const left = (elapsed / (frame + 1)) * (frames - frame - 1);
    process.stdout.write(`\r[reel] frame ${frame + 1}/${frames} · ${elapsed.toFixed(0)} s elapsed · ~${left.toFixed(0)} s left   `);
  }
}
process.stdout.write("\n");
encoder?.stdin.end();
if (encode && from <= POSTER_T && to >= POSTER_T) {
  await page.evaluate((time) => {
    window.seek(time);
    return new Promise((shown) => requestAnimationFrame(() => requestAnimationFrame(shown)));
  }, POSTER_T);
  writeFileSync(poster, await page.screenshot({ type: "jpeg", quality: 92 }));
  console.log(`[reel] poster ${poster}`);
}
await browser.close();
await encoded;
console.log(encode ? `[reel] wrote ${out}` : `[reel] wrote ${frames * subframes} sub-frames to ${resolve(keep)}`);
