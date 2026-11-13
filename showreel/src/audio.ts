/**
 * The reel's soundtrack: 20 bars at 120 BPM, synthesised with the Web Audio
 * API in an OfflineAudioContext. No samples, no network — every sound is an
 * oscillator or seeded noise. The graph renders two stems, dry and reverb
 * send; the room itself, the final fade and the mastering to -14 LUFS (ITU-R
 * BS.1770 integrated, -1.8 dBFS ceiling) are plain arithmetic on the samples, so
 * the file is bit-identical on every run.
 *
 *   Bars 1–5   mountain wind, woodblock ticks, a rising sub-bass filter sweep
 *   Bar 6      808 drop, shutter snap, amber chime
 *   Bars 7–16  driving pulse, forest shakers, haptic clicks for every touch
 *   Bars 17–20 resonant sub tail, firefly chimes, fade to silence
 */
import { BAR, BEAT, DURATION, bar, hash, prng } from "./time.ts";

export const SAMPLE_RATE = 48000;
const TARGET_LUFS = -14;
/** Sample-peak ceiling. AAC encoding overshoots by about half a decibel, so this leaves the encoded track under -1 dBTP. */
const CEILING = 10 ** (-1.8 / 20);

const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);
const F1 = midi(29);

type Points = readonly (readonly [number, number])[];

