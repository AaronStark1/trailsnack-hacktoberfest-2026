/**
 * TrailSnack showcase reel — a standalone, deterministic render harness.
 *
 *   window.seek(t)        paint the frame for time t (seconds, 0 … 40)
 *   window.reel.audio()   render the 120 BPM score and return it as a WAV (base64)
 *
 * Every frame is a pure function of t: seek() rebuilds the thicket's camera,
 * the scene graph's styles and the token stream from the timestamp alone, so
 * frames can be captured in any order, on any machine, and blended as
 * sub-frames for motion blur. The preview transport below only supplies a
 * clock; it is absent in capture mode (?capture).
 */
import "./reel.css";
import { encodeWav, renderScore, toBase64 } from "./audio.ts";
import { buildStage, type Stills } from "./scenes.ts";
import { createFilms, finderFrame, mainFrame, mainOpacity, portraitFrame } from "./thicket.ts";
import { DURATION, H, SCALE, W, bar, clamp } from "./time.ts";
import type { ThicketFrame } from "../../src/thicket/engine.ts";

interface ReelApi {
  duration: number;
  fps: number;
  width: number;
  height: number;
  seek(t: number): void;
  /** The score as a 48 kHz stereo WAV, base64-encoded, mixed to -14 LUFS. */
  audio(): Promise<{ wav: string; lufs: number; peakDb: number }>;
}

declare global {
  interface Window {
    reel: ReelApi;
    seek(t: number): void;
    reelReady: boolean;
  }
}

const capture = new URLSearchParams(location.search).has("capture");
const host = document.getElementById("stage") as HTMLDivElement;

async function boot(): Promise<void> {
  const main = document.createElement("canvas");
  const finder = document.createElement("canvas");
  const films = createFilms(main, finder);
  if (!films) {
    host.innerHTML = `<p style="padding:24px;font:500 16px system-ui;color:#f5efe2">This reel needs WebGL2 to render the thicket.</p>`;
    return;
  }

  // Stills: the frame the shutter catches, and three earlier finds. Each is one
  // fixed frame of the finder film, so they are the same on every run.
  const sheet = document.createElement("canvas");
  sheet.width = sheet.height = 640;
  const pen = sheet.getContext("2d");
  const still = (frame: ThicketFrame): string => {
    films.finder.render(frame);
    pen?.drawImage(finder, 0, 0, sheet.width, sheet.height);
    return sheet.toDataURL("image/jpeg", 0.92);
  };
  const stills: Stills = {
    specimen: still(finderFrame(films.finder, bar(6))),
    cloudberry: still(portraitFrame(films.finder, "cloudberry", 1)),
    elderberry: still(portraitFrame(films.finder, "elderberry", 0)),
    currant: still(portraitFrame(films.finder, "currant", 1)),
  };

  // Lay the stage out once so the browser fetches every face the text needs,
  // then again for real: all measurements are taken with the final fonts.
  buildStage(host, stills, { main, finder });
  await document.fonts.ready;
  const stage = buildStage(host, stills, { main, finder });

  function seek(time: number): void {
    const t = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
    stage.update(t);
    films?.main.render(mainFrame(films.main, t));
    main.style.opacity = mainOpacity(t).toFixed(4);
    // The camera feed is only on screen during bar 5.
    if (t >= bar(5) - 0.1 && t < bar(6)) films?.finder.render(finderFrame(films.finder, t));
  }

  let score: Promise<AudioBuffer> | null = null;
  const audio = (): Promise<AudioBuffer> => (score ??= renderScore());

  window.seek = seek;
  window.reel = {
    duration: DURATION,
    fps: 60,
    width: W * SCALE,
    height: H * SCALE,
    seek,
    async audio() {
      const buffer = await audio();
      const { wav, lufs, peakDb } = encodeWav(buffer);
      return { wav: toBase64(wav), lufs, peakDb };
    },
  };

  seek(0);
  if (!capture) transport(seek, audio);
  window.reelReady = true;
}

/** Preview only: fit the stage to the window and play it against the score. */
function transport(seek: (t: number) => void, audio: () => Promise<AudioBuffer>): void {
  const fit = (): void => {
    const scale = Math.min(innerWidth / W, (innerHeight - 64) / H);
    host.style.transform = `translate(${((innerWidth - W * scale) / 2).toFixed(1)}px, ${Math.max(0, (innerHeight - 64 - H * scale) / 2).toFixed(1)}px) scale(${scale.toFixed(4)})`;
  };
  fit();
  addEventListener("resize", fit);

  const bar = document.createElement("div");
  bar.id = "transport";
  bar.innerHTML = `<button type="button">Play</button><input type="range" min="0" max="${DURATION}" step="0.001" value="0" aria-label="Time" /><span>00.00 / ${DURATION.toFixed(2)}</span>`;
  document.body.append(bar);
  const button = bar.querySelector("button") as HTMLButtonElement;
  const slider = bar.querySelector("input") as HTMLInputElement;
  const readout = bar.querySelector("span") as HTMLSpanElement;

  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let startedAt = 0;
  let offset = 0;
  let playing = false;

  const show = (t: number): void => {
    seek(t);
    slider.value = String(t);
    readout.textContent = `${t.toFixed(2).padStart(5, "0")} / ${DURATION.toFixed(2)}`;
  };
  const stop = (): void => {
    playing = false;
    source?.stop();
    source = null;
    button.textContent = "Play";
  };
  const tick = (): void => {
    if (!playing || !context) return;
    const t = offset + context.currentTime - startedAt;
    if (t >= DURATION) {
      stop();
      offset = 0;
      show(DURATION);
      return;
    }
    show(t);
    requestAnimationFrame(tick);
  };
  button.addEventListener("click", async () => {
    if (playing) {
      offset += (context?.currentTime ?? 0) - startedAt;
      stop();
      return;
    }
    button.textContent = "Rendering score…";
    const buffer = await audio();
    context ??= new AudioContext();
    await context.resume();
    if (offset >= DURATION) offset = 0;
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0, offset);
    startedAt = context.currentTime;
    playing = true;
    button.textContent = "Pause";
    requestAnimationFrame(tick);
  });
  slider.addEventListener("input", () => {
    if (playing) stop();
    offset = Number(slider.value);
    show(offset);
  });
}

void boot();
