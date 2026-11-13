# TrailSnack showcase reel

*"The offline trail companion that never says 'eat this.'"*

| | |
|---|---|
| Frame | 1080 × 1920 (9:16), 60 fps |
| Length | 40.0 s — 20 bars at 120 BPM (2.0 s per bar, 0.5 s per beat) |
| Specimen | Wild strawberry (*Fragaria vesca*) against bittersweet nightshade (*Solanum dulcamara*) |
| Device state | Airplane mode, 0 bars, offline fix at 32°14'42"N 77°10'33"E • 2,480 m |
| Score | Synthesised in the page, 48 kHz stereo, −14.0 LUFS integrated, −1.0 dBTP in the encoded file |

## Render it

The finished reel is `docs/trailsnack-showreel.mp4` (1080 × 1920, 60 fps, H.264 + AAC, 29 MB),
with its poster beside it.

```sh
cd showreel
npm install      # once: ffmpeg-static (the app's own packages come from the repo root)
npm run build    # dist/trailsnack-reel.html — one file, no network, opens from disk
npm run render   # ../docs/trailsnack-showreel.mp4 and ../docs/trailsnack-showreel-poster.jpg
```

Open `showreel/dist/trailsnack-reel.html` in a browser to preview: **Play** renders the score
and runs the timeline against it; the slider scrubs to any frame.

`render.mjs` drives headless Chromium at 432 × 768 CSS px and a device scale of 2.5, calls
`window.seek(t)` for three sub-frames per output frame (180 per second), and pipes the PNGs
into `ffmpeg … tmix=frames=3`, which averages each group of three into one motion-blurred
frame and muxes the score. A full render is 7,200 captures at about 0.3 s each on an M4 —
roughly 35 minutes in all. Useful options: `--from 8 --to 12`, `--subframes 1`, `--audio-only`,
`--frames <dir> --no-encode` (capture only, no ffmpeg). See the header of `render.mjs`.

## How it is built

| File | Role |
|---|---|
| `src/main.ts` | Boot, `window.seek(t)`, `window.reel.audio()`, preview transport |
| `src/time.ts` | The clock (bars, beats), easing, seeded hash and PRNG |
| `src/thicket.ts` | Camera work: a complete `ThicketFrame` for any timestamp |
| `src/touch.ts` | The hiker's thumb: one sweep and nine taps |
| `src/ui.ts` | The app's screens as markup, using the app's own class recipes and Lucide paths |
| `src/scenes.ts` | The scene graph and `update(t)`, which sets every animated property |
| `src/audio.ts` | The score, the room reverb, and mastering to −14 LUFS |
| `../src/thicket/engine.ts` | `createThicketFilm()`: the app's thicket as a pure function of a frame |

**Every frame is a function of `t` alone.** `seek(t)` computes the thicket's camera, wake and
uniforms, and writes absolute values for every opacity, transform and text node; nothing reads
the previous frame, and no CSS animation or transition runs (`reel.css` disables them all).
The engine's live loop is untouched; the reel uses a second entry point,
`createThicketFilm()`, that shares its shaders and geometry but has no clock, no listeners and
no state.

**What "deterministic" was measured to mean**

- Score: bit-identical across runs (same SHA-256 on three consecutive renders). A plain Web
  Audio mix bus is *not* reproducible — it sums its inputs in an unspecified order — so voices
  are routed through lanes that never overlap and are added pairwise, and the reverb, fade and
  master are plain arithmetic on the rendered stems.
- Loudness meter: reads −22.99 and −32.99 LUFS on the EBU Tech 3341 reference tones
  (−23 and −33 dBFS, 1 kHz stereo).
- Picture: capturing the same timestamps in different orders and on fresh pages gave
  bit-identical PNGs for about half the frames sampled; the rest differed on at most 0.04 % of
  pixels, almost all by 1/255, along anti-aliased edges. That is the GPU compositor's rounding,
  not timeline state, and it does not survive video encoding.

## Timeline

Stage coordinates are CSS pixels on a 432 × 768 phone; the status bar and the frosted header
respect a 44 px top inset, and the dock sits above a 30 px bottom inset.

### Bars 1–2 · 00:00–00:04 · The zero-signal hook