export async function renderScore(): Promise<AudioBuffer> {
  const length = Math.round(DURATION * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(4, length, SAMPLE_RATE);
  const random = prng(0x7a11);

  /* ------------------------------- plumbing ------------------------------- */

  // Channels 0–1 carry the dry mix, 2–3 what is sent to the room.
  const stems = ctx.createChannelMerger(4);
  stems.connect(ctx.destination);
  const stem = (first: number): GainNode => {
    const bus = ctx.createGain();
    bus.channelCount = 2;
    bus.channelCountMode = "explicit";
    const split = ctx.createChannelSplitter(2);
    bus.connect(split);
    split.connect(stems, 0, first);
    split.connect(stems, 1, first + 1);
    return bus;
  };
  const out = stem(0);
  const room = stem(2);

  // Bass and pad duck under every kick.
  const duck = ctx.createGain();

  /**
   * A mix bus whose result does not depend on the order its inputs are summed
   * in. A plain Web Audio junction adds its inputs in an unspecified order, and
   * floating-point addition is not associative, so a busy bus differs in its
   * last bits from one render to the next. Here every voice is given a lane in
   * which nothing else sounds at the same time, and the lanes are then added
   * pairwise — only ever two live signals at a junction, which commutes exactly.
   */
  function lanes(): { input(from: number, to: number): AudioNode; join(target: AudioNode): void } {
    const all: { node: GainNode; busy: [number, number][] }[] = [];
    return {
      input(from, to) {
        let lane = all.find((l) => l.busy.every(([a, b]) => to <= a || from >= b));
        if (!lane) {
          lane = { node: ctx.createGain(), busy: [] };
          all.push(lane);
        }
        lane.busy.push([from, to]);
        return lane.node;
      },
      join(target) {
        let sum: AudioNode | null = null;
        for (const lane of all) {
          if (!sum) {
            sum = lane.node;
            continue;
          }
          const pair = ctx.createGain();
          sum.connect(pair);
          lane.node.connect(pair);
          sum = pair;
        }
        sum?.connect(target);
      },
    };
  }
  const dry = lanes();
  const ducked = lanes();
  const sends = lanes();

  /** Connects the end of a voice to the mix, and to the room, for the time it sounds. */
  function route(node: AudioNode, from: number, to: number, opts: { send?: number; ducked?: boolean } = {}): void {
    const start = Math.max(0, from);
    const end = to + 0.01;
    node.connect((opts.ducked ? ducked : dry).input(start, end));
    if (opts.send) {
      const send = ctx.createGain();
      send.gain.value = opts.send;
      node.connect(send).connect(sends.input(start, end));
    }
  }

  const noise = ctx.createBuffer(1, 4 * SAMPLE_RATE, SAMPLE_RATE);
  {
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  }

  /** Schedules an envelope on a parameter: [seconds after t, value] pairs. */
  function shape(param: AudioParam, t: number, points: Points, curve: "lin" | "exp" = "lin"): void {
    points.forEach(([dt, value], i) => {
      const at = Math.max(0, t + dt);
      const v = curve === "exp" ? Math.max(value, 1e-4) : value;
      if (i === 0) param.setValueAtTime(v, at);
      else if (curve === "exp") param.exponentialRampToValueAtTime(v, at);
      else param.linearRampToValueAtTime(v, at);
    });
  }

  /**
   * A gain stage with an envelope, panned, sent to the mix and (optionally) the
   * room. Linear envelopes end at zero; exponential ones end when their source
   * stops, a few hundredths later.
   */
  function voice(t: number, env: Points, opts: { pan?: number; send?: number; ducked?: boolean; curve?: "lin" | "exp" } = {}): GainNode {
    const gain = ctx.createGain();
    shape(gain.gain, t, env, opts.curve ?? "lin");
    const pan = ctx.createStereoPanner();
    pan.pan.value = opts.pan ?? 0;
    gain.connect(pan);
    const first = env[0]?.[0] ?? 0;
    const last = env[env.length - 1]?.[0] ?? 0;
    route(pan, t + first, t + last + (opts.curve === "exp" ? 0.07 : 0), opts);
    return gain;
  }

  function osc(type: OscillatorType, t: number, length: number, freq: Points, curve: "lin" | "exp" = "exp"): OscillatorNode {
    const node = ctx.createOscillator();
    node.type = type;
    shape(node.frequency, t, freq, curve);
    node.start(Math.max(0, t));
    node.stop(t + length);
    return node;
  }

  function hiss(t: number, length: number, seed: number): AudioBufferSourceNode {
    const node = ctx.createBufferSource();
    node.buffer = noise;
    node.loop = true;
    node.start(Math.max(0, t), hash(seed, 91) * 3.5);
    node.stop(t + length);
    return node;
  }

  function filter(type: BiquadFilterType, t: number, freq: Points, q = 0.7): BiquadFilterNode {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.Q.value = q;
    shape(node.frequency, t, freq, "exp");
    return node;
  }

  /* ------------------------------ instruments ----------------------------- */

  let serial = 0;

  function woodblock(t: number, level: number, pitch: number, pan = 0): void {
    osc("sine", t, 0.12, [[0, pitch * 1.25], [0.012, pitch], [0.1, pitch * 0.97]])
      .connect(voice(t, [[0, 0], [0.002, 0.5 * level], [0.09, 0]], { pan, send: 0.18 }));
    osc("sine", t, 0.08, [[0, pitch * 2.42]]).connect(voice(t, [[0, 0], [0.002, 0.16 * level], [0.05, 0]], { pan }));
    hiss(t, 0.03, serial++)
      .connect(filter("bandpass", t, [[0, pitch * 2]], 2.5))
      .connect(voice(t, [[0, 0.3 * level], [0.02, 0]], { pan }));
  }

  function impact(t: number, level: number): void {
    osc("sine", t, 0.7, [[0, 96], [0.09, 46], [0.6, 38]])
      .connect(voice(t, [[0, 0], [0.004, 0.9 * level], [0.16, 0.42 * level], [0.62, 0]]));
    hiss(t, 0.25, serial++)
      .connect(filter("lowpass", t, [[0, 900], [0.2, 120]]))
      .connect(voice(t, [[0, 0.5 * level], [0.22, 0]], { send: 0.3 }));
  }

  function whoosh(t: number, length: number, level: number, from: number, to: number, pan: readonly [number, number] = [0, 0]): void {
    const gain = ctx.createGain();
    shape(gain.gain, t, [[0, 0], [length * 0.6, level], [length, 0]]);
    const panner = ctx.createStereoPanner();
    shape(panner.pan, t, [[0, pan[0]], [length, pan[1]]]);
    hiss(t, length + 0.02, serial++).connect(filter("bandpass", t, [[0, from], [length, to]], 1.6)).connect(gain).connect(panner);
    route(panner, t, t + length, { send: 0.3 });
  }

  /** 808: a sine that falls onto its note, driven a little so it speaks on small speakers. */
  function sub808(t: number, level: number, length: number, note = F1): void {
    const stop = length + 0.05;
    const drive = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 2.2);
    drive.curve = curve;
    const body = ctx.createGain();
    shape(body.gain, t, [[0, 0.0001], [0.003, 1], [0.2, 0.85], [length, 0.06]], "exp");
    body.gain.linearRampToValueAtTime(0, t + length + 0.04);
    const trim = ctx.createGain();
    trim.gain.value = 0.62 * level;
    osc("sine", t, stop, [[0, note * 3.4], [0.085, note], [length, note * 0.98]]).connect(body).connect(drive).connect(trim);
    route(trim, t, t + stop);
    hiss(t, 0.02, serial++).connect(filter("highpass", t, [[0, 1800]])).connect(voice(t, [[0, 0.35 * level], [0.012, 0]]));
  }

  /** A leaf-shutter: two mechanical snaps a few hundredths apart. */
  function shutter(t: number): void {
    [[0, 1], [0.052, 0.62]].forEach(([dt, level], i) => {
      const at = t + (dt ?? 0);
      const l = level ?? 1;
      hiss(at, 0.03, serial++).connect(filter("highpass", at, [[0, 2600]])).connect(voice(at, [[0, 0.75 * l], [0.016, 0.08 * l], [0.028, 0]], { pan: i ? 0.12 : -0.12 }));
      hiss(at, 0.05, serial++).connect(filter("bandpass", at, [[0, 1750 - 380 * i]], 9)).connect(voice(at, [[0, 0.9 * l], [0.04, 0]]));
      osc("sine", at, 0.04, [[0, 3150 + 900 * i]]).connect(voice(at, [[0, 0.1 * l], [0.03, 0]]));
    });
  }

  /** A struck bell: five slightly stretched partials. */
  function chime(t: number, freq: number, level: number, pan = 0, decay = 3): void {
    [[1, 1, 1], [2, 0.5, 0.7], [3.01, 0.34, 0.5], [4.19, 0.2, 0.36], [5.43, 0.12, 0.26]].forEach(([ratio, amp, life]) => {
      const length = decay * (life ?? 1);
      osc("sine", t, length + 0.05, [[0, freq * (ratio ?? 1)]])
        .connect(voice(t, [[0, 0], [0.004, 0.2 * level * (amp ?? 1)], [length, 0.0001]], { pan, send: 0.7, curve: "exp" }));
    });
  }

  function kick(t: number, level: number): void {
    osc("sine", t, 0.34, [[0, 150], [0.07, 50], [0.3, 44]])
      .connect(voice(t, [[0, 0], [0.002, 0.95 * level], [0.09, 0.5 * level], [0.3, 0]]));
    hiss(t, 0.012, serial++).connect(filter("highpass", t, [[0, 3000]])).connect(voice(t, [[0, 0.22 * level], [0.008, 0]]));
    shape(duck.gain, t, [[-0.004, 1], [0.012, 0.38], [0.24, 1]]);
  }

  function shaker(t: number, level: number, pan: number): void {
    hiss(t, 0.09, serial++)
      .connect(filter("highpass", t, [[0, 5200]]))
      .connect(filter("bandpass", t, [[0, 7800]], 0.9))
      .connect(voice(t, [[0, 0], [0.006, 0.34 * level], [0.07, 0]], { pan, send: 0.08 }));
  }

  function bass(t: number, length: number, note: number, level: number): void {
    const tone = filter("lowpass", t, [[0, 260], [0.03, 1100], [length, 230]], 5);
    osc("sawtooth", t, length + 0.03, [[0, midi(note)]]).connect(tone);
    osc("square", t, length + 0.03, [[0, midi(note - 12)]]).connect(tone);
    tone.connect(voice(t, [[0, 0], [0.006, 0.2 * level], [length * 0.7, 0.14 * level], [length, 0]], { ducked: true }));
  }

  function pad(t: number, length: number, notes: readonly number[], level: number): void {
    notes.forEach((note, i) => {
      const tone = filter("lowpass", t, [[0, 500], [length * 0.5, 1500], [length, 600]], 0.8);
      osc("sawtooth", t, length + 0.4, [[0, midi(note) * 1.004]]).connect(tone);
      osc("sawtooth", t, length + 0.4, [[0, midi(note) * 0.996]]).connect(tone);
      tone.connect(voice(t, [[0, 0], [0.5, 0.045 * level], [length - 0.3, 0.04 * level], [length + 0.3, 0]], { ducked: true, pan: (i - 1) * 0.4, send: 0.5 }));
    });
  }

  /** Haptic click: a tiny tick with a soft thump under it. */
  function click(t: number, level: number, pan = 0): void {
    hiss(t, 0.012, serial++).connect(filter("bandpass", t, [[0, 2300]], 3)).connect(voice(t, [[0, 0.75 * level], [0.008, 0]], { pan }));
    osc("sine", t, 0.04, [[0, 210], [0.03, 150]]).connect(voice(t, [[0, 0.32 * level], [0.03, 0]], { pan }));
  }

  function firefly(t: number, freq: number, level: number, pan: number): void {
    osc("sine", t, 0.9, [[0, freq * 1.012], [0.05, freq]])
      .connect(voice(t, [[0, 0], [0.003, 0.13 * level], [0.8, 0.0001]], { pan, send: 0.9, curve: "exp" }));
  }

  /* ------------------------------ arrangement ----------------------------- */

  const drop = bar(6);

  // Bars 1–5: wind. Two bands of noise, breathing against each other.
  for (const [centre, pan, level] of [[310, -0.35, 1], [760, 0.4, 0.6]] as const) {
    const gain = ctx.createGain();
    shape(gain.gain, 0, [[0, 0], [1.2, 0.17 * level], [2.6, 0.22 * level], [5, 0.13 * level], [8, 0.26 * level], [drop - 0.12, 0.4 * level], [drop - 0.02, 0]]);
    const panner = ctx.createStereoPanner();
    shape(panner.pan, 0, [[0, pan], [5, -pan * 0.6], [drop, pan]]);
    hiss(0, drop, serial++)
      .connect(filter("bandpass", 0, [[0, centre * 0.7], [3, centre * 1.3], [6, centre * 0.85], [drop, centre * 2.1]], 1.1))
      .connect(gain)
      .connect(panner);
    route(panner, 0, drop, { send: 0.25 });
  }

  // Bars 1–5: the analogue sub sweep — a saw whose filter opens, then climbs into the drop.
  {
    const tone = filter("lowpass", 0, [[0, 55], [4, 120], [8, 420], [drop - 0.05, 2600]], 7);
    osc("sawtooth", 0, drop, [[0, F1], [bar(5), F1], [drop - 0.04, F1 * 2]]).connect(tone);
    osc("sawtooth", 0, drop, [[0, F1 * 1.006], [bar(5), F1 * 1.006], [drop - 0.04, F1 * 2.012]]).connect(tone);
    tone.connect(voice(0, [[0, 0], [2, 0.1], [6, 0.17], [drop - 0.1, 0.3], [drop - 0.03, 0]]));
  }

  // Bar 1: two ticks — the offline pill lighting, and its answer.
  woodblock(BEAT, 0.7, 920, 0.25);
  woodblock(3 * BEAT, 0.45, 700, -0.25);
  // Bar 2: three words, three downbeats.
  [0, 1, 2].forEach((i) => {
    impact(bar(2) + i * BEAT, 0.75 + 0.1 * i);
    woodblock(bar(2) + i * BEAT, 0.9, 760 + 90 * i);
  });
  woodblock(bar(2) + 3 * BEAT, 0.5, 700, 0.2);
  // Bars 3–4: eighths. Bar 5: sixteenths, rising into the drop.
  for (let i = 0; i < 16; i++) {
    woodblock(bar(3) + i * (BEAT / 2), [1, 0.4, 0.62, 0.4][i % 4] ?? 0.4, i % 2 ? 720 : 950, i % 2 ? 0.3 : -0.3);
  }
  for (let i = 0; i < 15; i++) {
    woodblock(bar(5) + i * (BEAT / 4), 0.38 + 0.045 * i, 820 + 44 * i, i % 2 ? 0.25 : -0.25);
  }
  // Bar 3: the thumb through the canes. Bar 5: the whip into the camera.
  whoosh(4.2, 1.5, 0.16, 500, 3400, [-0.7, 0.7]);
  [4.5, 4.78, 5.0, 5.2, 5.42, 5.7].forEach((t, i) => firefly(t, midi([84, 87, 89, 91, 94, 96][i] ?? 84), 0.7, -0.6 + 0.24 * i));
  whoosh(bar(5) - 0.14, 0.34, 0.5, 350, 5200, [0.8, -0.6]);
  whoosh(bar(5), 1.9, 0.22, 260, 2400);

  // Bar 6: the drop. Shutter, 808, amber chime — then the verdict coming down.
  shutter(drop);
  sub808(drop, 1, 1.9);
  [[77, 0, -0.3], [84, 0.03, 0.3], [91, 0.065, 0]].forEach(([note, dt, pan]) => chime(drop + (dt ?? 0), midi(note ?? 77), 1, pan ?? 0, 3.4));
  impact(drop + BEAT, 0.8);
  woodblock(drop + BEAT, 0.8, 560);
  woodblock(drop + 2 * BEAT, 0.5, 620, 0.2);
  click(drop + 3 * BEAT, 0.5);
  pad(drop, BAR, [53, 60, 65], 0.8);

  // Bars 7–16: the pulse. i – VI – III – VII – i in F minor, two bars each.
  const roots = [29, 25, 32, 27, 29];
  const chords = [[53, 56, 60], [49, 53, 56], [56, 60, 63], [51, 55, 58], [53, 56, 60]] as const;
  const riff = [0, 0, 12, 0, 0, 7, 0, 12];
  for (let b = 7; b <= 16; b++) {
    const start = bar(b);
    const step = Math.floor((b - 7) / 2);
    const root = roots[step] ?? 29;
    if ((b - 7) % 2 === 0) pad(start, 2 * BAR, chords[step] ?? chords[0], 1);
    for (let i = 0; i < 4; i++) {
      const lastBeat = b === 16 && i === 3;
      if (!lastBeat) kick(start + i * BEAT, i === 0 ? 1 : 0.86);
      if (i % 2 === 1) woodblock(start + i * BEAT, 0.5, 540, 0.15);
    }
    for (let i = 0; i < 8; i++) {
      if (b === 16 && i >= 7) break;
      bass(start + i * (BEAT / 2), BEAT / 2 - 0.02, root + (riff[i] ?? 0) + 12, i % 2 ? 0.8 : 1);
    }
    for (let i = 0; i < 16; i++) {
      if (b === 16 && i >= 14) break;
      const accent = [0.55, 0.26, 0.42, 0.26][i % 4] ?? 0.3;
      shaker(start + i * (BEAT / 4), accent * (0.85 + 0.3 * hash(b * 16 + i, 5)), i % 2 ? 0.38 : -0.38);
    }
  }
  whoosh(bar(17) - 1, 0.98, 0.3, 500, 6400); // the last bar of the pulse leans into the cut

  // Haptics and Foley, on the frame each touch lands.
  whoosh(bar(7) + 0.28, 0.4, 0.2, 900, 300, [0.6, 0]); // the hazard card
  osc("sine", bar(7) + 0.45, 0.7, [[0, 116.5]], "lin").connect(voice(bar(7) + 0.45, [[0, 0], [0.02, 0.2], [0.6, 0]], { send: 0.3 }));
  click(bar(8) + 0.3, 0.6);
  impact(bar(8) + BEAT, 0.45);
  [0, 1, 2].forEach((i) => {
    const t = bar(9) + (1 + i) * BEAT; // checklist ticks
    click(t, 0.9, -0.2);
    chime(t, midi(89 + ([0, 3, 7][i] ?? 0)), 0.3, 0.2, 0.7);
  });
  click(bar(10), 0.7);
  whoosh(bar(10), 0.45, 0.24, 300, 1800); // the drawer
  for (let i = 0, t = bar(10) + 0.5; t < bar(11) - 0.14; i++) {
    click(t, 0.1 + 0.08 * hash(i, 11), -0.5 + hash(i, 12)); // tokens
    t += 0.04 + 0.035 * hash(i, 13);
  }
  [[80, 0], [87, 0.05]].forEach(([note, dt]) => chime(bar(11) + (dt ?? 0), midi(note ?? 80), 0.55, 0, 1.6)); // valid JSON
  whoosh(bar(12) - 0.05, 0.4, 0.2, 1600, 320);
  click(23.3, 0.9);
  for (const hz of [697, 1209]) osc("sine", 23.3, 0.12, [[0, hz]]).connect(voice(23.3, [[0, 0], [0.004, 0.045], [0.09, 0.045], [0.11, 0]])); // a dial tone's worth of intent
  click(24.5, 0.9);
  for (let i = 0; i < 14; i++) click(24.56 + i * 0.036, 0.1 + 0.05 * hash(i, 21), -0.4 + 0.06 * i); // the fingerprint resolving
  [[84, 0], [89, 0.09]].forEach(([note, dt]) => chime(25.12 + (dt ?? 0), midi(note ?? 84), 0.42, 0.1, 1.2)); // written
  chime(bar(14), midi(84), 0.4, -0.2, 1.4); // match cut
  click(28.5, 0.9);
  whoosh(28.55, 1.2, 0.26, 240, 2600, [0, 0]);
  chime(bar(16), midi(77), 0.32, 0.2, 1.8);

  // Bars 17–19: three push-cuts, each on a long sub.
  [0, 1, 2].forEach((i) => {
    const t = bar(17 + i);
    sub808(t, 0.95 - 0.08 * i, i === 2 ? 3.4 : 1.95);
    impact(t, 0.7);
    chime(t, midi([77, 80, 84][i] ?? 77), 0.6, [-0.3, 0.3, 0][i] ?? 0, 2.6);
  });
  pad(bar(17), 3 * BAR + 1.2, [53, 60, 65], 1.5); // a held open fifth under the tail
  // Bars 19–20: the lockup's amber chime, the highlight crossing the berries, the sign-off.
  [[77, 0], [84, 0.05], [91, 0.1], [96, 0.16]].forEach(([note, dt], i) => chime(bar(19) + 0.85 + (dt ?? 0), midi(note ?? 77), 0.85, -0.3 + 0.2 * i, 3.6));
  for (let i = 0; i < 9; i++) firefly(bar(19) + 1.4 + i * 0.06, midi(89 + ([0, 3, 5, 7, 10, 12, 15, 17, 19][i] ?? 0)), 0.55, -0.6 + 0.15 * i);
  impact(bar(20), 0.5);
  impact(bar(20) + BEAT, 0.42);
  chime(bar(20) + 2 * BEAT, midi(96), 0.4, 0, 1.6);
  // Fireflies: sparse, seeded, pentatonic, drifting across the field.
  const scale = [89, 92, 94, 96, 99, 101, 104];
  for (let i = 0, t = bar(17) + 0.4; t < bar(20) + 1.1; i++) {
    firefly(t, midi(scale[Math.floor(hash(i, 31) * scale.length)] ?? 96), 0.5 + 0.5 * hash(i, 32), hash(i, 33) * 1.6 - 0.8);
    t += 0.16 + 0.42 * hash(i, 34);
  }
  // The tail: a faint wind returns under the last bars.
  {
    const gain = voice(bar(17), [[0, 0], [1.5, 0.07], [5, 0.09], [7.6, 0]], { send: 0.4 });
    hiss(bar(17), 7.8, serial++).connect(filter("bandpass", bar(17), [[0, 420], [4, 700], [7.8, 380]], 1.1)).connect(gain);
  }

  dry.join(out);
  ducked.join(duck);
  duck.connect(out);
  sends.join(room);

  const rendered = await ctx.startRendering();

  // The room, the fade and the master are computed here, sample by sample.
  const mix = new AudioBuffer({ length, numberOfChannels: 2, sampleRate: SAMPLE_RATE });
  const wet = reverb(rendered.getChannelData(2), rendered.getChannelData(3));
  const fadeFrom = (bar(20) + 0.5) * SAMPLE_RATE;
  const fadeTo = (DURATION - 0.08) * SAMPLE_RATE;
  for (let channel = 0; channel < 2; channel++) {
    const dry = rendered.getChannelData(channel);
    const room = wet[channel] ?? dry;
    const data = mix.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const fade = i <= fadeFrom ? 1 : i >= fadeTo ? 0 : 1 - (i - fadeFrom) / (fadeTo - fadeFrom); // clean fade to silence
      data[i] = ((dry[i] ?? 0) + (room[i] ?? 0)) * fade;
    }
  }
  master(mix);
  return mix;
}

