---
title: "TrailSnack 🫐 a trail companion that runs Gemma with zero bars, and never says \"eat this\""
tags: devchallenge, hf26challenge, gemma, render
published: false
---

*This is a submission for the [DEV Hacktoberfest Week 1 Challenge: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05).*

## What I Built

Last summer I watched a friend hover over a roadside blackberry bramble, phone in one hand, berry in the other, with one bar of signal and a genuine question: *is this the good one?* 🤔 The phone knew nothing. The trailhead had no signal. That moment is TrailSnack.

**TrailSnack** is an offline-first web app for hikers and trail foragers. You photograph a wild berry, mushroom, or plant. Gemma identifies it, running entirely on your phone. A bundled safety database then hands back a verdict: **EDIBLE · CAUTION · TOXIC · UNKNOWN**, along with the dangerous look-alikes, a field checklist, the exact rules behind the call, and the poison-control number for your region. All of it works in airplane mode ✈️ after a one-time Wi-Fi setup.

Its defining feature is restraint. **The app never declares anything safe to eat.** 🛑 The default answer is "Unidentified, do not ingest." If a death cap is anywhere near the top of the candidate list, the verdict is TOXIC no matter how confident the model is about the chanterelle. Mushrooms can never score higher than CAUTION. The AI advises; a boring, deterministic, fully unit-tested rule engine decides.

Two Gemma models do two jobs:

- 🔍 **Tier 1 "Field ID"** (EmbeddingGemma 2, about 280 MB) embeds your photo and matches it against 324 hand-written visual descriptions of 81 species by cosine similarity. It is zero-shot retrieval where the vocabulary is exactly the set of species the safety engine knows about, so the model literally cannot name something the safety rules have never heard of.
- 🧐 **Tier 2 "Deep Look"** (Gemma 4 E2B, about 3.3 GB, opt-in, WebGPU only) describes what it sees as constrained JSON against each candidate's checklist: cap colour, gill attachment, stem ring, berry cluster shape. It is forbidden by prompt and by schema from calling anything safe. It can add caution to a verdict. It can never remove it.

## Demo

🌐 **Live:** `https://trailsnack.onrender.com` *(author: replace with the final Render URL after the first deploy).*

Try it in two minutes: open the demo, accept the safety promise, pick a specimen photo on the **Scan** tab, and watch the verdict badge, look-alike cards, and rule trace appear. Save it to the **Field Log**, turn on airplane mode, reload. It's still there. 📴 Open **Models** to see the storage inspector and the Tier 2 capability gate that refuses to download 3.3 GB onto a phone that can't run it.

*(author: add a 30-second screen recording or three screenshots here: Scan, a TOXIC verdict with look-alikes, the Field Log.)*

## Code

📦 **Repository:** *(author: paste GitHub URL)*, Apache-2.0.

Built with Vite 8, React 19, Tailwind 4, Transformers.js 4, and a lot of Web Workers. A few files tell the whole story:

- `src/workers/gemma.worker.ts`: the only file that imports the ML library. Both Gemma models load and run here, off the main thread.
- `src/engine/safetyEngine.ts`: the deterministic verdict. Pure function, no I/O, every rule covered by a test.
- `public/data/flora_safety_db.json`: 81 species, 12 universal safety rules, emergency numbers for four regions.
- `scripts/check-offline.mjs`: a Playwright script that builds the app, kills the network, and proves it still works with zero CDN traffic.
- `docs/AGENT_LOG.md`: the complete build journal from the agent that wrote it.

## How I Built It

I didn't write this code by hand. 🤖 I wrote a specification, roughly 400 lines describing the product, the safety rules, the architecture, and eight verification gates, and handed it to **OpenCode**, a free and open-source AI coding agent that runs in your terminal. OpenCode is MIT-licensed, works with whatever model you point it at, and costs nothing to use beyond the model itself. It felt right that an app built on open weights should be built *by* open tools too.