| Time | Picture | Sound |
|---|---|---|
| 00:00 | Pitch forest obsidian. The thicket is present only as drifting embers behind a 90 % veil | Mountain wind begins; a sub-bass saw, filter closed |
| 00:00.5 | Top right, the offline pill lights with a spruce glow: **AIRPLANE MODE • 0 BARS** | Woodblock |
| 00:00.3–02.0 | Three layers of alpine ridge rise through two bands of drifting mist | Wind swells |
| 00:01 | Under the pill: `32°14'42"N 77°10'33"E · 2,480 m · offline fix` | Woodblock (beat 4) |
| 00:02.0 | **ZERO / SIGNAL** cuts in at 124 % and settles in 160 ms | Impact + woodblock |
| 00:02.5 | **ZERO / GUESSWORK** | Impact + woodblock |
| 00:03.0 | **WILD, NOT / RECKLESS**, held with a slow push | Impact + woodblock |
| 00:01.9–03.3 | The embers gather into a cluster of five wild strawberries — ruby cones, golden achenes, green calyx crowns — as the lens pushes in 30 % | Filter opening |

### Bars 3–4 · 00:04–00:08 · The living thicket and the home page

| Time | Picture | Sound |
|---|---|---|
| 00:04–06 | The camera glides 7.5 world units down the path; fringing and vignette rise with speed | Woodblock eighths |
| 00:04.2–05.6 | A thumb sweeps from lower left to upper right. Canes and fruit lean away from it, the wake glows amber, and 46 embers are shed along its path and drift upward | Airy sweep left to right, six firefly pings |
| 00:04.25 | Lower third: *The living thicket* / **TOUCH IT / AND IT MOVES** / `WebGL2 point sprites · no textures · no network` | |
| 00:06.0 | The frosted home-page header drops in: bramble-sprig emblem, **TRAILSNACK**, *Launch Scanner* | |
| 00:06.2 | The Safety Covenant card rises, thorn rim in amber: **"The default answer is always: Unidentified — do not ingest."** with the three engine rules as chips | |
| 00:07.0 | The answer warms for a beat | |
| 00:07.74 | The thumb taps *Launch Scanner* | |

### Bar 5 · 00:08–00:10 · Build-up and the shutter

| Time | Picture | Sound |
|---|---|---|
| 00:07.87–08.17 | Whip: the home page leaves left as the camera arrives from the right, both smeared along the direction of travel | Whoosh right to left |
| 00:08–10 | `/scan`: app header (Offline · T1 Ready · GPS), the 1:1 viewfinder edge to edge, capture rack, dock. The thicket behind drops to 20 %, as it does in the app | Woodblock sixteenths rising in pitch and level; the sub climbs an octave |
| 00:08.25–09.45 | The hiker settles the frame: the feed pans onto the strawberries and tightens 32 %; brackets close in; the reticle shrinks onto the cluster | |
| ≈00:08.5 | Roll falls below 3°: the level line and readout turn spruce green — `LEVEL +0.4°` | |
| 00:09.84 | The thumb comes down on the shutter; the amber disc compresses | Wind and sub cut out 30 ms before the drop |
| **00:10.00** | **Cut.** An amber ripple leaves the shutter and crosses the new screen | **Shutter snap, 808 drop, amber chime (F–C–G)** |

### Bars 6–8 · 00:10–00:16 · Deterministic verdict and lookalikes

| Time | Picture | Sound |
|---|---|---|
| 00:10.0 | `/assess`: the specimen plate — the frame the shutter caught — with etched corner ticks drawing in and its label (captured, Tier 1 inference 184 ms · WebGPU, safety database 2026.11.1) | 808 ringing |
| 00:10.5 | The verdict stamps down from 170 %: **CAUTION**, confidence *confident* | Impact + woodblock |
| 00:10.6–11.1 | Under it, in order: `EDIBLE PER REFERENCE • VERIFY CHECKLIST`, *Lookalike hazard — verify before any contact*, *Caution — do not ingest without expert confirmation.* | |
| 00:12.0 | The page pushes in and scrolls to **Hazardous lookalikes** · `1 FLAGGED` | Kick on every beat, bass, shakers begin |
| 00:12.3 | The crimson card slides out from the right: **Bittersweet nightshade**, *Solanum dulcamara*, reference class `TOXIC` | Low tone, short sweep |
| 00:12.6–13.6 | Two botanical plates draw on side by side: the strawberry's calyx crown, external achenes and toothed trifoliate leaf; the nightshade's smooth oval berries and eared, arrow-shaped leaf | |
| 00:13.0–13.5 | Three differences list in; the page follows the card down | |
| 00:14.0 | Scroll to the engine trace; it opens | Haptic click |
| 00:14.5 | **WORST-CASE / ALWAYS WINS** cuts in | Impact |
| 00:14.9–15.6 | Three engine reasons, in the engine's own wording, ending *→ CAUTION; expert must exclude it.* Footer: `RULES DECIDE · THE MODEL ONLY RANKS` | |