/**
 * A small room: eight damped feedback combs into four all-passes per side
 * (the Schroeder–Moorer layout), about two seconds of tail.
 */
function reverb(left: Float32Array, right: Float32Array): [Float32Array, Float32Array] {
  const combs = [1215, 1293, 1390, 1476, 1548, 1623, 1695, 1760];
  const passes = [605, 480, 371, 245];
  const feedback = 0.9;
  const damp = 0.28;
  const n = left.length;
  const input = new Float32Array(n);
  for (let i = 0; i < n; i++) input[i] = ((left[i] ?? 0) + (right[i] ?? 0)) * 0.028;

  const side = (spread: number): Float32Array => {
    const sum = new Float32Array(n);
    for (const size of combs) {
      const line = new Float32Array(size + spread);
      let at = 0;
      let low = 0;
      for (let i = 0; i < n; i++) {
        const y = line[at] ?? 0;
        low = y * (1 - damp) + low * damp;
        line[at] = (input[i] ?? 0) + low * feedback;
        at = at + 1 === line.length ? 0 : at + 1;
        sum[i] = (sum[i] ?? 0) + y;
      }
    }
    for (const size of passes) {
      const line = new Float32Array(size + spread);
      let at = 0;
      for (let i = 0; i < n; i++) {
        const delayed = line[at] ?? 0;
        const x = sum[i] ?? 0;
        line[at] = x + delayed * 0.5;
        at = at + 1 === line.length ? 0 : at + 1;
        sum[i] = delayed - x;
      }
    }
    return sum;
  };
  return [side(0), side(25)];
}

