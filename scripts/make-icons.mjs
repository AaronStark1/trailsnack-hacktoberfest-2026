import { mkdirSync, writeFileSync } from "node:fs";

const dir = new URL("../public/icons/", import.meta.url);
mkdirSync(dir, { recursive: true });
const toPath = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
<radialGradient id="g" cx="0.22" cy="0.1" r="1">
<stop offset="0" stop-color="#1d4d33"/>
<stop offset="0.55" stop-color="#0d1712"/>
<stop offset="1" stop-color="#070d09"/>
</radialGradient>
</defs>
<rect width="512" height="512" fill="url(#g)"/>
<g transform="translate(96 88) scale(10)" fill="none" stroke="#f5efe2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M7 29c.6-8 4.6-14.6 13-19"/>
<path d="M20 10c-.4-4.2 2.8-7.6 8.500-7.500.3 5.400-3 8.700-8.500 7.500Z"/>
<path d="M11.600 18.200c-4.300.6-7.600-2-8.300-6.700 4.700-.5 7.900 2.200 8.300 6.700Z"/>
<path d="M14.200 14.600c1.900.2 3.300 1 4.200 2.300M10.300 21.400c1.600.3 2.800 1 3.600 2M20.500 21.300l1.700 1.800" stroke-width="1.2"/>
<g stroke="none" fill="#e59a34">
<circle cx="20.300" cy="19.200" r="3.300"/>
<circle cx="15.600" cy="25.200" r="3"/>
<circle cx="24" cy="25.400" r="2.700"/>
</g>
</g>
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
