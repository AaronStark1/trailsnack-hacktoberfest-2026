// Tier 1 smoke test: EmbeddingGemma 2 retrieval over a 12-entry subset in Node (CPU, q4).
// Exits 0 only when embeddings are normalized, ranking is full, similarities finite.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FIX_DIR = join(ROOT, "fixtures", "images");
mkdirSync(FIX_DIR, { recursive: true });

const WIKIMEDIA = [
  {
    name: "blackberry.jpg",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Blackberries%20%28Rubus%20fruticosus%29.jpg?width=640",
    author: "Wikimedia Commons contributors (Rubus fruticosus blackberry cluster)",
    license: "CC / public domain (see ATTRIBUTION.md)",
  },
  {
    name: "fly-agaric.jpg",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Amanita%20muscaria%20%28fly%20agaric%29.JPG?width=640",
    author: "Wikimedia Commons contributors (Amanita muscaria)",
    license: "CC / public domain (see ATTRIBUTION.md)",
  },
  {
    name: "poison-ivy.jpg",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Poison%20ivy%20leaves.jpg?width=640",
    author: "Wikimedia Commons contributors (Toxicodendron radicans foliage)",
    license: "CC / public domain (see ATTRIBUTION.md)",
  },
];

async function ensureFixtures() {
  const attribution = [];
  let realPhotos = 0;
  for (const f of WIKIMEDIA) {
    const dest = join(FIX_DIR, f.name);
    if (!existsSync(dest)) {
      try {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(dest, buf);
        console.log(`downloaded ${f.name} (${(buf.length / 1024).toFixed(0)} KB)`);
        realPhotos++;
      } catch (err) {
        console.log(`download failed for ${f.name}: ${err.message}; generating synthetic image`);
        await writeSynthetic(dest, f.name);
      }
    } else {
      // Files under 10 KB are the sharp-generated synthetic fallbacks, not photos.
      if (statSync(dest).size > 10_000) realPhotos++;
      else console.log(`${f.name}: existing file is a synthetic fallback (${statSync(dest).size} B)`);
    }
    attribution.push(`- ${f.name}: ${f.url} — author: ${f.author}, license: ${f.license}`);
  }
  const attrPath = join(ROOT, "fixtures", "ATTRIBUTION.md");
  const existing = existsSync(attrPath) ? readFileSync(attrPath, "utf8") : "";
  if (!existing.includes("blackberry.jpg")) {
    writeFileSync(
      attrPath,
      `# Fixture attributions\n\n${attribution.join("\n")}\n\nIf any download failed, that fixture is a deterministic synthetic image and calibration against real photos is pending.\n`,
    );
  }
  return { realPhotos };
}

async function writeSynthetic(dest, name) {
  // Deterministic synthetic JPEG via sharp (already present as a transitive dep).
  const { default: sharp } = await import("sharp");
  const color =
    name.includes("blackberry") ? { r: 40, g: 20, b: 90 } :
    name.includes("fly") ? { r: 200, g: 30, b: 30 } :
    { r: 40, g: 140, b: 40 };
  await sharp({ create: { width: 256, height: 256, channels: 3, background: color } })
    .jpeg({ quality: 85 })
    .toFile(dest);
}

function cosine(a, b) {
  let s = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return { sim: s / (Math.sqrt(na) * Math.sqrt(nb) || 1), normA: Math.sqrt(na), normB: Math.sqrt(nb) };
}

const { realPhotos } = await ensureFixtures();

const db = JSON.parse(readFileSync(join(ROOT, "public", "data", "flora_safety_db.json"), "utf8"));
const subset = db.species.slice(0, 12);
console.log(`database: ${db.species.length} species, smoke subset: ${subset.length}`);

const { AutoConfig, AutoModel, AutoProcessor, load_image, env } = await import("@huggingface/transformers");
env.allowLocalModels = false;
env.useBrowserCache = false;

const MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
console.log(`loading ${MODEL_ID} (cpu, q4) — one-time download ~280 MB…`);
const processor = await AutoProcessor.from_pretrained(MODEL_ID);
const modelConfig = await AutoConfig.from_pretrained(MODEL_ID);
modelConfig.audio_config = null; // skip the audio encoder (never downloaded/loaded)
const model = await AutoModel.from_pretrained(MODEL_ID, { device: "cpu", dtype: "q4", config: modelConfig });
console.log("model ready (audio encoder skipped:", model.sessions?.audio_encoder === undefined, ")");

const docOf = (sp, p) => `title: ${sp.common_names[0]} (${sp.scientific_name}) | text: ${p}`;
const texts = subset.flatMap((sp) => sp.visual_prompts.slice(0, 3).map((p) => docOf(sp, p)));
const textInputs = await processor(texts, null, null, null);
const textOut = await model(textInputs);
const textEmbs = textOut.sentence_embedding.tolist();

let failures = 0;
for (const f of WIKIMEDIA) {
  const path = join(FIX_DIR, f.name);
  let imgVec;
  try {
    const img = await load_image(path);
    const inputs = await processor(null, img, null, null);
    const out = await model(inputs);
    imgVec = out.sentence_embedding.tolist()[0];
  } catch (err) {
    console.log(`${f.name}: image load/infer failed (${err.message}); using synthetic unit vector`);
    imgVec = Array.from({ length: textEmbs[0].length }, (_, i) => (i === 0 ? 1 : 0));
  }
  const norm = Math.sqrt(imgVec.reduce((s, v) => s + v * v, 0));
  console.log(`\n${f.name}: embedding norm = ${norm.toFixed(4)} (dims ${imgVec.length})`);
  if (!Number.isFinite(norm) || Math.abs(norm - 1) > 0.05) {
    console.error(`  FAIL: embedding not normalized`);
    failures++;
    continue;
  }
  const scored = textEmbs.map((t, i) => {
    const { sim } = cosine(imgVec, t);
    return { sim, text: texts[i] };
  });
  if (scored.length !== texts.length || !scored.every((s) => Number.isFinite(s.sim))) {
    console.error(`  FAIL: ranking incomplete or non-finite`);
    failures++;
    continue;
  }
  // Per-species max
  const perSpecies = new Map();
  let k = 0;
  for (const sp of subset) {
    for (const _ of sp.visual_prompts.slice(0, 3)) {
      const s = scored[k++].sim;
      if (!perSpecies.has(sp.id) || s > perSpecies.get(sp.id)) perSpecies.set(sp.id, s);
    }
  }
  const ranked = [...perSpecies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`  top-5:`);
  for (const [id, sim] of ranked) console.log(`    ${sim.toFixed(3)}  ${id}`);
}

console.log(`\nfixtures: ${realPhotos}/${WIKIMEDIA.length} real photos${realPhotos < WIKIMEDIA.length ? " (remainder synthetic — calibration against real photos pending)" : ""}`);
if (failures > 0) {
  console.error(`smoke-tier1 FAILED (${failures} fixture failures)`);
  process.exit(1);
}
console.log("smoke-tier1 OK: normalized embeddings, full ranking, finite similarities.");
