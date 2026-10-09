# TrailSnack — Independent Verification Report

**Date:** 2026-10-09
**Scope:** Verify that the repository at commit `b9bd61b` fulfils the "TrailSnack — Autonomous End-to-End Build Specification" that was given to OpenCode.
**Method:** The Gate 7 "Definition of Done" sequence was executed from a fresh `git clone` into a temporary directory. The Node smoke test was run against the locally cached Tier 1 weights. Four independent read-only code audits then compared each phase's code against the spec, and every finding listed here was re-checked by hand against the source.

## 1. Status

> **Update, later on 2026-10-09:** after this report was written, a follow-up OpenCode session landed commits `6667e31` through `43e29c9` addressing C1, C2, C3, H2, H3, H5, H6 and the A9 items, and bumped the database to 81 species (version 2026.10.2). The findings below describe commit `b9bd61b` and are kept as the record of what the audit found. H1 (the Section 11 final report) and H4 (threshold calibration) were still open at the time of this update.

**PARTIAL.** The build, test, and offline gates all pass, the documentation and deployment assets are in place, and the safety engine has no path that presents a mushroom as edible or lets Deep Look raise confidence. However, three runtime bugs in the Gemma worker and client mean the app does not work as specified once it runs against the real model: the second scan in a session hangs, Deep Look always fails, and abort does nothing. These are invisible to the gates because the end-to-end tests replace the worker with a mock. The agent log also lacks the required Section 11 final report.

## 2. Gate results (clean clone, Node 24.15.0)

| Gate | Command | Result | Time |
|---|---|---|---|
| 7a | `npm ci` | PASS | 4 s |
| 7b | `npm run typecheck` | PASS | 2 s |
| 7c | `npm run lint` | PASS | 2 s |
| 7d | `npm run validate:db` | PASS (79 species: 38 berry, 28 mushroom, 13 plant; 12 universal rules) | <1 s |
| 7e | `npm test` | PASS (6 files, 23 tests) | 2 s |
| 7f | `npm run build` | PASS (71 precache entries, 126 MB; verify-build OK) | 8 s |
| 7g | `npm run test:e2e` | PASS (7 Playwright tests) | 4 s |
| 7h | `npm run check:offline` | PASS (COOP/COEP, SW active, no CDN hosts, offline Scan + DB) | 4 s |
| 7i | placeholder grep (`TODO|FIXME|lorem ipsum|not implemented`) | PASS | <1 s |
| 3 | `npm run test:smoke` (Tier 1, Node CPU q4, cached weights) | PASS (‖e‖ = 1.0000, 768-d, audio encoder skipped) | ~40 s |

Both Hugging Face repositories the build depends on exist and return JSON with an `id`: `onnx-community/embeddinggemma-2-ONNX` and `onnx-community/gemma-4-E2B-it-ONNX`.

## 3. Findings by severity

### Critical (app does not function as specified)

| # | Finding | Where | Evidence |
|---|---|---|---|
| C1 | **Second scan in a session hangs for 10 minutes.** The worker returns early when Tier 1 is already loaded but posts no `ready` event. The client has no "already ready" guard and waits on the 600 s timeout, then shows "Model unavailable". The Assess page calls `initTier` on every assessment. | `src/workers/gemma.worker.ts:108`, `src/ai/gemmaClient.ts:121-161`, `src/pages/Assess.tsx:104` | Hand-verified. Same pattern for Tier 2 at worker line 246. |
| C2 | **Deep Look can never return a result.** `batch_decode` is synchronous and returns `string[]` (library types line 199), but the worker calls `.then()` on it, which throws a TypeError. Even with that fixed, the prompt tokens are not sliced off before parsing, so JSON parsing would still fail. | `src/workers/gemma.worker.ts:334-336` | Hand-verified against `node_modules/@huggingface/transformers/types/tokenization_utils.d.ts`. |
| C3 | **Abort is not implemented.** Only a boolean flag map exists. `StoppingCriteria` is imported and discarded, no `stopping_criteria` is passed to `generate`, and the client never sends `abort`. A non-null assertion at worker line 408 throws for unknown IDs. | `src/workers/gemma.worker.ts:59, 282-283, 319-320, 408` | Spec 6.2 required cancellation via the library's stopping-criteria mechanism. `InterruptableStoppingCriteria` exists in the installed library and is unused. |

