// Threshold calibration: sweep ABS_MIN / CONFIDENT / MARGIN on labeled photos.
// Usage: npm run calibrate -- --dir fixtures/images --labels fixtures/labels.json
// labels.json: [{ "file": "blackberry.jpg", "speciesId": "allegheny-blackberry" }]
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

if (args.includes("--help") || !flag("--dir") || !flag("--labels")) {
  console.log(`calibrate: sweep similarity thresholds on labeled photos.

Usage:
  npm run calibrate -- --dir fixtures/images --labels fixtures/labels.json

labels.json: [{ "file": "blackberry.jpg", "speciesId": "allegheny-blackberry" }]

Embeds each photo with Tier 1 (Node, cpu, q4), ranks against every visual prompt
in the full database, and reports top-1 accuracy, ambiguity-band hit rate, and
the similarity distribution used to pick thresholds in src/engine/thresholds.ts.
`);
  process.exit(args.includes("--help") ? 0 : 1);
}

const ROOT = new URL("..", import.meta.url).pathname;
const dir = flag("--dir");
const labelsPath = flag("--labels");
if (!existsSync(labelsPath)) {
  console.error(`labels file not found: ${labelsPath}`);
  process.exit(1);
}
const labels = JSON.parse(readFileSync(labelsPath, "utf8"));

const db = JSON.parse(readFileSync(join(ROOT, "public", "data", "flora_safety_db.json"), "utf8"));
const { AutoModel, AutoProcessor, load_image, env } = await import("@huggingface/transformers");
env.allowLocalModels = false;
env.useBrowserCache = false;

const MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL_ID);
const model = await AutoModel.from_pretrained(MODEL_ID, { device: "cpu", dtype: "q4" });

const docOf = (sp, p) => `title: ${sp.common_names[0]} (${sp.scientific_name}) | text: ${p}`;
const docs = [];
const docSpecies = [];
for (const s of db.species) {
  for (const p of s.visual_prompts) {
    docs.push(docOf(s, p));
    docSpecies.push(s.id);
  }
}
const textInputs = await processor(docs, null, null, null);
const textEmbs = (await model(textInputs)).sentence_embedding.tolist();

function cos(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

let top1Hits = 0;
let bandHits = 0;
let evaluated = 0;
const top1Sims = [];
for (const item of labels) {
  const path = join(dir, item.file);
  if (!existsSync(path)) {
    console.log(`skip ${item.file}: not found`);
    continue;
  }
  const img = await load_image(path);
  const vec = (await model(await processor(null, img, null, null))).sentence_embedding.tolist()[0];
  const scored = textEmbs.map((t, i) => ({ sim: cos(vec, t), species: docSpecies[i] }));
  const perSpecies = new Map();
  for (const s of scored) {
    if (!perSpecies.has(s.species) || s.sim > perSpecies.get(s.species)) perSpecies.set(s.species, s.sim);
  }
  const ranked = [...perSpecies.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  top1Sims.push(top[1]);
  const inBand = ranked.filter(([, sim]) => sim >= Math.max(0.3, top[1] - 0.05)).map(([id]) => id);
  const okTop = top[0] === item.speciesId;
  const okBand = inBand.includes(item.speciesId);
  if (okTop) top1Hits++;
  if (okBand) bandHits++;
  evaluated++;
  console.log(`${okTop ? "HIT " : "MISS"} top1=${top[0]}@${top[1].toFixed(3)} label=${item.speciesId} band=[${inBand.slice(0, 4).join(",")}] ${item.file}`);
}

top1Sims.sort((a, b) => a - b);
const pct = (q) => (top1Sims.length ? top1Sims[Math.min(top1Sims.length - 1, Math.floor(q * top1Sims.length))].toFixed(3) : "n/a");
console.log(`\nevaluated=${evaluated} top1-acc=${evaluated ? (top1Hits / evaluated).toFixed(2) : "n/a"} band-hit=${evaluated ? (bandHits / evaluated).toFixed(2) : "n/a"}`);
console.log(`top1 similarity p10=${pct(0.1)} p50=${pct(0.5)} min=${top1Sims.length ? top1Sims[0].toFixed(3) : "n/a"}`);
console.log("Use the p10/p50 spread to set ABS_MIN_SIMILARITY and CONFIDENT_SIMILARITY in src/engine/thresholds.ts.");
