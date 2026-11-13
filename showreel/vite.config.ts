import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * The reel ships as one file: after the bundle is written, the script and the
 * stylesheet are folded into the HTML (fonts are already data URIs), so the
 * harness opens from disk with no server and no network.
 */
function singleFile(): Plugin {
  return {
    name: "trailsnack-reel-single-file",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((f) => f.type === "asset" && f.fileName.endsWith(".html"));
      if (!html || html.type !== "asset") return;
      let page = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "chunk") {
          const code = file.code.replaceAll("</script", "<\\/script");
          page = page.replace(new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`), () => `<script type="module">${code}</script>`);
          delete bundle[name];
        } else if (name.endsWith(".css")) {
          page = page.replace(new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`), () => `<style>${String(file.source)}</style>`);
          delete bundle[name];
        }
      }
      html.source = page;
      html.fileName = "trailsnack-reel.html";
    },
  };
}

export default defineConfig({
  root: decodeURIComponent(new URL(".", import.meta.url).pathname),
  base: "./",
  publicDir: false,
  plugins: [tailwindcss(), singleFile()],
  build: {
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 64 * 1024 * 1024,
    chunkSizeWarningLimit: 4000,
  },
});
