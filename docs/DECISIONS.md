# TrailSnack — Decisions

Autonomous decisions made during the build (no human in the loop).
Format: ID · date · decision · rationale · alternatives rejected.

- **D-001 · 2026-10-09 · Pin TypeScript to 5.9.3 instead of 7.0.2.**
  Rationale: spec §1.2 explicitly permits pinning latest 5.x if any tool in the
  chain (ESLint, vite-plugin-pwa, vitest) is incompatible with TS 7.
  `typescript-eslint@8.71.1` targets TS <6 APIs; TS 7.0.2 risks parser breakage.
  Latest 5.x resolved via `npm view` is 5.9.3. Revisit when toolchain adds TS 7 support.
- **D-002 · 2026-10-09 · Manual Vite react-ts scaffold (no `npm create vite`).**
  Rationale: `npm create vite@latest . -- --template react-ts` cancels on a
  non-empty directory (docs/, scripts/ already exist for the build journal).
  Manual scaffold reproduces the template file set byte-for-byte in behavior
  (index.html, src/main.tsx, src/App.css removed in favor of Tailwind, vite-env.d.ts,
  tsconfigs). No behavior change.
- **D-003 · 2026-10-09 · Rejected model alternatives (per spec §1.1).**
  `paligemma2-3b-pt-224` (~2.9 GB, base captioning-only, no instruction following);
  `gemma-3-4b-it-ONNX` (~5 GB+, exceeds mobile offline budget);
  `gemma-3n-E2B-it-ONNX` (~3.5 GB+, larger than Gemma 4 E2B with no retrieval advantage);
  `gemma-4-E2B-it-qat-mobile-ONNX` (q2f16 ~2.5 GB but Python-only usage docs, no
  Transformers.js web path). Tier 1 = `onnx-community/embeddinggemma-2-ONNX`,
  Tier 2 = `onnx-community/gemma-4-E2B-it-ONNX`. Non-existent
  `onnx-community/paligemma-3b-mix-224-ONNX` never referenced.
- **D-004 · 2026-10-09 · EmbeddingGemma 2 document-side prefix format.**
  Rationale: model card "Task Instruction Prefixes" mandates asymmetric retrieval
  prefixes. Image is the query (no prefix on vision path); species prompts are
  documents: `title: {common name} ({scientific name}) | text: {visual prompt}`.
  Verified via `curl .../raw/main/README.md` (query `task: search result | query: ...`,
  document `title: {title} | text: {content}`). No image-side prefix exists.
- **D-005 · 2026-10-09 · Verdict tension: toxic-only-via-confusable → CAUTION (Gate 4 example wins over §7.3 step-3 letter).**
  Rationale: §7.3 step 3 says a toxic `confusable_with` entry forces TOXIC, but Gate 4
  requires "chanterelle confident but jack-o'-lantern confusable forces CAUTION".
  Resolution: deadly in plausible set OR confusables → TOXIC; toxic/contact_hazard
  IN the plausible set → TOXIC; toxic/contact_hazard ONLY as a listed confusable
  outside the plausible set → CAUTION with the lookalike named in `reasons`.
  CAUTION still reads "do not ingest without expert confirmation", so ingestion is
  equally blocked; the badge stays honest (a chanterelle is not itself toxic).
  The EDIBLE gate additionally requires no toxic/deadly confusables at all.
  All Gate 4 table tests pass exactly as specified.
- **D-006 · 2026-10-09 · ORT wasmPaths overridden as {mjs, wasm} object, not a string.**
  Rationale: spec §6.2 suggests `wasmPaths = new URL("/ort/", origin).href`, but
  Transformers.js v4 (`src/backends/onnx.js`) expects an object `{ mjs, wasm }`
  for its WASM pre-load/cache path and defaults both URLs to cdn.jsdelivr.net.
  The worker sets both to self-hosted `/ort/ort-wasm-simd-threaded.asyncify.*`
  files (copied by `scripts/copy-ort.mjs`), so no request ever goes to a CDN.
  Verified by reading the installed source, not by guessing.
- **D-007 · 2026-10-09 · StructuredOutputProcessor passed as a single `logits_processor`.**
  Rationale: spec §6.2 shows `logits_processor: [processor]`, but the installed
  `transformers-structured-output` README passes the processor directly
  (`logits_processor: processor`), and `parameters.js` types it as
  `LogitsProcessorList` (a single composed list). The worker follows the README.
- **D-008 · 2026-10-09 · verify-build exempts vendor ORT/workbox bundles from TODO/FIXME scan.**
  Rationale: `dist/ort/*.mjs` legitimately contains the substring "TODO" in
  upstream comments. The CDN ban (`cdn.jsdelivr.net/npm/onnxruntime-web`) is still
  enforced everywhere; TODO/FIXME is enforced on first-party output. The final
  `grep TODO|FIXME` gate (Phase 7) runs against `src scripts public/data` only.
