---
tags: devchallenge, hf26challenge, gemma, render
published: false
---

# TrailSnack: a trail companion that runs Gemma with zero bars — and never says "eat this"

## What I Built

Last summer I watched a friend hover over a roadside blackberry bramble, phone
in one hand, berry in the other, with one bar of signal and a genuine question:
*is this the good one?* The phone knew nothing. The trailhead had no signal.
That moment is TrailSnack.

TrailSnack is an offline-first mobile web app for hikers and trail foragers. You
photograph a wild berry, mushroom, or plant; on-device Gemma AI identifies it;
and a bundled, deterministic safety database returns a verdict — EDIBLE,
CAUTION, TOXIC, or UNKNOWN — with hazardous lookalikes, a field checklist, the
exact rules behind the call, and offline emergency numbers. The whole thing
works in airplane mode after a one-time Wi-Fi setup, and its defining feature is
restraint: **the app never declares anything safe to eat.**

Two Gemma models do two jobs. **Tier 1 "Field ID"** (EmbeddingGemma 2, ≈280 MB)
embeds your photo and matches it against visual descriptions of 79 species by
cosine similarity — zero-shot retrieval where the vocabulary is exactly the set
of species the safety engine understands. **Tier 2 "Deep Look"** (Gemma 4 E2B,
≈3.3 GB, opt-in, WebGPU-only) describes visible features as constrained JSON
against the candidates' checklists — and is forbidden from calling anything
safe. A deterministic engine computes the only verdict you ever see, defaulting
to "Unidentified — do not ingest," letting the worst plausible case win, and
allowing the second model to add caution but never remove it.

## Demo

**Live:** `https://trailsnack.onrender.com` *(author sets the final URL after
first Render deploy).*

Try it: open the demo, accept the safety promise, pick a specimen photo on the
Scan tab, and watch the verdict, lookalike cards, and rule trace appear. Save it
to the Field Log, reload — it's still there, offline. Open Models to see the
storage inspector and the Tier 2 capability gate.

## Code

The repo is Apache-2.0, built with Vite 8 + React 19 + Tailwind 4 + Transformers.js:

- `src/workers/gemma.worker.ts` — the only file that imports the ML library
- `src/engine/safetyEngine.ts` — the deterministic verdict (pure, fully tested)
- `public/data/flora_safety_db.json` — 79 species, 12 universal rules, emergency numbers
- `scripts/check-offline.mjs` — proves airplane-mode operation with zero CDN traffic
- `docs/AGENT_LOG.md` — the complete autonomous build journal

## How I Built It

I built TrailSnack with an AI coding agent — Muse Spark 1.3 running in
OpenCode — working from an empty directory through nine gated phases: environment
verification, scaffold with pinned dependencies and self-hosted ONNX Runtime,
the IndexedDB data layer, the two-tier Gemma worker core (verified against a
real one-time Tier 1 download), a 79-species safety database with a rule engine
tested table-by-table (death cap in the ambiguity band forces TOXIC; a confident
chanterelle with a jack-o'-lantern lookalike holds at CAUTION; clean blueberry
goes EDIBLE; Deep Look can only downgrade), a sunlight-readable UI with camera,
assessment, field log, model management and settings screens, then Playwright
end-to-end flows with a mocked worker, offline verification, and Render
deployment config. The longest fight was offline correctness: overriding the
library's CDN default for WASM binaries, precaching weights without letting the
service worker fight Transformers.js's own cache, and proving it all with an
airplane-mode test. Full story, including failures: `docs/AGENT_LOG.md`.

## Why Open Innovation Matters

There is no API on a ridgeline. TrailSnack only exists because its intelligence
is open: Apache-2.0 Gemma weights, the open-source Transformers.js runtime, and
ONNX exports anyone can self-host. That openness is what makes private,
free, offline inference possible — your specimen photos never leave your phone,
there is no per-query bill, and the app works precisely where cloud AI cannot go.
Open weights don't just lower costs here; they are the difference between a tool
that works on the trail and one that doesn't. TrailSnack returns the favor as
Apache-2.0.

## My Agent Session

Built end-to-end by an autonomous agent session (Muse Spark 1.3 in OpenCode);
the complete journal with every command, failure, and decision is
`docs/AGENT_LOG.md` in the repo. *[Author: paste the Entire/DevRelay shared
session link here to enter the Entire category.]*

## Prize Categories

- **Best Use of Gemma:** Gemma runs locally — EmbeddingGemma 2 retrieval over
  the safety database itself (Tier 1, WebGPU/WASM) plus constrained-JSON Gemma 4
  feature verification (Tier 2, WebGPU-only). No cloud, no API, no signal needed.
- **Best Use of Render:** hosted as a Render Static Site via `render.yaml`
  Blueprint (COOP/COEP isolation headers, SPA rewrite, immutable caching for
  WASM/assets, PR previews).
- **Entire (optional):** agent session shared via the link above + `docs/AGENT_LOG.md`.
