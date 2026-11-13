/**
 * Landing page behaviour (index.html): the shared thicket, the generated
 * forest soundscape, and one set of interactions reached by mouse or by touch.
 */
import { bindThicketInput, createThicket, type Thicket } from "../thicket/engine.ts";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const touchFirst = window.matchMedia("(hover: none)").matches;

/* ------------------------------------------------------------------------- */
/* Ambient sound — generated, never fetched. Starts only on a tap.            */
/* Breeze: slow-swelling brown noise. Stream: a narrow, fluttering band.      */
/* Brambles: short high-band rustles at irregular moments.                    */
/* ------------------------------------------------------------------------- */
interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function createSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let lowpass: BiquadFilterNode | null = null;
  let rustleGain: GainNode | null = null;
  let rustleTimer = 0;
  let on = false;

  function noiseBuffer(audio: AudioContext, brown: boolean): AudioBuffer {
    const length = audio.sampleRate * 5;
    const buffer = audio.createBuffer(2, length, audio.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.4;
        } else data[i] = white;
      }
      // Blend the tail into the head so the loop point is inaudible.
      const fade = Math.floor(audio.sampleRate * 0.25);
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        data[length - fade + i] = (data[length - fade + i] ?? 0) * (1 - k) + (data[i] ?? 0) * k;
      }
    }
    return buffer;
  }
  function loop(audio: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
  }
  function lfo(audio: AudioContext, freq: number, depth: number, target: AudioParam) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.frequency.value = freq;
    amp.gain.value = depth;
    osc.connect(amp).connect(target);
    osc.start();
  }
  function scheduleRustle() {
    if (!on || !ctx || !rustleGain) return;
    const t = ctx.currentTime;
    const peak = 0.025 + Math.random() * 0.05;
    const len = 0.5 + Math.random() * 1.1;
    rustleGain.gain.cancelScheduledValues(t);
    rustleGain.gain.setValueAtTime(0.0001, t);
    rustleGain.gain.linearRampToValueAtTime(peak, t + len * 0.3);
    rustleGain.gain.linearRampToValueAtTime(peak * 0.45, t + len * 0.55);
    rustleGain.gain.linearRampToValueAtTime(peak * 0.8, t + len * 0.7);
    rustleGain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    rustleTimer = window.setTimeout(scheduleRustle, 1800 + Math.random() * 5200);
  }
  function build(): boolean {
    const AC = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AC) return false;
    const audio = new AC();
    ctx = audio;
    master = audio.createGain();
    master.gain.value = 0;
    master.connect(audio.destination);
    lowpass = audio.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 16000;
    lowpass.Q.value = 0.5;
    lowpass.connect(master);
    const brown = noiseBuffer(audio, true);
    const white = noiseBuffer(audio, false);

    // Mountain breeze
    const breezeBand = audio.createBiquadFilter();
    breezeBand.type = "bandpass";
    breezeBand.frequency.value = 420;
    breezeBand.Q.value = 0.55;
    const breezeGain = audio.createGain();
    breezeGain.gain.value = 0.55;
    loop(audio, brown).connect(breezeBand).connect(breezeGain).connect(lowpass);
    lfo(audio, 0.07, 0.24, breezeGain.gain);
    lfo(audio, 0.043, 0.12, breezeGain.gain);
    lfo(audio, 0.11, 170, breezeBand.frequency);

    // Distant stream
    const streamHigh = audio.createBiquadFilter();
    streamHigh.type = "highpass";
    streamHigh.frequency.value = 900;
    const streamBand = audio.createBiquadFilter();
    streamBand.type = "bandpass";
    streamBand.frequency.value = 2300;
    streamBand.Q.value = 1.3;
    const streamGain = audio.createGain();
    streamGain.gain.value = 0.045;
    loop(audio, white).connect(streamHigh).connect(streamBand).connect(streamGain).connect(lowpass);
    lfo(audio, 6.3, 420, streamBand.frequency);
    lfo(audio, 3.7, 260, streamBand.frequency);
    lfo(audio, 0.19, 0.015, streamGain.gain);

    // Rustling brambles
    const rustleBand = audio.createBiquadFilter();
    rustleBand.type = "bandpass";
    rustleBand.frequency.value = 5200;
    rustleBand.Q.value = 0.8;
    rustleGain = audio.createGain();
    rustleGain.gain.value = 0;
    loop(audio, white).connect(rustleBand).connect(rustleGain).connect(lowpass);
    lfo(audio, 11, 0.012, rustleGain.gain);
    return true;
  }

  return {
    toggle(): boolean {
      if (!ctx && !build()) return false;
      if (!ctx || !master) return false;
      on = !on;
      if (on) {
        void ctx.resume();
        scheduleRustle();
      } else window.clearTimeout(rustleTimer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, on ? 0.9 : 0.35);
      return on;
    },
    /** Muffle through the low-pass while a transition holds the scene. */
    muffle(active: boolean) {
      if (!ctx || !lowpass) return;
      lowpass.frequency.cancelScheduledValues(ctx.currentTime);
      lowpass.frequency.setTargetAtTime(active ? 480 : 16000, ctx.currentTime, active ? 0.28 : 0.5);
    },
    pause(hidden: boolean) {
      if (!ctx || !on) return;
      void (hidden ? ctx.suspend() : ctx.resume());
    },
  };
}

