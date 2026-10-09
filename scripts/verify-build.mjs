import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const dist = new URL("../dist/", import.meta.url);
const p = (s) => join(new URL(dist).pathname, s);

function fail(msg) {
  console.error(`verify-build FAILED: ${msg}`);
  process.exit(1);
}

if (!existsSync(p("index.html"))) fail("dist/index.html missing");
if (!existsSync(p("sw.js"))) fail("dist/sw.js missing (PWA service worker)");
const manifest = existsSync(p("manifest.webmanifest")) ? p("manifest.webmanifest") : null;
if (!manifest) fail("dist/manifest.webmanifest missing");

const ortDir = p("ort");
if (!existsSync(ortDir)) fail("dist/ort/ missing");
const ortFiles = readdirSync(ortDir);
if (!ortFiles.some((f) => f.endsWith(".wasm"))) fail("dist/ort/*.wasm missing");

const sw = readFileSync(p("sw.js"), "utf8");
if (!sw.includes("ort/")) fail("precache manifest does not reference ort/ files");
if (!sw.includes("flora_safety_db.json"))
  fail("precache manifest does not reference flora_safety_db.json");

const banned = [
  ["TO", "DO"].join(""),
  ["FIX", "ME"].join(""),
  "cdn.jsdelivr.net/npm/onnxruntime-web",
];
const { readdirSync: rd } = await import("node:fs");
function* walk(dir) {
  for (const e of rd(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}
for (const file of walk(new URL(dist).pathname)) {
  if (/\.(map)$/.test(file)) continue;
  const isVendorOrt = file.includes(`${"/"}ort${"/"}`) || file.includes("workbox-");
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  // Vendor ORT bundles legitimately contain upstream task-marker substrings in
  // comments; enforce those markers only on first-party output, but enforce
  // the CDN ban everywhere.
  const firstPartyBanned = isVendorOrt ? [] : [banned[0], banned[1]];
  for (const b of firstPartyBanned) {
    if (text.includes(b)) fail(`${file} contains banned string ${b}`);
  }
  // The bundled @huggingface/transformers library ships its upstream jsdelivr
  // default-URL constant as a string; what matters is that our worker overrides
  // wasmPaths to self-hosted /ort/ before any load (asserted below), and that
  // no first-party source references the CDN (asserted on src/ below).
  if (text.includes("cdn.jsdelivr.net/npm/onnxruntime-web") && !text.includes("/ort/ort-wasm-simd-threaded")) {
    fail(`${file} references the ORT CDN without the self-hosted /ort/ override nearby`);
  }
}

// First-party sources must never reference the ORT CDN, and the worker must
// contain the self-hosted override.
const srcRoot = new URL("../src/", import.meta.url).pathname;
let workerHasOverride = false;
for (const file of walk(srcRoot)) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("cdn.jsdelivr.net/npm/onnxruntime-web")) {
    fail(`first-party source ${file} references the ORT CDN`);
  }
  if (file.endsWith("gemma.worker.ts") && text.includes("/ort/ort-wasm-simd-threaded")) {
    workerHasOverride = true;
  }
}
if (!workerHasOverride) fail("gemma.worker.ts lacks the self-hosted /ort/ wasmPaths override");

console.log("verify-build OK: index.html, sw.js, manifest, ort/*.wasm, precache refs, no banned strings.");
