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
