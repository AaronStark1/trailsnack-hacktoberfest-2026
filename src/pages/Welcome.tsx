import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import Button from "../components/ui/Button.tsx";
import ProgressBar from "../components/ui/ProgressBar.tsx";
import Toggle from "../components/ui/Toggle.tsx";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { useModelStore } from "../stores/modelStore.ts";
import { gemmaClient } from "../ai/gemmaClient.ts";
import { requestPersistentStorage } from "../db/persistence.ts";
import { putModelManifest } from "../db/modelManifest.ts";
import { formatEta } from "../lib/format.ts";

const REGIONS = ["north-america", "uk-ireland", "europe", "australia-nz", "global"];

export default function Welcome() {
  const nav = useNavigate();
  const settings = useSettingsStore();
  const setTier = useModelStore((s) => s.setTier);
  const fieldId = useModelStore((s) => s.fieldId);
  const [accepted, setAccepted] = useState(false);
  const [region, setRegion] = useState(settings.region);
  const [gps, setGps] = useState(settings.gpsEnabled);
  const [downloading, setDownloading] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function acceptAndContinue() {
    await settings.update("disclaimerAcceptedAt", Date.now());
    await settings.update("region", region);
    await settings.update("gpsEnabled", gps);
    nav("/scan");
  }

  async function setupOffline() {
    setDownloading(true);
    setError(null);
    setTier("field-id", { status: "loading", progressPct: 0, currentFile: "", error: null });
    const t0 = Date.now();
    setStartedAt(t0);
    try {
      await requestPersistentStorage();
      const device = await gemmaClient.getDevice(settings.preferredDevice);
      setTier("field-id", { device });
      await gemmaClient.initTier("field-id", {
        device: settings.preferredDevice,
        onProgress: (pct, file) => {
          setTier("field-id", { progressPct: pct, currentFile: file });
        },
      });
      setTier("field-id", { status: "ready", progressPct: 100, error: null });
      await putModelManifest({
        tier: "field-id",
        modelId: gemmaClient.modelIds().tier1,
        dtype: device === "webgpu" ? "q4f16" : "q4",
        device,
        downloadedAt: Date.now(),
        bytes: 0,
        status: "ready",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setTier("field-id", { status: "error", error: message });
    } finally {
      setDownloading(false);
    }
  }

  const elapsed = startedAt ? Math.max(1, (Date.now() - startedAt) / 1000) : 0;
  const eta =
    downloading && fieldId.progressPct > 2
      ? formatEta((elapsed / fieldId.progressPct) * (100 - fieldId.progressPct))
      : "calculating…";

  return (
    <section aria-labelledby="welcome-h" className="grid gap-4">
      <h1 id="welcome-h" className="text-3xl font-extrabold">
        First, the promise
      </h1>
      <div className="rounded-2xl border-2 border-(--color-danger)/40 bg-(--color-danger-bg) p-4">
        <p className="text-xl font-bold text-(--color-danger)">TrailSnack never declares anything safe to eat.</p>
        <p className="mt-2">
          This app is an educational reference. Every assessment defaults to{" "}
          <strong>“Unidentified — do not ingest.”</strong> On-device AI only ranks photos
          against a bundled safety database; a deterministic safety engine computes the
          only verdict you see, and it can only move toward more caution. Confirm
          everything with a qualified local expert before touching or tasting anything wild.
        </p>
      </div>

      <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-black/10 p-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-6 w-6 accent-[#1E5A3A]"
          aria-label="I understand this app never declares anything safe to eat"
        />
        <span className="text-lg">
          I understand: this app never declares anything safe, and I will confirm with a
          local expert before touching or eating anything wild.
        </span>
      </label>

      <div>
        <label htmlFor="region" className="text-lg font-semibold">
          Region (sets emergency numbers)
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1 block min-h-14 w-full rounded-xl border border-black/20 bg-white px-3 text-lg"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Toggle checked={gps} onChange={setGps} label="Enable GPS tagging of saved entries" />
        <span className="text-lg">Tag saved entries with GPS (optional, offline)</span>
      </div>

      <div className="rounded-2xl border border-black/10 p-4">
        <h2 className="text-xl font-bold">Set up offline identification (≈280 MB)</h2>
        <p className="mt-1">Wi-Fi recommended. Downloads once, then works in airplane mode.</p>
        {!downloading && fieldId.status !== "ready" && (
          <Button variant="primary" className="mt-3 w-full" onClick={() => void setupOffline()}>
            <Download size={22} aria-hidden /> Download Tier 1 model
          </Button>
        )}
        {(downloading || fieldId.status === "loading") && (
          <div className="mt-3">
            <ProgressBar pct={fieldId.progressPct} label={`${fieldId.progressPct}% · ${eta}`} />
            <p className="mt-1 truncate text-base opacity-70">{fieldId.currentFile}</p>
          </div>
        )}
        {fieldId.status === "ready" && <p className="mt-2 font-semibold text-(--color-edible)">Offline ID ready{fieldId.device ? ` (${fieldId.device})` : ""}.</p>}
        {error && (
          <div role="alert" className="mt-2 rounded-xl bg-(--color-caution-bg) p-3 text-(--color-caution)">
            <p className="font-semibold">Download had trouble — progress is cached, retry any time.</p>
            <p>{error}</p>
            <Button variant="secondary" className="mt-2" onClick={() => void setupOffline()}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <Button variant="primary" disabled={!accepted} onClick={() => void acceptAndContinue()} className="min-h-16 text-xl">
        Accept and hit the trail
      </Button>
      {!accepted && <p className="text-base opacity-70">Accept the promise above to continue.</p>}
    </section>
  );
}