### Bars 9–11 · 00:16–00:22 · Field checklist and Tier 2 Deep Look

| Time | Picture | Sound |
|---|---|---|
| 00:16.0 | Scroll to **Verification checklist** · `0/3 CHECKED` | |
| 00:16.5 | Tick: *Serrated leaf margins confirmed* | Click + small bell |
| 00:17.0 | Tick: *Solitary flower bracts verified* | Click + bell, a third up |
| 00:17.5 | Tick: *Stem lacks milky latex* — the counter turns amber, `3/3 CHECKED`. Beneath: *A finished checklist is not proof of edibility.* | Click + bell, a fifth up |
| 00:18.0 | The thumb taps *Describe visible features*; the Deep Look drawer slides up over a 60 % scrim | Click, sweep |
| 00:18.5–19.9 | `GENERATING`: Gemma 4 E2B streams schema-constrained JSON — observed features, then confirmed / contradicted / not-visible for `wild-strawberry` — with the box following the caret | Quiet token ticks |
| 00:19.95 | `VALID JSON`: the stream gives way to the parsed findings | |
| 00:20.0 | The latency badge lands and pulses on every beat: `ON-DEVICE GEMMA • TIER 1 184ms • 100% PRIVATE` | Two-note bell |
| 00:20–22 | Held, with the line *It can lower the verdict through the safety engine; it can never raise it.* | |

### Bars 12–14 · 00:22–00:28 · Lifelines and the field log

| Time | Picture | Sound |
|---|---|---|
| 00:22.0 | The drawer drops; the page descends to **Emergency** · *Works offline · regional lifelines* | Sweep |
| 00:22.3–22.9 | 🇮🇳 **India** — National Poisons Information Centre · AIIMS, New Delhi — **1800-116-117** (solid crimson, the largest type on the card) and Emergency **112**. 🇺🇸 North America — Poison Help 1-800-222-1222 · 911. 🇪🇺 Europe & UK — NHS 111 · 112 | |
| 00:23.3 | The thumb taps the India line; it flares | Click, a breath of dial tone |
| 00:24.0 | Scroll to **Save to Field Log**: geotag `32°14'42"N 77°10'33"E • 2,480m`, fingerprint pending | |
| 00:24.5 | Tap. The 64 hex digits of the SHA-256 resolve left to right in half a second; both readouts flash spruce | Click, 14 fast ticks |
| 00:25.1 | The button becomes *Saved on this device*; `IndexedDB` lights; entry № 007 rises below | Two rising bells |
| 00:25.15–25.65 | The page scrolls so the new entry sits where the archive's first row will be | |
| **00:26.0** | **Match cut** to `/log`: **Specimen Archive** · `4 ENTRIES`. Entry № 007 does not move; three earlier finds rise in under it (Unidentified, Red baneberry `TOXIC`, American elderberry `CAUTION`) | Bell |

### Bars 15–16 · 00:28–00:32 · Cross-app harmony

| Time | Picture | Sound |
|---|---|---|
| 00:28.5 | The thumb taps **Field Guide & Home ↗** in the header | Click |
| 00:28.6–29.2 | The archive, header and dock let go; the veil lifts and the lens widens 18 % back into the full thicket | Rising sweep |
| 00:28.75 | The home-page header drops in | |
| 00:28.95 | **THE OFFLINE TRAIL / COMPANION THAT / NEVER SAYS / "EAT THIS"** | |
| 00:30.0 | *Frosted architecture* / **ONE TRAIL, / EVERY SCREEN** | Bell |
| 00:30.05 | A desktop window floats in from the left: the Assess screen at 1600 px, two columns | |
| 00:30.3 | A phone floats in over its corner: the Scan screen at 390 px | |
| 00:30.7–31.5 | A ruler under the window narrows as its readout counts `1600 → 390 px` | |
| 00:31.2 | A bracket closes on the shutter: `48 PX GLOVE TARGETS` | Sweep into the cut; the last beat drops out |

### Bars 17–18 · 00:32–00:36 · Proof

Each card cuts in at 120 %, settles in 180 ms and is pushed 3 % until the next downbeat. The
thicket cuts to a different fruit behind each.

