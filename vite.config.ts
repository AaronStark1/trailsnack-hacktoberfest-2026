import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [
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
        theme_color: "#1E5A3A",
        background_color: "#FAFAF6",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
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
        globPatterns: ["**/*.{js,mjs,css,html,ico,png,svg,webmanifest,wasm,json}"],
        maximumFileSizeToCacheInBytes: 80 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  worker: { format: "es" },
  build: { target: "esnext", sourcemap: false, chunkSizeWarningLimit: 3000 },
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
});