### High (spec requirement missed or safety-adjacent)

| # | Finding | Where |
|---|---|---|
| H1 | **No Section 11 final report in the agent log.** The log ends with "Gate 7: FULL clean-clone run PASS (below)" and nothing follows. README line 207 links to a report that does not exist. | `docs/AGENT_LOG.md:175-176` |
| H2 | **False hellebore (*Veratrum*) is missing** from the database although it is a required entry (ramps look-alike). Atlantic poison oak (*T. pubescens*) has no separate entry. Several entries carry inaccurate alternate common names (Pacific yew lists "English yew"; American holly lists "English holly"; European mistletoe lists "American mistletoe"; yellow morel lists "Black morel"). | `public/data/flora_safety_db.json` |
| H3 | **Mushroom EDIBLE guard weakened by commit b3b2c0c.** The category cap now checks only the top candidate. A non-mushroom top with an `edible_with_caution` mushroom in the plausible set could reach EDIBLE. Unreachable today only because no mushroom in the DB is `edible_with_caution`; a future data edit would silently open it. | `src/engine/safetyEngine.ts:167-181` |
| H4 | **Thresholds are far from the real similarity distribution.** The smoke test shows off-vocabulary photos (fly agaric, synthetic poison ivy) scoring 0.60–0.74 against unrelated berries with margins of about 0.005. With `ABS_MIN 0.30`, `CONFIDENT 0.45`, `BAND 0.05`, almost every species is "plausible", so the worst-case rule will return TOXIC for nearly everything. Safe, but useless until `npm run calibrate` is run on labelled photos. | `src/engine/thresholds.ts` |
| H5 | **PWA update prompt does not update.** `main.tsx` discards the `updateSW` function; `UpdatePrompt` just reloads while `skipWaiting` is false, so the waiting service worker never activates. | `src/main.tsx:12`, `src/components/layout/UpdatePrompt.tsx:20` |
| H6 | **iOS camera gesture fallback is unreachable.** The "Tap to start the camera" button renders only inside the error branch, but a failed `play()` sets `needsGesture` without setting `error`. | `src/components/scan/CameraView.tsx:85-96` |
| H7 | **OOM handling is load-time only**, detected by a message regex. No `GPUDevice.lost` listener; inference-time errors are always coded `unknown`, so the WASM-retry offer never appears for the OOM case the spec described. | `src/workers/gemma.worker.ts:132-133, 268-269, 344, 424-428` |

### Medium (spec deviations, no runtime failure)