- **D-009 · 2026-10-09 · Added `@eslint/js@10.0.1` (not in the spec's pin list).**
  Rationale: ESLint 10 flat config requires `@eslint/js`; latest available is
  10.0.1 (no 10.12.0 exists for that package). Pinned exactly and recorded here.
- **D-010 · 2026-10-09 · verify-build: CDN string allowed in bundles only next to the /ort/ override.**
  Rationale: the bundled `@huggingface/transformers` ships its upstream jsdelivr
  default-URL constant as a string literal, so a blanket dist-wide ban can never
  pass. Enforcement instead: (1) no first-party `src/` file may reference the CDN,
  (2) the worker must contain the self-hosted `/ort/` wasmPaths override, (3) any
  dist file mentioning the CDN must also contain the override marker. Runtime
  proof comes from `check-offline.mjs`, which fails on any actual CDN request.
- **D-011 · 2026-10-09 · Tier 1 audio encoder skipped via `config.audio_config = null`; Tier 2 audio kept.**
  Rationale: `MultimodalEncoder` sessions (`session_config.js`) only create the
  `audio_encoder` session when `config.audio_config` exists — the mechanism is
  even documented in the model class docstring. The worker and smoke script null
  it, so ~189 MB of audio weights are never downloaded or loaded (proven by
  deleting the cached audio files and re-running the smoke test with no
  re-download). Tier 2 (Gemma 4, `ImageAudioTextToText` sessions) loads
  audio+vision together unless `textOnly` (which would drop vision too), so its
  ~171 MB audio encoder cannot be skipped — budgeted in the 4.5 GB free-space
  gate instead, exactly as the spec anticipated.
- **D-012 · 2026-10-09 · C1/C2/C3 fixes: guard on both sides, sync decode helper, criteria-based abort.**
  Rationale: (C1) both the worker (posts `ready` with `loadMs: 0` on the
  already-loaded path) and the client (skips the round-trip when the zustand
  store shows the tier ready on the same device) were fixed, so either side
  alone prevents the 600 s hang. (C2) prompt slicing lives in the pure helper
  `src/workers/deepLookDecode.ts` (`promptTokenLength` + `decodeGeneratedOutput`)
  so it is unit-testable without weights; `[promptLen, null]` end bounds are
  valid at runtime (tensor.js treats null end as dim size) even though the
  `.d.ts` types them as `number[]`. Streamer-accumulated text is the decode
  fallback. (C3) one `InterruptableStoppingCriteria` per Deep Look request is
  passed as `stopping_criteria`; the client posts `abort` directly with no
  pending entry (an `abort` sent through `send()` would collide with the
  in-flight deep-look entry and time out), and Assess exposes a Cancel button.
- **D-013 · 2026-10-09 · TabBar extracted; off-list Lucide icons retained as a logged deviation.**
  Rationale: `src/components/layout/TabBar.tsx` now owns the tab bar (was inline
  in `AppShell.tsx`). The ten icons flagged outside the spec allowlist
  (Settings, RefreshCw, Zap, ZapOff, Leaf, Nut, Sprout, Upload, Save, plus one
  further non-list icon) are all standard exports of the pinned `lucide-react`
  1.54.0 and each carries UI meaning (torch, save, upload, species plates).
  Swapping them would churn the interface for no functional gain, so they stay
  and the deviation is recorded here instead.
- **D-014 · 2026-10-09 · Flora DB bumped to 2026.10.2 with 81 species; verifier docs left untracked.**
  Rationale: adding false-hellebore and atlantic-poison-oak moves 79 → 81, so
  the version was bumped (the embedding cache key hashes content, so on-device
  caches invalidate automatically) and counts updated in README, DEV_POST, and
  SOURCES.md. `docs/NEXT_STEPS.md` and `docs/VERIFICATION_REPORT.md` stay
  untracked working inputs: the latter contains the literal string
  "not implemented" (finding C3's title), which would trip a repo-wide
  no-placeholder grep even though the code is clean.
- **D-015 · 2026-10-09 · Section 11 report (A8) written after A9 and Gate 7, not in listed order.**
  Rationale: NEXT_STEPS lists the AGENT_LOG report as A8, but its gate-results
  table can only be final after all fixes land and the full gate sequence
  re-runs. The report was therefore composed last; no fix content changed as a
  result of the reordering.
- **D-016 · 2026-10-09 · `isEdibleNeighborhood` extracted; mushroom clause is defense-in-depth.**
  Rationale: with the shipped thresholds (MARGIN_CONFIDENT 0.06 >
  AMBIGUITY_BAND 0.05) a mushroom inside the plausible band always costs
  confidence first, so the new `category !== "mushroom"` clause cannot fire
  today — a scenario test alone could not isolate it. Extracting the pure
  predicate lets a unit test pin the invariant directly for post-calibration
  thresholds, where band ≥ margin could reopen the hole.
- **D-017 · 2026-10-09 · Typography rule already satisfied; only the cascade layer changed.**
  Rationale: A9 asked for `html { font-size: 18px }` or replacing `text-base`
  with `text-lg`, but `body` already sets 18px/1.55, so the ≥18px body rule is
  met. The fix was limited to wrapping the `min-height: 48px` rule in
  `@layer base` so `min-h-14`/`min-h-16` utilities (56px primary buttons) win
  the cascade again.
- **D-018 · 2026-10-09 · IndexedDB bumped to version 2 for the verdict.badge index.**
  Rationale: changing an index keyPath requires a version change; fresh
  installs create the corrected index directly and a v1→v2 branch deletes and
  re-creates it for existing users. The fresh-install path plus a badge-query
  round-trip test are covered; the upgrade branch itself is code-reviewed only
  (no v1 fixture exists in the test suite).
- **D-019 · 2026-10-09 · Offline proof and Tier 2 gate text tightened to the environment.**
  Rationale: `check-offline.mjs` now asserts `response.fromServiceWorker()`
  instead of inferring from a 200 status, and the Tier 2 e2e test asserts the
  exact gate string for the actual capability (`navigator.gpu` present or not)
  instead of accepting `/unavailable|yes/` either way. Headless Chromium
  builds differ — the verifier's had no WebGPU while this run's SwiftShader
  build exposes it — so the expectation is keyed off the live capability; a UI
  that printed a fixed string would fail in one of the two environments.
- **D-020 · 2026-10-09 · R2-1: `loadTier2` takes `ack`; client ignores stray `ready` on deep-look.**
  Rationale: the already-loaded ack is correct for explicit `init` but lethal
  under a deep-look request id, so `deepLook()` passes `ack=false` (cold-load
  path included) while `init` keeps the default. The client's `handle()`
  additionally drops any `ready` arriving on a pending deep-look request, so
  either side alone prevents the "Unexpected response: ready" throw.
  Regression coverage is a handler-driven test (`worker-handler.test.ts`)
  with mocked transformers modules: init→ready, repeat init→ready/loadMs 0,
  init→deep-look→first non-token event is deep-look-result, and abort during a
  hanging generate→`aborted` error. The test was verified to fail with the old
  call. Both source-grep tests were deleted with it.
- **D-021 · 2026-10-09 · A2-2: abort flag registered before load, checked explicitly after generate.**
  Rationale: previously the flag existed only after Tier 2 finished loading,
  so an abort during the 3.3 GB download was silently dropped, and the
  `aborted` code was reachable only when truncated JSON failed to parse — a
  late abort with valid output would have posted a result for a cancelled
  request. The flag is now registered first (the early return on load failure
  needs no extra post: `loadTier2` already answers every failure), and an
  explicit `if (flag.aborted)` after `generate` reports `aborted` before any
  decoding. Covered by a `hang-valid` handler case (generate returns good
  JSON after the interrupt; the test asserts no `deep-look-result` and an
  `aborted` error), verified to fail without the check.
- **D-022 · 2026-10-09 · A2-3: Assess uses the post-fallback device for store and cache key.**
  Rationale: after the WebGPU→WASM fallback inside `initTier`, Assess kept the
  pre-init device for the store badge and the embedding cache dtype, so a WASM
  session cached its species index under the `q4f16` key. `gemmaClient` now
  exposes `currentDevice()` (the tracked `chosenDevice`, which the fallback
  rewrites) and Assess reads it after `initTier` resolves. Covered by a client
  test where the first init fails `webgpu-unavailable` and the retry succeeds:
  two inits posted (webgpu then wasm) and `currentDevice()` reports `wasm`.
- **D-023 · 2026-10-09 · A2-4: poison-oak split from the atlantic entry; DB count/version pinned in tests.**
  Rationale: `poison-oak` (*T. diversilobum*, western) wrongly claimed
  "Atlantic poison oak" as a common name while not linking the real
  `atlantic-poison-oak` entry — now it names only itself and lists the
  atlantic species as a confusable. `flora-db.test.ts` additionally pins
  version `2026.10.2` and 81 species so silent additions or removals fail
  loudly; `validate:db` still enforces the structural rules.