/* ------------------------------------------------------------------------- */
/* Mastering                                                                  */
/* ------------------------------------------------------------------------- */

/** Integrated loudness of a 48 kHz buffer, ITU-R BS.1770-4 (K-weighting, gated). */
export function loudness(buffer: AudioBuffer): number {
  const block = Math.round(0.4 * buffer.sampleRate);
  const hop = Math.round(0.1 * buffer.sampleRate);
  const blocks = Math.max(0, Math.floor((buffer.length - block) / hop) + 1);
  const energy = new Float64Array(blocks);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const x = buffer.getChannelData(channel);
    // K-weighting at 48 kHz: a high shelf, then a high-pass.
    const squared = new Float64Array(x.length);
    let a1 = 0, a2 = 0, b1 = 0, b2 = 0, c1 = 0, c2 = 0, d1 = 0, d2 = 0;
    for (let i = 0; i < x.length; i++) {
      const s = x[i] ?? 0;
      const shelf = 1.53512485958697 * s - 2.69169618940638 * a1 + 1.19839281085285 * a2 + 1.69065929318241 * b1 - 0.73248077421585 * b2;
      a2 = a1; a1 = s; b2 = b1; b1 = shelf;
      const high = shelf - 2 * c1 + c2 + 1.99004745483398 * d1 - 0.99007225036621 * d2;
      c2 = c1; c1 = shelf; d2 = d1; d1 = high;
      squared[i] = high * high;
    }
    for (let j = 0; j < blocks; j++) {
      let sum = 0;
      for (let i = j * hop, end = i + block; i < end; i++) sum += squared[i] ?? 0;
      energy[j] = (energy[j] ?? 0) + sum / block;
    }
  }

  const lufs = (e: number): number => -0.691 + 10 * Math.log10(Math.max(e, 1e-12));
  const mean = (list: number[]): number => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  const absolute = Array.from(energy).filter((e) => lufs(e) > -70);
  const relative = lufs(mean(absolute)) - 10;
  return lufs(mean(absolute.filter((e) => lufs(e) > relative)));
}

