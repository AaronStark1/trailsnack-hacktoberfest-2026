# TrailSnack — Next Steps and Operating Manual

This is the hand-off manual for getting TrailSnack from the current commit to a working, deployed, submitted project. Follow the sections in order. Part A fixes the bugs that stop the app from working. Part B runs it locally. Part C deploys to Render. Part D is the first-run on a phone. Part E is the DEV submission.

Companion document: `docs/VERIFICATION_REPORT.md` lists every finding with file and line references.

---

## Part A — Fixes required before the app works (do these first)

> **Status 2026-10-09 (evening):** A1 through A7 and A9 were fixed by OpenCode in commits `6667e31` to `43e29c9`. A8 (the final report in `docs/AGENT_LOG.md`) was still pending. Threshold calibration in Part B remains the one task that needs real photos from a hike.

Each item names the file, what is wrong, and what to change. Run `npm run typecheck && npm test` after each.

### A1. Stop the second scan from hanging (critical)

**Files:** `src/workers/gemma.worker.ts`, `src/ai/gemmaClient.ts`

**Problem:** When a tier is already loaded, the worker returns without posting `ready`, so the client waits 600 s and then reports "Model unavailable". The Assess page calls `initTier` on every assessment.

**Fix (either is sufficient; do both):**
1. In the worker, replace the bare `return` at the top of `loadTier1` (line 108) and `loadTier2` (line 246) with a `post({ type: "ready", requestId, tier, device, loadMs: 0 })` before returning.
2. In the client's `initTier`, check `useModelStore.getState()[tier].status === "ready"` with a matching device and return immediately without sending.

### A2. Make Deep Look return a result (critical)

**File:** `src/workers/gemma.worker.ts` lines 330-337

**Problem:** `batch_decode` is synchronous, so `.then()` throws. The prompt tokens are also not removed before JSON parsing.

**Fix:**
```ts
const promptLen = (inputs.input_ids as { dims: number[] }).dims[1] ?? 0;
const generated = (output as Tensor).slice(null, [promptLen, null]);
const decoded = tier2Processor.batch_decode(generated, { skip_special_tokens: true }).join("");
```
Alternatively, accumulate the text already streamed through `TextStreamer` and parse that.

### A3. Implement abort (critical per spec)

**Files:** `src/workers/gemma.worker.ts`, `src/ai/gemmaClient.ts`, `src/pages/Assess.tsx`

**Fix:** Import `InterruptableStoppingCriteria` from `@huggingface/transformers`, create one per Deep Look request, pass it as `stopping_criteria` to `generate`, and call `.interrupt()` when an `abort` message arrives for that `requestId`. Replace the non-null assertion at line 408 with an optional check. Add a `gemmaClient.abort(requestId)` method and wire it to a Cancel button in `DeepLookPanel`.

### A4. Add false hellebore and fix species names (high)

**File:** `public/data/flora_safety_db.json`

- Add a `false-hellebore` entry (*Veratrum viride* / *V. album*, category plant, edibility deadly) and add it to the `confusable_with` list of `ramps`.
- Optionally add `atlantic-poison-oak` (*Toxicodendron pubescens*).
- Remove the wrong alternate common names: "English yew" from `pacific-yew`, "English holly" from `american-holly`, "American mistletoe" from `european-mistletoe`, "Black morel" from `yellow-morel`. Or add proper separate entries.
- Run `npm run validate:db`.

### A5. Harden the mushroom guard (high, safety)

**File:** `src/engine/safetyEngine.ts` line 173

Add `&& plausible.every((s) => s.category !== "mushroom")` to the EDIBLE condition. Add a unit test with a berry top candidate and an edible-with-caution mushroom in the band, asserting CAUTION.

### A6. Fix the PWA update prompt (high)

**Files:** `src/main.tsx` line 12, `src/components/layout/UpdatePrompt.tsx` line 20

Keep the function returned by `registerSW` and call `updateSW(true)` from the Reload button instead of `window.location.reload()`.

### A7. Fix the iOS camera gesture fallback (high)

**File:** `src/components/scan/CameraView.tsx` lines 85-96

Render the "Tap to start the camera" button whenever `needsGesture` is true, independently of `error`.

### A8. Write the Section 11 final report (high, submission artefact)

**File:** `docs/AGENT_LOG.md`

Append the report the spec required under the "Gate 7 … (below)" line: Status, gate results table, dependency table, model facts, limitations, next steps. The gate and model tables in `docs/VERIFICATION_REPORT.md` can be copied.

### A9. Recommended but not blocking

