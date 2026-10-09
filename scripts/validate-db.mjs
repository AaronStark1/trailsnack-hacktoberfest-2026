import { readFileSync } from "node:fs";

const dbPath = new URL("../public/data/flora_safety_db.json", import.meta.url);
let db;
try {
  db = JSON.parse(readFileSync(dbPath, "utf8"));
} catch (err) {
  console.error(`validate-db FAILED: cannot read/parse flora_safety_db.json: ${err.message}`);
  process.exit(1);
}

const fail = (msg) => {
  console.error(`validate-db FAILED: ${msg}`);
  process.exit(1);
};

if (typeof db.version !== "string" || db.version.length === 0) fail("missing version");
if (typeof db.disclaimer !== "string" || db.disclaimer.length === 0) fail("missing disclaimer");
if (!Array.isArray(db.species) || db.species.length === 0) fail("species must be a non-empty array");
if (!db.emergency || !Array.isArray(db.emergency.universal)) fail("missing emergency.universal");

console.log(`validate-db OK (scaffold): version ${db.version}, ${db.species.length} species (full 72+ check lands in Phase 4).`);
