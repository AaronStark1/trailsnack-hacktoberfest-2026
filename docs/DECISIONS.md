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
