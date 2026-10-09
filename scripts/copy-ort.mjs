import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const src = new URL("../node_modules/onnxruntime-web/dist/", import.meta.url);
const dest = new URL("../public/ort/", import.meta.url);

mkdirSync(dest, { recursive: true });

const toURL = (u) => new URL(u).pathname;

if (!existsSync(src)) {
  console.error(`onnxruntime-web dist not found at ${toURL(src)}. Run npm install first.`);
  process.exit(1);
}

const entries = readdirSync(src).filter((f) => f.endsWith(".wasm") || f.endsWith(".mjs"));
if (entries.length === 0) {
  console.error("No .wasm/.mjs files found in onnxruntime-web/dist");
  process.exit(1);
}

let total = 0;
for (const f of entries) {
  cpSync(join(toURL(src), f), join(toURL(dest), f));
  total += statSync(join(toURL(dest), f)).size;
  console.log(`ort/${f}`);
}
console.log(`copied ${entries.length} files, ${(total / 1024 / 1024).toFixed(2)} MB -> public/ort/`);
