// Offline verification: proves the production build works in airplane mode with
// zero CDN traffic. Exits non-zero on any failure.
import { spawn } from "node:child_process";

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const BANNED_HOSTS = ["cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return res;
    } catch {
      // not up yet
    }
    await sleep(1000);
  }
  throw new Error("preview server did not start");
}

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let failed = false;
try {
  const first = await waitForServer();
  void first;
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const seen = new Set();

    // --- Header assertions on the document response ---
    const docResponse = await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const headers = docResponse?.headers() ?? {};
    const coop = headers["cross-origin-opener-policy"];
    const coep = headers["cross-origin-embedder-policy"];
    if (coop !== "same-origin") throw new Error(`COOP header wrong: ${coop}`);
    if (coep !== "require-corp") throw new Error(`COEP header wrong: ${coep}`);
    console.log(`headers OK: COOP=${coop} COEP=${coep}`);

    page.on("request", (req) => {
      try {
        seen.add(new URL(req.url()).host);
      } catch {
        // ignore
      }
    });

    // Accept the disclaimer so the Scan screen is reachable.
    await page.getByRole("checkbox", { name: /i understand/i }).check();
    await page.getByRole("button", { name: /accept and hit the trail/i }).click();
    await page.waitForURL(/\/scan/);

    // Wait for the service worker to take control.
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller?.state === "activated",
      { timeout: 30_000 },
    );
    console.log("service worker activated");

    // Exercise client-side routing so SW-cached entries are populated.
    for (const path of ["/log", "/models", "/settings"]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }).catch(() => undefined);
    }
    await page.goto(`${BASE}/scan`, { waitUntil: "networkidle" }).catch(() => undefined);

    const bad = [...seen].filter((h) => BANNED_HOSTS.some((b) => h === b || h.endsWith(`.${b}`)));
    if (bad.length > 0) throw new Error(`CDN requests observed: ${bad.join(", ")}`);
    console.log(`network OK: ${seen.size} hosts seen, none banned (${[...seen].join(", ") || "same-origin only"})`);

    // --- Offline phase ---
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /trail camera/i }).waitFor({ timeout: 15_000 });
    console.log("offline OK: Scan screen renders with network disabled");

    const dbStatus = await page.evaluate(async () => {
      const res = await fetch("/data/flora_safety_db.json");
      return res.status;
    });
    if (dbStatus !== 200) throw new Error(`flora_safety_db.json offline status ${dbStatus}`);
    console.log("offline OK: /data/flora_safety_db.json served from the service worker");
  } finally {
    await browser.close();
  }
} catch (err) {
  failed = true;
  console.error(`check-offline FAILED: ${err.message}`);
} finally {
  server.kill("SIGTERM");
}
process.exit(failed ? 1 : 0);