| # | Finding | Where |
|---|---|---|
| M1 | `@eslint/js` is the only unpinned dependency (`^10.0.1`). D-009 records adding it but not the caret. | `package.json:37` |
| M2 | `verify-build.mjs` exempts `/ort/` and `workbox-` files from the TODO/FIXME scan and allows the jsDelivr string when `/ort/` also appears. Logged as D-008 and D-010, but the spec said no exemptions. | `scripts/verify-build.mjs:41, 51, 59` |
| M3 | Field log `verdict` index is keyed on an object; IndexedDB silently omits every record from it. Should index `verdict.badge`. | `src/db/index.ts:76` |
| M4 | `thumbnailBlob` stores the full 1024 px image, not a 256 px thumbnail. | `src/pages/Assess.tsx:230` |
| M5 | Tailwind sizing: an unlayered `min-height: 48px` rule overrides the `min-h-14`/`min-h-16` utilities, so primary buttons are 48 px rather than the required 56 px. `text-base` remains 16 px (used 28 times) against the ≥18 px body rule. | `src/index.css:33-39` |
| M6 | Models screen never shows bytes on disk or download date (`bytes: 0` is stored; `formatBytes(null)` prints "unknown"). Welcome shows no bytes and no device badge during download. | `src/pages/Models.tsx:48, 83, 134, 170`, `src/pages/Welcome.tsx` |
| M7 | Tier 2 capability gate passes when `deviceMemory` or quota is unknown. Spec wanted explicit ≥ 8 GB and ≥ 4.5 GB. | `src/components/models/CapabilityGate.tsx:30-32` |
| M8 | `docs/SOURCES.md` is not rendered in-app; Settings only names the file. | `src/pages/Settings.tsx:97` |
| M9 | `validate-db.mjs` is hand-rolled and reads `schema.json` only for `species.minItems`; it does not validate against the schema, nor check emergency regions. | `scripts/validate-db.mjs` |
| M10 | `src/ai/progress.ts` (tested) is unused; the worker has its own untested copy that ignores the 32 MB tokenizer download. `Device`, `Tier`, and the Deep Look schema are each defined twice. | `src/ai/progress.ts`, `src/ai/types.ts:28-55` |
| M11 | Ten Lucide icons outside the allowed list (Settings, RefreshCw, Zap, ZapOff, Leaf, Nut, Sprout, Upload, Save). `TabBar.tsx` does not exist; the tab bar is inline in `AppShell.tsx`. Neither deviation is logged. | various |
| M12 | `make-icons.mjs` has no `sharp` in `package.json`; its fallback writes SVG text into `.png` files; the favicon's third path has malformed data (`4- gap`), invisible because it has no fill. Committed PNGs are valid. | `scripts/make-icons.mjs`, `public/icons/favicon.svg:4` |
| M13 | Smoke test prints top-5 rather than the full ranking; a failed image load substitutes a one-hot vector that still passes the norm check. `poison-ivy.jpg` is a 653-byte synthetic square. `fixtures/ATTRIBUTION.md` gives URLs but no per-image author or licence. | `scripts/smoke-tier1.mjs:121-124, 150` |
| M14 | Weak tests: the verdict component test never checks the icon; the Tier 2 e2e gate accepts `/unavailable|yes/` so it passes either way; the test hook is `window.__trailsnack` (exposed in production) rather than `__TRAILSNACK_TEST__`; `check-offline.mjs` attaches its request listener after first load and infers "served by SW" from a 200 status. | `tests/`, `scripts/check-offline.mjs:49, 85-91` |
| M15 | `modelCacheInspector` reads each cached response fully via `arrayBuffer()` before falling back to `Content-Length`; `evictModel` writes `dtype`/`device` as "unknown" and guesses tier by substring. | `src/db/modelCacheInspector.ts:51-57, 100-108` |

### Spec items verified as done

