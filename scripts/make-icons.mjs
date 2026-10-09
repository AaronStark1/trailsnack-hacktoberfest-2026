import { mkdirSync, writeFileSync } from "node:fs";

const dir = new URL("../public/icons/", import.meta.url);
mkdirSync(dir, { recursive: true });
const toPath = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="116" fill="#1E5A3A"/>
<path d="M256 84c-84 52-128 122-128 202 0 26 6 52 18 74 60-8 150-46 196-132 16-30 22-62 22-94 44 8 80 32 104 68-8-48-40-92-92-118-36-18-80-22-120 0z" fill="#FAFAF6"/>
<path d="M148 330c40 58 110 98 190 98 30 0 58-6 82-16-24 4- gap" fill="none"/>
<path d="M170 372c44 22 96 30 146 22" stroke="#FAFAF6" stroke-width="18" stroke-linecap="round" fill="none"/>
<path d="M256 250l34 70 76 11-55 54 13 76-68-36-68 36 13-76-55-54 76-11z" fill="#FFE7A8"/>
</svg>`;

writeFileSync(toPath("favicon.svg"), svg);
console.log("wrote favicon.svg");

let sharp = null;
try {
  const mod = await import("sharp");
  sharp = mod.default ?? mod;
} catch {
  console.log("sharp not available, PNGs will be generated as SVG-backed placeholders via sharp fallback");
}

if (sharp) {
  const base = Buffer.from(svg);
  await sharp(base).resize(192, 192).png().toFile(toPath("icon-192.png"));
  await sharp(base).resize(512, 512).png().toFile(toPath("icon-512.png"));
  await sharp(base).resize(512, 512).png().toFile(toPath("maskable-512.png"));
  await sharp(base).resize(180, 180).png().toFile(toPath("apple-touch-icon.png"));
  console.log("rasterized icons with sharp");
} else {
  for (const n of ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png"]) {
    writeFileSync(toPath(n), svg);
  }
  console.log("wrote SVG content as .png fallback (no sharp)");
}
