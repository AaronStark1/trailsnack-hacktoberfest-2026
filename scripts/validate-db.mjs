import { readFileSync } from "node:fs";

const DB_PATH = new URL("../public/data/flora_safety_db.json", import.meta.url);
const SCHEMA_PATH = new URL("../src/engine/schema.json", import.meta.url);

function fail(msg) {
  console.error(`validate-db FAILED: ${msg}`);
  process.exit(1);
}

let db;
try {
  db = JSON.parse(readFileSync(DB_PATH, "utf8"));
} catch (err) {
  fail(`cannot read/parse flora_safety_db.json: ${err.message}`);
}

// Schema file must exist and require >= 72 species (keeps JSON and validator in sync).
let schema;
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
} catch (err) {
  fail(`cannot read schema.json: ${err.message}`);
}
const schemaMin = schema?.properties?.species?.minItems ?? 72;
if (schemaMin < 72) fail(`schema minItems ${schemaMin} < 72`);

if (typeof db.version !== "string" || db.version.length === 0) fail("missing version");
if (typeof db.disclaimer !== "string" || db.disclaimer.length === 0) fail("missing disclaimer");
if (!Array.isArray(db.universal_rules) || db.universal_rules.length < 10) {
  fail(`universal_rules must have >= 10 entries (got ${db.universal_rules?.length ?? 0})`);
}
for (const r of db.universal_rules) {
  if (!r.id || !Array.isArray(r.applies_to) || r.applies_to.length === 0 || !r.text) {
    fail(`malformed universal rule: ${JSON.stringify(r).slice(0, 120)}`);
  }
  for (const a of r.applies_to) {
    if (!["berry", "mushroom", "plant"].includes(a)) fail(`bad applies_to ${a} in rule ${r.id}`);
  }
}

if (!Array.isArray(db.species) || db.species.length < 72) {
  fail(`species must have >= 72 entries (got ${db.species?.length ?? 0})`);
}

const seen = new Set();
const ids = new Set(db.species.map((s) => s.id));
const ED = new Set(["edible_with_caution", "not_recommended", "toxic", "deadly", "contact_hazard"]);
const CAT = new Set(["berry", "mushroom", "plant"]);

for (const sp of db.species) {
  if (!sp.id || seen.has(sp.id)) fail(`duplicate or missing id: ${sp.id}`);
  seen.add(sp.id);
  if (!/^[a-z0-9-]+$/.test(sp.id)) fail(`bad id format: ${sp.id}`);
  if (!Array.isArray(sp.common_names) || sp.common_names.length === 0) fail(`${sp.id}: common_names empty`);
  if (!sp.scientific_name) fail(`${sp.id}: scientific_name missing`);
  if (!CAT.has(sp.category)) fail(`${sp.id}: bad category`);
  if (!ED.has(sp.edibility)) fail(`${sp.id}: bad edibility`);
  for (const f of ["toxicity_mechanism", "habitat", "symptoms_if_ingested", "onset", "contact_precautions", "notes"]) {
    if (typeof sp[f] !== "string" || sp[f].length === 0) fail(`${sp.id}: ${f} missing`);
  }
  if (!Array.isArray(sp.regions) || sp.regions.length === 0) fail(`${sp.id}: regions empty`);
  if (!Array.isArray(sp.seasons) || sp.seasons.length === 0) fail(`${sp.id}: seasons empty`);
  if (!Array.isArray(sp.visual_prompts) || sp.visual_prompts.length < 3) {
    fail(`${sp.id}: visual_prompts needs >= 3 (got ${sp.visual_prompts?.length ?? 0})`);
  }
  if (!Array.isArray(sp.verification_checklist) || sp.verification_checklist.length < 5) {
    fail(`${sp.id}: verification_checklist needs >= 5 (got ${sp.verification_checklist?.length ?? 0})`);
  }
  if (!Array.isArray(sp.confusable_with)) fail(`${sp.id}: confusable_with must be an array`);
  for (const c of sp.confusable_with) {
    if (!ids.has(c.species_id)) fail(`${sp.id}: confusable ${c.species_id} does not resolve`);
    if (!c.how_to_tell_apart) fail(`${sp.id}: how_to_tell_apart missing for ${c.species_id}`);
  }
  if (!Array.isArray(sp.first_aid) || sp.first_aid.length === 0) fail(`${sp.id}: first_aid empty`);
}

if (!db.emergency || !Array.isArray(db.emergency.universal) || db.emergency.universal.length === 0) {
  fail("emergency.universal missing");
}
if (!Array.isArray(db.emergency.regions) || db.emergency.regions.length === 0) fail("emergency.regions missing");

const counts = { berry: 0, mushroom: 0, plant: 0 };
for (const sp of db.species) counts[sp.category]++;
console.log(
  `validate-db OK: version ${db.version}, ${db.species.length} species ` +
    `(berry ${counts.berry}, mushroom ${counts.mushroom}, plant ${counts.plant}), ` +
    `${db.universal_rules.length} universal rules, all cross-references resolve.`,
);
