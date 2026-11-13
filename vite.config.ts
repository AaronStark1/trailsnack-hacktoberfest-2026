import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

/**
 * The site has two documents: index.html is the landing page at "/", and
 * app.html is the application shell for every other route (/scan, /assess/…).
 * Static hosts do this with a rewrite rule (see render.yaml); this gives the
 * dev and preview servers the same behaviour, which would otherwise fall back
 * to index.html for client-side routes.
 */
function appShellFallback(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    const wantsPage = req.method === "GET" && String(req.headers.accept ?? "").includes("text/html");
    const isAsset = path.includes(".") || path.startsWith("/@") || path.startsWith("/src/") || path.startsWith("/node_modules/");
    if (wantsPage && path !== "/" && !isAsset) req.url = "/app.html";
    next();
  };
  return {
    name: "trailsnack-app-shell-fallback",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [
    appShellFallback(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      includeAssets: ["icons/*.png", "icons/*.svg", "ort/*"],
      manifest: {
        name: "TrailSnack — Offline Trail Forager",
        short_name: "TrailSnack",
        description:
          "Offline-first trail companion: identify wild berries, plants and mushrooms with on-device Gemma AI and a deterministic safety database.",
        theme_color: "#060b08",
        background_color: "#060b08",
        display: "standalone",
        orientation: "portrait",
        // The installed app opens on the scanner; the landing page is for the browser.
        start_url: "/scan",
        scope: "/",
        categories: ["health", "education", "travel"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,ico,png,svg,webmanifest,wasm,json,woff2}"],
        maximumFileSizeToCacheInBytes: 80 * 1024 * 1024,
        // Offline navigations go to the app shell — except "/", the landing page.
        navigateFallback: "/app.html",
        navigateFallbackDenylist: [/^\/$/, /^\/index\.html$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  worker: { format: "es" },
  build: {
    target: "esnext",
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: { input: { landing: "index.html", app: "app.html" } },
  },
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
});
