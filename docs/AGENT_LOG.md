# TrailSnack — Agent Build Log

Autonomous build by Muse Spark 1.3 in OpenCode. Append-only journal.
Repo root: `trailsnack/`. All commands run from repo root unless noted.

## Phase 0 — Environment Verification (2026-10-09)

Commands:

```bash
node --version        # v24.15.0 (>=22 OK)
npm --version         # 11.12.1 (>=10 OK)
git --version         # git version 2.50.1 (Apple Git-155)
python3 --version     # Python 3.9.10
curl -s https://huggingface.co/api/models/onnx-community/embeddinggemma-2-ONNX | head -c 300
curl -s https://huggingface.co/api/models/onnx-community/gemma-4-E2B-it-ONNX | head -c 300
for p in ...; do npm view $p version; done
```

Results:
- Both HF repos return JSON with `"id"` matching. Tier 1 `pipeline_tag: feature-extraction`,
  `library_name: transformers.js`, Apache-2.0. Tier 2 `pipeline_tag: any-to-any`,
  `library_name: transformers.js`, Apache-2.0, arch `Gemma4ForConditionalGeneration`.
- Non-existent repo `onnx-community/paligemma-3b-mix-224-ONNX` never referenced (per spec).
- EmbeddingGemma 2 model card (raw README.md) confirms:
  - 740M total (270M text + 170M vision + 300M audio, selectively loadable).
  - Shared 768-d space, Matryoshka 128/256/512/768, 8K context.
  - Task prefixes: query `task: search result | query: {query}`,
    document `title: {title} | text: {content}` ("Task Instruction Prefixes" section).
    Images passed without prefix; image-as-query vs text-documents is the supported pattern.
  - File list confirms separate `onnx/audio_encoder_*`, `vision_encoder_*`, `model_*`
    files, so audio encoder can be skipped by not requesting audio dtype/files.
- Resolved dependency table (pinned exactly, no ^/~):

| package | pinned |
|---|---|
| @huggingface/transformers | 4.3.1 |
| @huggingface/transformers-structured-output | 4.3.1 |
| vite | 8.3.4 |
| @vitejs/plugin-react | 6.1.2 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| typescript | 5.9.3 (NOT 7.0.2 — see decision D-001) |
| tailwindcss | 4.3.3 |
| @tailwindcss/vite | 4.3.3 |
| vite-plugin-pwa | 2.0.0 |
| idb | 8.0.4 |
| lucide-react | 1.54.0 |
| zustand | 5.0.15 |
| react-router-dom | 7.18.4 |
| vitest | 5.0.3 |
| @playwright/test | 1.64.0 |
| eslint | 10.12.0 |
| typescript-eslint | 8.71.1 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @types/node | 26.6.4 |
| jsdom | 30.1.2 |
| @testing-library/react | 16.3.3 |
| @testing-library/jest-dom | 7.0.1 |
| fake-indexeddb | 6.2.5 |

- Gate 0: PASS (Node>=22, both HF ids present, all versions resolved).

## Phase 1 — Scaffold (in progress)

- `npm create vite` cancelled (non-empty dir with docs/scripts); scaffolding manually
  with identical output shape (react-ts template equivalent). Decision logged in DECISIONS.md.
- TypeScript pinned to 5.9.3 (latest 5.x) because typescript-eslint 8.71.1 does not
  declare support for TS 7 (TS 7 released after the ESLint toolchain); avoids
  `typescript-eslint` parse failures. Verified `npm view typescript@5` latest = 5.9.3.