- All Phase 1 configuration (Vite, PWA, Workbox, COOP/COEP, tsconfig strictness, Tailwind tokens, index.html meta, `.gitignore`, ESLint flat config, Apache-2.0 LICENSE, `.node-version`, `engines`).
- Self-hosted ONNX Runtime: `wasmPaths` override verified against installed types; no CDN request observed at runtime.
- Tier 1 audio encoder genuinely skipped via `config.audio_config = null`, which matches the library's own loader logic (`session_config.js`).
- Worker protocol, species-index document prefix format, batch size 16, L2 normalisation, transferable buffers, `RawImage` constructor, `Gemma4ForConditionalGeneration` export, `StructuredOutputProcessor` export, Deep Look preamble and schema.
- idb stores, persistence, SHA-256 hash, Transformers.js cache name `transformers-cache` confirmed in library source.
- Database: 79 species with every field present, all cross-references resolve, all required universal-rule topics, four emergency regions.
- Safety engine purity, plausible-set rule, confidence rule, worst-case rule (with D-005's documented resolution), UNKNOWN headline exact, Deep Look downgrade-only.
- All seven routes and screens, Field Log export/import, Quota inspector, typed 3.3 GB confirmation, online badge, install banner, error boundary.
- `render.yaml` matches the spec exactly. README has all sections in order with a Mermaid diagram and Trail Test Log table. DEV_POST has the exact template headings and required tags. DECISIONS records all rejected models with sizes and the non-existent PaliGemma repo.

## 4. Model facts observed

| Item | Observation |
|---|---|
| Tier 1 model | `onnx-community/embeddinggemma-2-ONNX`, dtype q4 (Node), cached under `node_modules/@huggingface/transformers/.cache` (301 MB) |
| Audio encoder | Skipped (`audio encoder skipped: true` printed by smoke test; agent log records 189.1 MB absent) |
| Embedding | 768-d, norm 1.0000 for all three fixtures |
| Fixtures | 2 of 3 real (blackberry 139 KB, fly agaric 317 KB); poison ivy synthetic |
| Smoke ranking | Blackberry → allegheny-blackberry 0.742 (correct, margin 0.005). Fly agaric and poison ivy ranked against a berries-only 12-entry subset, so their rankings are not identification tests. |
| Tier 2 | Never downloaded, as the spec required. Code path type-checks but has bug C2. |

## 5. Verdict on the prompt

The spec was executed through all eight gates and the gates genuinely pass from a clean clone. The repository is structurally complete and the documentation is submission-ready. It is **not yet usable in the field** because of C1 and C2, and the submission artefact is incomplete because of H1. See `docs/NEXT_STEPS.md` for the ordered fix list and the deployment manual.

---

# Round 2 — Verification of OpenCode's fix commits (`6667e31` … `d78da75`)

**Date:** 2026-10-09, evening. **Method:** same as round 1. Gate 7 re-run from a fresh clone of `d78da75`; smoke test re-run; two independent read-only audits of the diff `b9bd61b..d78da75`; every finding below re-checked by hand.

## R2.1 Gate results at `d78da75`

| Step | Result |
|---|---|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run validate:db` | PASS (81 species: 38 berry, 28 mushroom, 15 plant; 12 rules; version 2026.10.2) |
| `npm test` | PASS (12 files, 42 tests, up from 6 files / 23 tests) |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS (7 tests) |
| `npm run check:offline` | PASS |
| placeholder grep | PASS |
| `npm run test:smoke` | PASS, rankings identical to round 1 |

## R2.2 Status of the round-1 findings

| ID | Round-1 finding | Status at `d78da75` | Notes |
|---|---|---|---|
| C1 | Second init hangs 600 s | **Fixed for init, but the fix introduced R2-1 below** | Worker now posts `ready` on the already-loaded path for both tiers. The client-side guard never fires in practice because Assess and Models set status to `loading` before calling `initTier`. |
| C2 | Deep Look `.then` on sync `batch_decode`, prompt not sliced | **Fixed** | Synchronous decode in `src/workers/deepLookDecode.ts`; prompt length from `input_ids.dims[1]`; `Tensor.slice(null, [start, null])` verified against the library source; streamer text fallback. Test uses a fake slice rather than a real Tensor. |
| C3 | Abort unimplemented | **Fixed in wiring, unreachable in practice** | `InterruptableStoppingCriteria` per request passed as `stopping_criteria`; client posts `abort` without a pending entry; Cancel button present. Unreachable because of R2-1. The `aborted` code is only emitted because truncated JSON fails to parse; there is no explicit `if (flag.aborted)` after `generate`. |
| H1 | No Section 11 report | **Partially fixed** | Report appended to `docs/AGENT_LOG.md`, but with no Gates 0–6, no durations, no Tier 1 file/byte list, no fly-agaric ranking, dependency list in prose. The contradictory line 110 ("audio encoder never requested") was left in place. |
| H2 | False hellebore missing, wrong names | **Fixed, one new defect** | `false-hellebore` and `atlantic-poison-oak` added, four wrong names removed. But `poison-oak` still lists "Atlantic poison oak" as a common name and does not link to the new entry. |
| H3 | Mushroom guard checks top only | **Fixed** | `isEdibleNeighborhood` checks the whole plausible set. The scenario test uses a 0.03 margin, so it would pass without the fix; only the direct unit test pins the rule. |
| H4 | Thresholds uncalibrated | Open, listed as a limitation | Needs real photos. |
| H5 | Update prompt never activates SW | **Fixed** | `updateSW(true)` called; meaningful test. |
| H6 | iOS camera button unreachable | **Fixed** | Button outside the error branch; meaningful test. |
| H7 | OOM load-time only | Open, listed as a limitation | |
| M1 | `@eslint/js` unpinned | **Fixed** | |
| M2 | verify-build exemptions | Open | |
| M3 | verdict index on object | **Fixed** | idb bumped to v2 with an in-place index rebuild; the v1→v2 migration has no test. |
| M4 | Full image stored as thumbnail | **Fixed** | 256 px thumbnail generated in `src/lib/image.ts`. |
| M5 | 48 px override; 16 px `text-base` | **Half fixed** | `min-height` rule moved into `@layer base`. The 16 px `text-base` issue was dismissed in D-017 on incorrect reasoning: `html` font-size is not set, so `text-base` is still 16 px. |
| M6 | No bytes/date shown | **Half fixed** | Models shows bytes and date, but the worker's progress events can inflate the sum. Welcome still saves `bytes: 0` and shows no bytes or device badge during the main first-run download. |
| M7 | Gate passes on unknown memory/quota | **Fixed** | Fails closed. |
| M8 | SOURCES not in-app | **Fixed** | Imported with `?raw` and rendered in Settings. |
| M9 | validate-db ignores schema | Open | |
| M10 | Duplicate aggregator / types | Open | |
| M11 | Off-list icons, missing TabBar | **TabBar fixed; icons logged** as D-013 | |
| M12 | make-icons / broken favicon path | Open | |
| M13 | Smoke test weaknesses, attribution | Open | |
| M14 | Test hook exposed in production | Open | `window.__trailsnack.setMockScores` still installed unconditionally; `identify()` short-circuits on the hook alone. |
| M15 | Cache inspector reads full bodies | Open | |
| — | App version hard-coded "0.1.0" | Open | `Settings.tsx`, `Assess.tsx`. |

## R2.3 New defects introduced by the fixes

| # | Severity | Finding | Where |
|---|---|---|---|
| R2-1 | **Critical** | **Deep Look is rejected on every run.** `deepLook()` calls `loadTier2(requestId)` with the Deep Look request id. The new already-loaded path posts `ready` under that id. The client resolves a pending request on the first non-progress, non-token event, so the Deep Look promise resolves with `ready` and the client throws "Unexpected response: ready". Generation continues orphaned on the GPU; its tokens are dropped; it cannot be cancelled because `activeDeepLookId` is cleared in `finally`. Assess only enables the button when Tier 2 is already `ready`, so this is the normal path, not an edge case. The cold-load path has the same collision and predates the fix. | `src/workers/gemma.worker.ts:254-258, 292`, `src/ai/gemmaClient.ts:69-79, 241` |
| R2-2 | Medium | After the WebGPU→WASM fallback inside `initTier`, Assess still records `device = webgpu` and builds the embedding cache key with dtype `q4f16`, so the species index is cached under the wrong key. | `src/pages/Assess.tsx:102, 114, 117` |
| R2-3 | Medium | The Tier 2 e2e gate test was changed to compute its expected text from `"gpu" in navigator`, the same expression the app uses. It can no longer fail on a detection bug. The gate also ignores `requestAdapter()`, so a browser exposing `navigator.gpu` with no adapter shows "yes". | `tests/e2e/app.spec.ts:109-118`, `src/ai/detectDevice.ts:19` |
| R2-4 | Low | The new worker-side tests for C1, C2, C3 are source-text greps or fakes. None runs worker message handling, which is why R2-1 was not caught. | `tests/unit/init-tier-guard.test.ts:99-105`, `tests/unit/deep-look-abort.test.ts:72-78` |
| R2-5 | Low | `check-offline.mjs` still attaches its request listener after the first `goto`, and at page level rather than context level, so first-load and service-worker requests are not screened for CDN hosts. | `scripts/check-offline.mjs:41, 49` |
| R2-6 | Low | Verdict icon test only asserts that some `svg` exists, not which icon; swapping ShieldCheck and ShieldAlert would pass. | `tests/unit/verdict.test.tsx:21` |

## R2.4 Verdict after round 2

The gates pass and 9 of the 11 round-1 items marked for fixing are genuinely fixed. Tier 1 identification should now work across repeated scans. Deep Look remains non-functional because of R2-1, which is a one-line fix (do not post `ready` when `loadTier2` is called from `deepLook`, or have the client ignore `ready` for `deep-look` requests). The remaining open items are quality and documentation rather than safety. No safety regression was found: the verdict engine is stricter than before.