function peak(buffer: AudioBuffer): number {
  let max = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const x = buffer.getChannelData(channel);
    for (let i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i] ?? 0));
  }
  return max;
}

/** A look-ahead limiter: gain is pulled down ahead of every peak and released smoothly. */
function limit(buffer: AudioBuffer, ceiling: number): void {
  const n = buffer.length;
  const reach = Math.round(0.004 * buffer.sampleRate);
  const need = new Float32Array(n).fill(1);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const x = buffer.getChannelData(channel);
    for (let i = 0; i < n; i++) {
      const a = Math.abs(x[i] ?? 0);
      if (a > ceiling) need[i] = Math.min(need[i] ?? 1, ceiling / a);
    }
  }
  // Hold the lowest gain across the look-ahead window (a sliding minimum), then smooth it.
  const held = new Float32Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let i = 0, next = 0; i < n; i++) {
    for (const end = Math.min(n - 1, i + reach); next <= end; next++) {
      while (tail > head && (need[queue[tail - 1] ?? 0] ?? 1) >= (need[next] ?? 1)) tail--;
      queue[tail++] = next;
    }
    while ((queue[head] ?? 0) < i - reach) head++;
    held[i] = need[queue[head] ?? 0] ?? 1;
  }
  const smooth = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += held[i] ?? 1;
    if (i >= reach) sum -= held[i - reach] ?? 1;
    smooth[i] = Math.min(held[i] ?? 1, sum / Math.min(i + 1, reach));
  }
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const x = buffer.getChannelData(channel);
    for (let i = 0; i < n; i++) x[i] = (x[i] ?? 0) * (smooth[i] ?? 1);
  }
}

