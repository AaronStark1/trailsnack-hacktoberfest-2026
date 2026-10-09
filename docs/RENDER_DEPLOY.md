# Hosting TrailSnack on Render

This guide takes the repository from your machine to a public URL on Render. It assumes nothing about Render and takes about fifteen minutes the first time.

## What you are deploying

TrailSnack is a static Progressive Web App. The production build is a folder of HTML, JavaScript, CSS, icons, the flora database, and the ONNX Runtime binaries, about 130 MB in total. There is no server code and no database on Render.

The Gemma model weights are **not** part of the deployment. The browser downloads them from Hugging Face the first time a user runs setup and stores them locally. Render only ever serves the app shell. This keeps Render bandwidth low and is why the free tier is enough.

The repository already contains `render.yaml`, a Render Blueprint. It tells Render how to build the site and sets several HTTP headers the app cannot work without.

## Prerequisites

- A GitHub account with this repository pushed to it. The repository has not been pushed yet; do that first:
  ```bash
  cd /path/to/trailsnack
  gh repo create trailsnack --public --source=. --push
  # or create an empty repo on github.com and:
  # git remote add origin git@github.com:<you>/trailsnack.git && git push -u origin main
  ```
- A Render account at https://render.com. The free plan works. Sign in with GitHub so Render can see the repository.
- The build passing locally. Run this once before deploying so you are not debugging on Render:
  ```bash
  npm ci && npm run build
  ```

## Deploy with the Blueprint (recommended)

1. In the Render dashboard click **New +** in the top right and choose **Blueprint**.
2. Connect your GitHub account if prompted, then pick the `trailsnack` repository.
3. Render reads `render.yaml` and shows one service: a static site named `trailsnack`. Give the Blueprint a name (anything) and click **Apply**.
4. Render clones the repository and runs the build command from the file, `npm ci && npm run build`. Watch the log. The build takes one to two minutes. The `postbuild` step runs `verify-build.mjs`, which checks that the service worker, manifest, ONNX binaries, and database are all present.
5. When the log says "Your site is live", click the URL at the top of the service page. It looks like `https://trailsnack-xxxx.onrender.com`.

The Blueprint sets these behaviours automatically:

| Setting | Why it matters |
|---|---|
| `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on every path | Enables cross-origin isolation, which the browser requires for `SharedArrayBuffer`. Without it, multi-threaded WASM and WebGPU inference do not work and the model runs single-threaded or fails. |
| `Cache-Control: no-cache` on `/sw.js` | The service worker must be re-checked on every visit, or users never receive updates. |
| `Cache-Control: public, max-age=31536000, immutable` on `/ort/*` and `/assets/*` | The runtime binaries and hashed bundles never change at the same URL, so browsers can keep them for a year. |
| Rewrite `/*` to `/index.html` | Deep links such as `/assess/abc` or `/models` load the app instead of a 404. |
| `pullRequestPreviewsEnabled: true` | Every pull request gets its own preview URL. |

## Deploy manually (if you prefer the dashboard)

If you do not want to use the Blueprint, you can recreate the same configuration by hand.

1. **New + → Static Site**, pick the repository.
2. Build command: `npm ci && npm run build`. Publish directory: `dist`.
3. Under **Redirects/Rewrites** add one rule: source `/*`, destination `/index.html`, action **Rewrite**.
4. Under **Headers** add five rules, one per row of the table above. Path patterns are `/*`, `/*`, `/sw.js`, `/ort/*`, `/assets/*`.
5. Save and deploy.

The Blueprint is less error-prone, and a missing header is the most common reason the deployed app behaves differently from local preview.

## Verify the deployment

Open the live URL in Chrome and check each of these.

1. **Isolation headers.** Open DevTools → Console and type `crossOriginIsolated`. It must print `true`. If it prints `false`, the COOP or COEP header is missing; check the Headers section of the service in Render.
2. **Service worker.** DevTools → Application → Service Workers should show `sw.js` as activated and running.
3. **No CDN traffic.** DevTools → Network, reload, filter by `jsdelivr` or `unpkg`. There must be no requests. Every runtime file should come from your Render domain under `/ort/`.
4. **Offline shell.** In the Network panel tick **Offline** and reload. The Scan screen should load and the flora database should appear as served by the service worker.
5. **Model setup.** Accept the disclaimer and press "Set up offline identification". The 280 MB download comes from `huggingface.co`, not from Render. This is expected.
6. **Install.** On Android Chrome the address bar offers "Install app". On iOS Safari use Share → Add to Home Screen.

You can also run the automated version of checks 1 to 4 against the live site by editing the base URL at the top of `scripts/check-offline.mjs`, or simply trust the local run, since Render serves the same `dist` folder.

## Set the live URL in the project

Replace the placeholder URL in two places, then commit and push. Render redeploys automatically on every push to `main`.

- `README.md`, the "Live demo" line near the top.
- `docs/DEV_POST.md`, under the **Demo** heading.

```bash
git commit -am "docs: set live Render URL"
git push
```

## Updating the site

Every push to `main` triggers a new build and deploy. Because `sw.js` is served with `no-cache`, open browsers detect the new version on their next visit and the app shows its "Reload to update" prompt. The prompt activates the waiting service worker and reloads (fixed in commit 73ca1fc).

Model weights are unaffected by redeploys. They live in the browser, keyed by model id, and are only re-downloaded if the model id or precision changes in `src/ai/types.ts`.

## Custom domain (optional)

In the service page open **Settings → Custom Domains**, add your domain, and create the CNAME record Render shows you at your DNS provider. Render issues the TLS certificate automatically. All headers and rewrites apply to the custom domain too. If you change domains after users have installed the app, their cached weights stay in the old origin's storage and must be downloaded again.

## Costs and limits

- Render static sites are free. The free plan has a monthly outbound bandwidth allowance; a fresh visitor downloads roughly 130 MB of app shell, dominated by the 26 MB ONNX Runtime WASM and its precached copies, so a few hundred first-time visitors per month fit comfortably. Returning visitors download almost nothing because of the immutable caching and the service worker.
- Model weights never count against Render bandwidth because they come from Hugging Face.
- Do not commit model weights to the repository or download them during the build. A 280 MB build artefact would slow every deploy and could exhaust the bandwidth allowance quickly. If you ever need to self-host weights, use object storage and point the library at it with its `remoteHost` setting rather than using Render.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails with a Node version error | Render did not pick up the Node version | `.node-version` (24.15.0) is in the repository root; confirm it was committed. You can also set `NODE_VERSION` in the service's Environment tab. |
| Build fails at `verify-build` | The build output is missing a required file | Run `npm run build` locally; the script prints which check failed. |
| `crossOriginIsolated` is `false` | COOP/COEP headers missing | Confirm both `/*` header rules exist in Render. If you deployed manually, the Blueprint route is the quickest fix. |
| Console shows `SharedArrayBuffer is not defined` | Same as above | Same as above. |
| Requests to `cdn.jsdelivr.net` appear | The `wasmPaths` override did not apply, usually because `public/ort/` was empty at build time | The `prebuild` script copies the binaries; confirm `dist/ort/` is non-empty in the build log. |
| Deep links return the Render 404 page | Rewrite rule missing | Add the `/*` → `/index.html` rewrite. |
| App never updates after a deploy | Service worker cached | Confirm `/sw.js` has `Cache-Control: no-cache`, then see the update-prompt note above. |
| Model download restarts from zero | Browser evicted the cache | Ask the user to install the app and grant persistent storage from the Models screen. On iOS, only an installed app is protected from eviction. |
| Second scan hangs | Worker bug fixed in commit 6667e31 | Make sure the deployed build includes that commit or later. |