- Pin `@eslint/js` to `10.0.1` in `package.json`.
- Index `verdict.badge` instead of `verdict` in `src/db/index.ts`.
- Generate a real 256 px thumbnail in `Assess.tsx` save path (there is a resize helper in `src/lib/image.ts`).
- Wrap the `min-height: 48px` rule in `src/index.css` in `@layer base` so `min-h-14`/`min-h-16` apply; set `html { font-size: 18px }` or replace `text-base` with `text-lg`.
- Record real byte counts in `modelManifest` (sum progress totals) and show them on the Models screen.
- Make the Tier 2 gate fail closed when `deviceMemory` or quota is unknown.
- Render `docs/SOURCES.md` in Settings (import it as `?raw` and show it in a sheet).
- Add `TabBar.tsx`, swap the ten off-list Lucide icons or log the deviation in `DECISIONS.md`.
- Tighten tests: assert the icon in `verdict.test.tsx`, assert the exact "WebGPU unavailable" text in the Tier 2 e2e test, and use `response.fromServiceWorker()` in `check-offline.mjs`.

---

## Part A2 — Fixes still needed after OpenCode's first fix pass

Verified against commit `d78da75`. Details and evidence are in `docs/VERIFICATION_REPORT.md`, Round 2.

### A2-1. Stop `ready` from hijacking the Deep Look request (critical)

**Files:** `src/workers/gemma.worker.ts` (around lines 254-258 and 292), optionally `src/ai/gemmaClient.ts` (around line 69).

**Problem:** `deepLook()` loads Tier 2 under its own request id. The already-loaded path now posts `ready` with that id, which the client treats as the final answer to the Deep Look request and throws "Unexpected response: ready".

**Fix:** give `loadTier2` an `ack: boolean` parameter, pass `false` from `deepLook()`, and post `ready` only when `ack` is true. As belt and braces, make the client's `handle()` ignore a `ready` event whose pending entry is a `deep-look` request. Add a unit test that drives the worker's message handler with `init` then `deep-look` on a mocked model and asserts the first non-token event is `deep-look-result`.

### A2-2. Check the abort flag explicitly after `generate` (medium)

**File:** `src/workers/gemma.worker.ts` after the `generate` call (around line 347).

`interrupt()` makes `generate` return normally. Add `if (flag.aborted) { post aborted error; return; }` before decoding, so an abort near the end does not post a partial result. Register the flag before `loadTier2` so an abort during load is honoured.

### A2-3. Record the real device after WASM fallback (medium)

**File:** `src/pages/Assess.tsx` lines 102-117.

Read the device from `gemmaClient` after `initTier` resolves (it already tracks `chosenDevice`) and use it for both the store update and the embedding cache key, so a WASM session does not cache under the `q4f16` key.

### A2-4. Finish the data fix (low)

**File:** `public/data/flora_safety_db.json`, `poison-oak` entry.

Remove "Atlantic poison oak" from its common names and add `atlantic-poison-oak` to its `confusable_with`. Add count (81) and version assertions to `tests/unit/flora-db.test.ts`.

### A2-5. Welcome download screen (low)

**File:** `src/pages/Welcome.tsx` lines 45-60.

Sum the bytes from progress events, store them in the manifest instead of `bytes: 0`, and show bytes plus the WebGPU/WASM badge during the download. In the worker's progress callback, do not substitute the grand total for a file that reports no `total`.

### A2-6. Make the weak tests real (low)

- `tests/e2e/app.spec.ts` Tier 2 gate: assert the fixed string "WebGPU unavailable" when running under the default headless config, or launch with a flag that disables WebGPU, instead of deriving the expectation from the same check the app uses.
- `tests/unit/verdict.test.tsx`: assert the icon class per verdict (`.lucide-shield-check`, `.lucide-shield-alert`, `.lucide-alert-triangle`, `.lucide-help-circle`).
- `scripts/check-offline.mjs`: attach `context.on("request")` before the first `goto`.
- Replace the source-grep tests in `init-tier-guard.test.ts` and `deep-look-abort.test.ts` with tests that import the worker's message handler.

### A2-7. Finish the agent log (low)

`docs/AGENT_LOG.md`: correct line 110 (audio encoder was fetched until D-011), add Gates 0-6 with durations to the Section 11 table, list Tier 1 files with byte sizes, add the fly-agaric smoke ranking.

### A2-8. Still open from round 1, unchanged

`text-base` is still 16 px (set `html { font-size: 18px }`); app version hard-coded in two places; test hook exposed in production (guard with `import.meta.env.DEV`); verify-build exemptions; validate-db ignores `schema.json`; duplicate progress aggregator and type definitions; `make-icons.mjs` and the malformed favicon path; smoke test one-hot fallback and thin attribution; cache inspector full-body reads; OOM handling load-time only.

## Part B — Run locally

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node | ≥ 22 (built with 24.15.0) | `node --version` |
| npm | ≥ 10 | `npm --version` |
| Chrome or Edge | current, for WebGPU | — |
| Disk | ~1 GB free for `node_modules`, ONNX runtime copies, and the 280 MB Tier 1 cache | — |

### Install

```bash
git clone <your fork URL> trailsnack
cd trailsnack
npm ci
npx playwright install chromium   # only needed for e2e and offline checks
```

### Development server

```bash
npm run dev
```
The `predev` hook copies the ONNX Runtime binaries into `public/ort/`. Open the printed URL (usually `http://localhost:5173`). Accept the disclaimer, pick a region, and press "Set up offline identification". The first download is about 280 MB and is cached by the browser; later loads are instant.