/** Brings the mix to -14 LUFS integrated under the sample-peak ceiling. */
function master(buffer: AudioBuffer): void {
  for (let pass = 0; pass < 6; pass++) {
    const gain = 10 ** ((TARGET_LUFS - loudness(buffer)) / 20);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const x = buffer.getChannelData(channel);
      for (let i = 0; i < x.length; i++) x[i] = (x[i] ?? 0) * gain;
    }
    if (peak(buffer) <= CEILING && Math.abs(20 * Math.log10(gain)) < 0.05) break;
    limit(buffer, CEILING);
  }
}

/** 16-bit PCM WAV, with the measured loudness and peak of what was written. */
export function encodeWav(buffer: AudioBuffer): { wav: Uint8Array; lufs: number; peakDb: number } {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = new Uint8Array(44 + frames * channels * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, frames * channels * 2, true);
  // Seeded triangular dither, so the file is bit-identical between runs.
  const random = prng(0xd17e);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  for (let i = 0, at = 44; i < frames; i++) {
    for (let c = 0; c < channels; c++, at += 2) {
      const dither = (random() - random()) / 32768;
      const sample = Math.max(-1, Math.min(1, (data[c]?.[i] ?? 0) + dither));
      view.setInt16(at, Math.round(sample * 32767), true);
    }
  }
  return { wav: bytes, lufs: loudness(buffer), peakDb: 20 * Math.log10(Math.max(peak(buffer), 1e-9)) };
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
