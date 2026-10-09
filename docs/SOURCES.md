# TrailSnack — Sources & Provenance

## Explicit statement

The `flora_safety_db.json` dataset (79 species, 12 universal rules, emergency
numbers) was **authored by an AI agent (Muse Spark 1.3, via OpenCode) from
general botanical/mycological knowledge** during an autonomous build session. It
was **not** written or reviewed by a qualified botanist, mycologist, or medical
professional. **It must be reviewed by a qualified expert before anyone relies
on it, and the app itself never clears anything for ingestion regardless.**

## Reference categories used

- Regional poison control centres (US 1-800-222-1222; UK NHS 111 / IE 01 809 2166;
  EU national centres via 112; AU 13 11 26 / NZ 0800 764 766) — emergency numbers
  only; medical content is general field-guide knowledge, not their advice.
- National park and university extension-service foraging safety guidance
  (leave-no-trace, lookalike warnings, "no app confirms mushrooms" policies).
- Standard field-guide knowledge (edibility classes, amatoxin latency, umbellifer
  and Amanita identification rules, universal-edibility-test debunking).

## Technical sources

- EmbeddingGemma 2 model card: https://huggingface.co/onnx-community/embeddinggemma-2-ONNX
  (task instruction prefixes, 768-d shared space, Matryoshka truncation).
- Gemma 4 E2B model card: https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX
  (Gemma4ForConditionalGeneration, Apache-2.0).
- Transformers.js docs (https://huggingface.co/docs/transformers.js): AutoProcessor /
  AutoModel, env.cacheKey (`transformers-cache`), WASM paths, TextStreamer,
  StoppingCriteria.
- transformers-structured-output README (in node_modules): StructuredOutputProcessor
  JSON-schema constrained generation.
- Fixture photo attributions: see fixtures/ATTRIBUTION.md.

## Credits

Google DeepMind (Gemma family), Hugging Face (`onnx-community` ONNX exports,
Transformers.js), Lucide icon authors, Render (static hosting).