| Time | Card | Caption | Sound |
|---|---|---|---|
| 00:32 | **100% OFFLINE / AIRPLANE MODE** | After a one-time setup over Wi-Fi | Long sub, impact, bell (F) |
| 00:34 | **ON-DEVICE / GEMMA AI** | EmbeddingGemma 2 · Gemma 4 E2B · WebGPU / WASM | Long sub, impact, bell (A♭) |
| 00:36 | **WORST-CASE / ALWAYS WINS** | Deterministic safety engine · AI can only lower a verdict | Long sub, impact, bell (C) |

Fireflies — sparse, seeded, pentatonic — scatter across bars 17–20 over a held open fifth.

### Bars 19–20 · 00:36–00:40 · Lockup

| Time | Picture | Sound |
|---|---|---|
| 00:36.85 | The bramble sprig draws itself stroke by stroke; its three berries appear; **TRAILSNACK** fades up | Amber chime, four notes |
| 00:37.35–37.95 | A specular highlight crosses the berries left to right as an amber pool swells behind them | Nine rising pings |
| 00:38.0 | The lockup lifts. **ROOTED IN CAUTION** | Soft impact |
| 00:38.5 | **BUILT FOR THE WILD** | Soft impact |
| 00:39.0 | `trailsnack.onrender.com`, then *Educational reference · confirm every find with a local expert* | One high bell |
| 00:38.2–39.9 | The fruit lets go and drifts off as embers; the frame falls to obsidian | Fade from 00:38.5, silent by 00:39.92 |

## Where the reel departs from the brief

The brief contradicts itself in a few places. Each was settled in favour of the safety rule.

| Brief | Reel | Why |
|---|---|---|
| Bar 6 badge "CAUTION • EDIBLE WITH VERIFICATION" | **CAUTION** over `EDIBLE PER REFERENCE • VERIFY CHECKLIST` | The brief's own rule: "edible" never appears without that qualifier |
| Bar 7 card: Deadly Nightshade vs. Wild Blueberry | Bittersweet nightshade vs. the wild strawberry | The featured pair in the specs; a blueberry card under a strawberry scan would not make sense |
| Bar 11 badge "ON-DEVICE GEMMA 2 • 184ms" | `ON-DEVICE GEMMA • TIER 1 184ms`, and the same figure on the specimen plate | 184 ms is a Tier 1 (EmbeddingGemma 2) inference time, which is where the app shows one; a Gemma 4 E2B vision pass does not run that fast, and the drawer it sits in is Tier 2 |
| Final card "Rooted in caution. Built for the wild." | Two lines, no full stops | "No full stops in on-screen title cards" |
| Third proof card at 00:36, lockup from 00:36 | Card holds 00:36.00–36.85, then the lockup | Both cannot own the same second |
| "100% OFFLINE" | Same, captioned *After a one-time setup over Wi-Fi* | The models are downloaded once; the app says so itself |
| 9:16 or 16:9 | 9:16 only | The app is a phone app; the stage is a phone |

## Where the reel and the app differ

The reel is a staged demonstration. One difference mattered for safety and was fixed in the
app; the rest are illustrative and were left alone.

- **India — fixed in the app.** The reel shows the in-app emergency card dialling NPIC AIIMS
  (1800-116-117). The database had no India region, so the app could not show it. It now does
  (safety database 2026.11.1, DECISIONS D-027), and Welcome and Settings offer India.
- **Lookalike.** In the database, wild strawberry has no hazardous confusable, so for a
  strawberry the real engine returns its reference-match verdict and no lookalike card. The
  card and the CAUTION verdict are real features — they appear for species that list a toxic
  confusable, such as blackberry with pokeweed — shown here on the brief's featured pair. The
  reel errs toward caution, never away from it. The database was deliberately not changed to
  fit: that is a botanical decision, and the app's own tests use wild strawberry as their
  clean-neighbourhood example.
- **Species.** The database lists wild strawberry as *Fragaria virginiana*; the reel uses the
  brief's *F. vesca*.
- **Checklist.** The three ticked lines are the brief's wording, not the database's.
- **Emergency card.** The app shows the numbers for the region chosen in Settings; the reel
  shows three regions on one card.
- **Header link.** The app header has no "Field Guide & Home ↗" link at phone width.
- **Telemetry.** The 184 ms, the GPS fix and the fingerprint are staged values, not measurements.
- **URL.** `trailsnack.onrender.com` is still marked as a placeholder in the README; confirm it
  is live before publishing.