The agent (running Muse Spark 1.3) worked from an empty directory through eight gated phases: environment verification, a scaffold with every dependency pinned and the ONNX Runtime self-hosted, an IndexedDB data layer, the two-tier Gemma worker (verified against a real one-time Tier 1 download in Node), the 81-species database and rule engine, a sunlight-readable UI, then Playwright end-to-end tests, an airplane-mode check, and the Render deployment blueprint. Each phase ended with a gate: type-check, lint, tests, build. No gate, no next phase.

The safety engine tests read like a field guide's warnings page. Death cap in the ambiguity band forces TOXIC. ☠️ A confident chanterelle with a jack-o'-lantern look-alike holds at CAUTION. A clean, confident blueberry goes EDIBLE. Deep Look can downgrade a verdict and can never upgrade one. If any of those ever flip, the build fails.

The hardest fight was offline correctness. 🥊 Transformers.js wants to fetch its WASM binaries from a CDN by default; on a ridgeline that's a blank screen. The fix was copying the runtime into the app, pointing the library at it, keeping the service worker's cache and the library's own model cache from fighting each other, and then writing a test that actually cuts the network and checks what loads. Every failure and fix is in `docs/AGENT_LOG.md`.

Then I verified the agent's work with a second, independent review before trusting it, and it found real bugs the test suite couldn't see: a hang on the second scan, a Deep Look decode error, a missing abort. A second OpenCode session fixed all of them the same day. Both stories are in `docs/VERIFICATION_REPORT.md` and `docs/AGENT_LOG.md`. Autonomous agents are fast. They still need a second pair of eyes. 👀

## Why Open Innovation Matters

There is no API on a ridgeline. 🏔️

TrailSnack exists only because every piece of its intelligence is open. Google releases Gemma's weights under Apache-2.0, so the model can live on your phone instead of in a data centre. The onnx-community team on Hugging Face converts those weights to a browser-ready format and shares them freely. Transformers.js, open source, runs them on WebGPU. ONNX Runtime, open source, falls back to WASM when WebGPU isn't there. The agent that built the app is open source. The app is open source.

That openness is not a nice-to-have here. It is the difference between a tool that works on the trail and one that doesn't. Your specimen photos never leave your phone. 🔒 There is no per-query bill. There is no outage. There is no signal requirement. A closed, cloud-hosted model could be smarter and it would still be useless at the exact moment a hiker needs it.

Open weights also make the safety story auditable. Anyone can read the species database, read the rule engine, run the tests, and argue with a threshold. That matters when the downside is a hospital visit.

## My Agent Session

The entire build was one autonomous OpenCode session, free and open-source agent included. The full journal, with every command, every failed gate, and every decision the agent had to make on its own, is `docs/AGENT_LOG.md` in the repo, and the design decisions it recorded along the way are in `docs/DECISIONS.md`.

*(author: to enter the Entire category, record the follow-up fix session with Entire and paste the shared link here. A DevRelay embed is optional and separate.)*

## Prize Categories

- 🏅 **Best Use of Gemma:** Gemma runs locally, in the browser, on the hiker's own phone. EmbeddingGemma 2 does zero-shot retrieval over the safety database itself; Gemma 4 E2B does constrained-JSON feature verification. No cloud, no API key, no signal.
- 🏅 **Best Use of Render:** the front end is a Render Static Site deployed from `render.yaml`. The Blueprint sets the cross-origin isolation headers that multi-threaded WASM and WebGPU need, immutable caching for the runtime binaries, a service-worker-friendly no-cache rule, SPA rewrites, and pull-request previews. Render serves the app shell; Hugging Face serves the weights; the phone keeps both.
- 🏅 **Best Use of Entire** *(optional, see above)*.

---

*Credits: Google DeepMind for Gemma; Hugging Face and the onnx-community maintainers for Transformers.js and the ONNX conversions; Microsoft for ONNX Runtime; Lucide for icons; Render for hosting; the OpenCode maintainers for a free, open-source agent. The species database was authored by an AI agent from general field-guide knowledge and has not yet been reviewed by a qualified expert. Never eat anything based on an app.* 🌿