### Verify everything

```bash
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm run validate:db    # flora database integrity
npm test               # Vitest unit tests
npm run build          # production build + verify-build gate
npm run test:e2e       # Playwright with mocked worker
npm run check:offline  # real service-worker offline check
npm run test:smoke     # Tier 1 in Node; downloads ~280 MB once
```

### Preview the production build

```bash
npm run build
npm run preview        # http://localhost:4173 with COOP/COEP headers
```

### Calibrate thresholds (do this before trusting any verdict)

1. Put labelled photos in `fixtures/images/` and create `fixtures/labels.json`:
   ```json
   [{ "file": "blackberry.jpg", "speciesId": "allegheny-blackberry" }]
   ```
2. Run:
   ```bash
   npm run calibrate -- --dir fixtures/images --labels fixtures/labels.json
   ```
3. Read the reported similarity distribution and update `src/engine/thresholds.ts`. The smoke test showed unrelated photos scoring 0.60–0.74, so expect `ABS_MIN_SIMILARITY` and `CONFIDENT_SIMILARITY` to need raising substantially, and `AMBIGUITY_BAND` and `MARGIN_CONFIDENT` to need shrinking.
4. Re-run `npm test` (engine tests use synthetic scores and should still pass) and re-check verdicts on your photos in the app.

---

## Part C — Deploy to Render

1. Push the repository to GitHub (the repo has not been pushed yet).
2. In the Render dashboard choose **New → Blueprint** and select the repository. Render reads `render.yaml` and creates a Static Site named `trailsnack` with build command `npm ci && npm run build`, publish path `./dist`, COOP/COEP headers, cache headers, and the SPA rewrite.
3. Wait for the first deploy. The build takes about a minute.
4. Open the site URL. Confirm in DevTools → Application that the service worker is activated and `crossOriginIsolated` is `true` in the console.
5. Set the live URL in `README.md` (line 13) and in `docs/DEV_POST.md` under *Demo*. Commit with `docs: set live Render URL`.
6. If you need a custom domain, add it in Render → Settings → Custom Domains. COOP/COEP headers apply to all paths already.

Troubleshooting:
- **Build fails on Render with a Node version error:** Render uses `.node-version` (24.15.0). Ensure the file is committed.
- **Models never download on the live site:** open DevTools → Network and look for a request to `cdn.jsdelivr.net`. If present, the `wasmPaths` override did not apply; check `public/ort/` exists in the build output.
- **"SharedArrayBuffer is not defined":** the COOP/COEP headers are missing. Confirm them in the response headers for `/`.

---

## Part D — First run on a phone

1. On Android Chrome or iOS Safari 26+, open the live URL over Wi-Fi.
2. Install it: Android → menu → "Install app"; iOS → Share → "Add to Home Screen". On iOS this is what protects the model cache from eviction.
3. Open the installed app, accept the disclaimer, choose region and GPS preference.
4. Press "Set up offline identification". Stay on Wi-Fi until it reports ready. On WebGPU phones the device badge reads WebGPU; otherwise WASM.
5. Go to **Models** and confirm Tier 1 shows "ready" and that "Persisted storage" is granted. If not, press "Request persistence".
6. Turn on airplane mode and reopen the app. Scan should load and identify from cache. If it does not, return to Wi-Fi and check Models for a partial download.
7. Tier 2 (Deep Look, 3.3 GB) is optional. Only enable it on a WebGPU device with ≥ 8 GB RAM and ≥ 4.5 GB free, and only after fixes A2 and A3 are in place.

---

## Part E — Submit to DEV (deadline 2026-10-11 23:59 PDT)

1. Take the app on a real trail. Scan several specimens. Fill the **Trail Test Log** table in `README.md` with date, trail, device, specimens, verdicts, and notes.
2. Add real labelled photos from the hike to `fixtures/images/`, run the calibration from Part B, and commit the new thresholds.
3. Complete `docs/AGENT_LOG.md` with the Section 11 final report (fix A8).
4. Update `docs/DEV_POST.md`: live URL under *Demo*, repository URL under *Code*, a paragraph about the hike under *What I Built*, and (optionally) the Entire/DevRelay session link under *My Agent Session*.
5. Create the post on dev.to from `docs/DEV_POST.md`. Tags must include `devchallenge` and `hf26challenge`. Select prize categories Best Use of Gemma and Best Use of Render.
6. Any commits after you submit must be listed in the "Post-deadline commits" section of `README.md`.

---

## Quick reference

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Full gate run | `npm ci && npm run typecheck && npm run lint && npm run validate:db && npm test && npm run build && npm run test:e2e && npm run check:offline` |
| Smoke test with real Tier 1 | `npm run test:smoke` |
| Threshold calibration | `npm run calibrate -- --dir fixtures/images --labels fixtures/labels.json` |
| Preview production build | `npm run build && npm run preview` |
| Remove cached models (browser) | Models screen → Remove, or DevTools → Application → Cache Storage → `transformers-cache` |
| Remove cached models (Node) | `rm -rf node_modules/@huggingface/transformers/.cache` |