/* ------------------------------------------------------------------------- */
/* Scene + interaction                                                        */
/* ------------------------------------------------------------------------- */
const sound = createSound();
const canvas = document.querySelector<HTMLCanvasElement>("#thicket");
const scene: Thicket | null = canvas ? createThicket(canvas, { resume: true }) : null;
if (scene) document.documentElement.classList.add("gl-ready");

/* The "hover transition": flight eases to a stop, fruit disperses into embers,
   sound muffles. Any number of sources can hold it open. */
const holders = new Set<string>();
function startHoverTransition(source = "manual") {
  holders.add(source);
  scene?.setTransition(true);
  sound.muffle(true);
}
function endHoverTransition(source = "manual") {
  holders.delete(source);
  if (holders.size > 0) return;
  scene?.setTransition(false);
  sound.muffle(false);
}
Object.assign(window, { startHoverTransition, endHoverTransition });

const ambient = document.querySelector(".ambient");
const onScroll = (y: number) => {
  ambient?.classList.toggle("is-walking", y > window.innerHeight * 0.35);
};
if (scene) bindThicketInput(scene, onScroll);
else {
  const update = () => onScroll(window.scrollY || 0);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

// Desktop: hover or keyboard focus on the invitation, the pills and the cards.
document.querySelectorAll<HTMLElement>("[data-transition]").forEach((el, i) => {
  const id = `el-${i}`;
  if (!touchFirst) {
    el.addEventListener("pointerenter", () => startHoverTransition(id));
    el.addEventListener("pointerleave", () => endHoverTransition(id));
  }
  el.addEventListener("focusin", () => {
    if (el.matches(":focus-visible, :has(:focus-visible)")) startHoverTransition(`${id}-focus`);
  });
  el.addEventListener("focusout", () => endHoverTransition(`${id}-focus`));
});

// Touch: press and hold the invitation…
const cta = document.querySelector<HTMLElement>(".cta");
let ctaTimer = 0;
if (cta) {
  cta.addEventListener(
    "touchstart",
    () => {
      window.clearTimeout(ctaTimer);
      cta.classList.add("is-held");
      startHoverTransition("cta-touch");
    },
    { passive: true },
  );
  const ctaRelease = () => {
    ctaTimer = window.setTimeout(() => {
      cta.classList.remove("is-held");
      endHoverTransition("cta-touch");
    }, 650);
  };
  cta.addEventListener("touchend", ctaRelease, { passive: true });
  cta.addEventListener("touchcancel", ctaRelease, { passive: true });
}

// …or simply scroll a card into the middle 40% of the screen.
if ("IntersectionObserver" in window) {
  const centred = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-centered", touchFirst && entry.isIntersecting);
        if (entry.isIntersecting) centred.add(entry.target);
        else centred.delete(entry.target);
      }
      if (!touchFirst) return;
      if (centred.size > 0) startHoverTransition("centred-card");
      else endHoverTransition("centred-card");
    },
    { rootMargin: "-30% 0px -30% 0px", threshold: 0 },
  );
  document.querySelectorAll(".card").forEach((card) => observer.observe(card));
}

// Gyroscope parallax. iOS only hands this out after a tap, so the request rides
// on the first press of the invitation or the sound button — never on page load.
interface OrientationPermission {
  requestPermission?: () => Promise<string>;
}
let gyroBound = false;
let beta0: number | null = null;
function bindGyro() {
  if (gyroBound || !("DeviceOrientationEvent" in window)) return;
  gyroBound = true;
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma === null || e.beta === null || reducedMotion.matches) return;
    if (beta0 === null) beta0 = e.beta;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    scene?.tilt(clamp(e.gamma / 35), clamp((beta0 - e.beta) / 35));
  });
}
function requestGyro() {
  if (!("DeviceOrientationEvent" in window)) return;
  const permission = (window.DeviceOrientationEvent as unknown as OrientationPermission).requestPermission;
  if (typeof permission === "function") {
    permission()
      .then((state) => {
        if (state === "granted") bindGyro();
      })
      .catch(() => undefined);
  } else bindGyro();
}
if (
  "DeviceOrientationEvent" in window &&
  typeof (window.DeviceOrientationEvent as unknown as OrientationPermission).requestPermission !== "function"
) {
  bindGyro();
}

// Sound toggle: muted until asked.
const soundButton = document.querySelector<HTMLButtonElement>("#sound");
soundButton?.addEventListener("click", () => {
  const on = sound.toggle();
  soundButton.setAttribute("aria-pressed", String(on));
  soundButton.setAttribute("aria-label", on ? "Ambient forest sound: on" : "Ambient forest sound: off");
  requestGyro();
});
cta?.addEventListener("click", requestGyro);

document.addEventListener("visibilitychange", () => sound.pause(document.visibilityState !== "visible"));
