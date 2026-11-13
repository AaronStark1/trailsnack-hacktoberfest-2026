import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Download, Footprints, RefreshCw } from "lucide-react";
import Button from "../components/ui/Button.tsx";
import Emblem from "../components/ui/Emblem.tsx";
import Notice from "../components/ui/Notice.tsx";
import Pill from "../components/ui/Pill.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import Toggle from "../components/ui/Toggle.tsx";
import ProvisioningBay from "../components/models/ProvisioningBay.tsx";
import { useGeoPermission, type GeoPermission } from "../components/layout/useGeoPermission.ts";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { useModelStore } from "../stores/modelStore.ts";
import { gemmaClient } from "../ai/gemmaClient.ts";
import { hasUsableWebGPU } from "../ai/detectDevice.ts";
import { requestPersistentStorage } from "../db/persistence.ts";
import { putModelManifest } from "../db/modelManifest.ts";
import { formatBytes } from "../lib/format.ts";

const REGIONS = ["north-america", "uk-ireland", "europe", "australia-nz", "india", "global"] as const;

const REGION_LABELS: Record<(typeof REGIONS)[number], string> = {
  "north-america": "North America",
  "uk-ireland": "UK & Ireland",
  europe: "Europe",
  "australia-nz": "Australia & NZ",
  india: "India",
  global: "Global",
};

const FACTS = ["On-device Gemma", "Offline-first", "Deterministic safety engine"];

/** What the browser says about location access, in plain words. Never requests a fix. */
function gpsHint(available: boolean, permission: GeoPermission): { text: string; tone: string } {
  if (!available) {
    return { text: "Location is not available in this browser — entries will be saved without a fix.", tone: "text-caution" };
  }
  switch (permission) {
    case "denied":
      return {
        text: "Location is blocked in this browser's site settings. Allow it there, or entries are saved without a fix.",
        tone: "text-danger-ink",
      };
    case "granted":
      return { text: "Location is allowed. A fix is taken only when you add one to an entry.", tone: "text-ink-muted" };
    case "prompt":
      return { text: "The browser will ask for location the first time you add a fix.", tone: "text-ink-muted" };
    default:
      return { text: "A fix is taken only when you add one to an entry.", tone: "text-ink-muted" };
  }
}

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
  const [dlBytes, setDlBytes] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Presentational only: whether a WebGPU adapter actually resolves on this device.
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const geoPermission = useGeoPermission();
  const geoAvailable = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    let cancelled = false;
    void hasUsableWebGPU().then((ok) => {
      if (!cancelled) setWebgpu(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function acceptAndContinue() {
    await settings.update("disclaimerAcceptedAt", Date.now());
    await settings.update("region", region);
    await settings.update("gpsEnabled", gps);
    nav("/scan");
  }

  async function setupOffline() {
    setDownloading(true);
    setError(null);
    setDlBytes(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setTier("field-id", { status: "loading", progressPct: 0, currentFile: "", error: null });
    const t0 = Date.now();
    setStartedAt(t0);
    const totals = new Map<string, number>();
    const loadedMap = new Map<string, number>();
    try {
      await requestPersistentStorage();
      const device = await gemmaClient.getDevice(settings.preferredDevice);
      setTier("field-id", { device });
      await gemmaClient.initTier("field-id", {
        device: settings.preferredDevice,
        onProgress: (pct, file, loaded, total) => {
          setTier("field-id", { progressPct: pct, currentFile: file });
          if (typeof total === "number" && total > 0) {
            totals.set(file, total);
            const sum = [...totals.values()].reduce((a, b) => a + b, 0);
            setDlBytes(sum);
            setTotalBytes(sum);
          }
          if (typeof loaded === "number") {
            loadedMap.set(file, loaded);
            setLoadedBytes([...loadedMap.values()].reduce((a, b) => a + b, 0));
          }
        },
      });
      setTier("field-id", { status: "ready", progressPct: 100, error: null });
      const bytes = [...totals.values()].reduce((a, b) => a + b, 0);
      await putModelManifest({
        tier: "field-id",
        modelId: gemmaClient.modelIds().tier1,
        dtype: device === "webgpu" ? "q4f16" : "q4",
        device,
        downloadedAt: Date.now(),
        bytes,
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

  const tier1ModelId = gemmaClient.modelIds().tier1;
  const showBay = downloading || fieldId.status === "loading" || fieldId.status === "ready";
  const canStartDownload = !downloading && (fieldId.status === "idle" || fieldId.status === "error");
  const hint = gpsHint(geoAvailable, geoPermission);

  return (
    <section aria-labelledby="welcome-h" className="grid gap-8">
      {/* Hero */}
      <header className="animate-rise-in">
        <div className="flex items-center gap-3">
          <Emblem size={40} className="text-ink sm:hidden" />
          <p className="mono-label flex items-center gap-2 text-amber">
            <span aria-hidden className="h-px w-5 shrink-0 bg-current opacity-70" />
            First run · Field journal
          </p>
        </div>
        <div className="mt-5 flex items-end justify-between gap-6">
          <h1 id="welcome-h" className="display text-display-xl text-ink">
            Rooted in caution.{" "}
            <span className="block text-amber">Built for the wild.</span>
          </h1>
          <span
            aria-hidden
            className="hidden size-36 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2/70 shadow-inset sm:flex md:size-40"
          >
            <Emblem size={96} className="text-ink" />
          </span>
        </div>
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-muted">
          TrailSnack compares your photo against a bundled safety database using Gemma models that
          run entirely on this device. After a one-time setup it needs no signal — and a
          deterministic safety engine, not the model, has the final word.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {FACTS.map((fact) => (
            <li key={fact} className="mono-label flex items-center gap-2 text-ink-faint">
              <span aria-hidden className="size-1 rounded-full bg-amber" />
              {fact}
            </li>
          ))}
        </ul>
        <div aria-hidden className="vein mt-8" />
      </header>

      {/* Safety Covenant */}
      <article
        aria-labelledby="covenant-h"
        className="plate animate-rise-in overflow-hidden border-amber/45"
        style={{ "--i": 1 } as CSSProperties}
      >
        <div aria-hidden className="h-1 bg-amber/70" />
        <div className="p-5 sm:p-7">
          <h2 id="covenant-h" className="mono-label text-amber">
            The Safety Covenant · Read before use
          </h2>
          <p className="display mt-4 text-display-lg text-ink">
            “The app never says ‘eat this’ — the worst case always wins.”
          </p>
          <p className="mt-5 max-w-prose leading-relaxed text-ink">
            TrailSnack is an educational reference, not a permission slip. Every assessment
            defaults to <strong>“Unidentified — do not ingest.”</strong> On-device AI only ranks
            photos against a bundled safety database; a deterministic safety engine computes the
            only verdict you see, and it can only move toward more caution. Confirm everything
            with a qualified local expert before touching or tasting anything wild.
          </p>

          {/* Acknowledgement */}
          <label
            className={`mt-6 flex min-h-16 cursor-pointer items-center gap-4 rounded-field border p-4 select-none press ${
              accepted ? "border-amber bg-amber/10" : "border-line-strong bg-surface-2 shadow-inset hover:border-ink/40"
            }`}
          >
            <span
              className={`relative flex size-10 shrink-0 items-center justify-center rounded-chip border-2 transition-[background-color,border-color,box-shadow] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-amber-bright ${
                accepted ? "border-amber-bright bg-amber text-on-amber shadow-glow-amber" : "border-ink-muted bg-surface"
              }`}
            >
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                aria-label="I understand this app never declares anything safe to eat"
              />
              {accepted && <Check size={24} strokeWidth={3.2} aria-hidden />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`mono-label block ${accepted ? "text-amber" : "text-ink-faint"}`}>
                {accepted ? "Acknowledged" : "Tap to acknowledge"}
              </span>
              <span className="mt-1.5 block leading-snug font-semibold text-ink">
                I understand: this app never declares anything safe, and I will confirm with a
                local expert before touching or eating anything wild.
              </span>
            </span>
          </label>
        </div>
      </article>

      {/* Field setup */}
      <article
        aria-labelledby="setup-h"
        className="plate animate-rise-in p-5 sm:p-6"
        style={{ "--i": 2 } as CSSProperties}
      >
        <SectionHeader id="setup-h" eyebrow="01 · Field setup" title="Where you forage" />

        <div className="mt-6">
          <label htmlFor="region" className="block font-semibold text-ink">
            Region
          </label>
          <p className="mt-1 text-sm text-ink-muted">Sets the poison-control and emergency numbers shown with each assessment.</p>
          <div className="relative mt-3">
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="field min-h-14 w-full appearance-none px-4 pr-12 font-semibold"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_LABELS[r]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={22}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-amber"
            />
          </div>
        </div>

        <div className="mt-6 flex items-start gap-4 border-t border-line pt-6">
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-semibold text-ink">Tag saved entries with GPS</p>
            <p className="mono-label mt-2 text-ink-faint">Optional · works without signal</p>
            {gps && <p className={`mt-2.5 text-sm leading-snug ${hint.tone}`}>{hint.text}</p>}
          </div>
          <Toggle checked={gps} onChange={setGps} label="Enable GPS tagging of saved entries" />
        </div>
      </article>

      {/* On-device model provisioning */}
      <article
        aria-labelledby="provision-h"
        className="plate animate-rise-in p-5 sm:p-6"
        style={{ "--i": 3 } as CSSProperties}
      >
        <SectionHeader
          id="provision-h"
          eyebrow="02 · On-device model"
          title="Tier 1 · Field ID"
          right={<p className="mono-value text-sm text-ink-muted">≈280 MB</p>}
        />
        <p className="mono-value mt-4 text-sm break-all text-ink">{tier1ModelId}</p>
        <p className="mt-2 text-ink-muted">
          Downloads once over Wi-Fi, then works in airplane mode. You can also do this later from Models.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {webgpu === null ? (
            <Pill tone="neutral" dot live>
              Checking device
            </Pill>
          ) : webgpu ? (
            <Pill tone="neutral">WebGPU adapter found</Pill>
          ) : (
            <Pill tone="neutral">No WebGPU · WASM fallback</Pill>
          )}
          <Pill tone="neutral">Preference: {settings.preferredDevice}</Pill>
        </div>

        {showBay && (
          <div className="mt-5">
            <ProvisioningBay
              pct={fieldId.status === "ready" ? 100 : fieldId.progressPct}
              currentFile={fieldId.currentFile}
              loadedBytes={loadedBytes}
              totalBytes={totalBytes}
              startedAt={startedAt}
              device={fieldId.device}
              status={fieldId.status}
            />
          </div>
        )}

        {(downloading || fieldId.status === "loading") && (
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="mono-label text-ink-faint">Manifest</span>
            <span className="mono-value text-sm text-ink-muted" data-testid="welcome-dl-status">
              {formatBytes(dlBytes > 0 ? dlBytes : null)}
              {fieldId.device ? ` · ${fieldId.device}` : ""}
            </span>
          </p>
        )}

        {canStartDownload && !error && (
          <Button variant="secondary" size="lg" className="mt-5 w-full" onClick={() => void setupOffline()}>
            <Download size={22} aria-hidden /> Download Tier 1 model
          </Button>
        )}

        {error && (
          <Notice
            tone="warn"
            role="alert"
            label="Download interrupted"
            className="mt-5"
            actions={
              <Button variant="secondary" size="sm" onClick={() => void setupOffline()}>
                <RefreshCw size={18} aria-hidden /> Retry
              </Button>
            }
          >
            <p className="font-semibold">Download had trouble — progress is cached, retry any time.</p>
            <p className="mono-value mt-1.5 text-sm text-ink-muted">{error}</p>
          </Notice>
        )}
      </article>

      {/* Commit */}
      <div className="grid gap-3">
        <Button
          variant="primary"
          size="lg"
          disabled={!accepted}
          onClick={() => void acceptAndContinue()}
          className="w-full"
        >
          <Footprints size={22} aria-hidden /> Accept and hit the trail
        </Button>
        {!accepted && (
          <p className="text-center text-sm text-ink-muted">
            Acknowledge the Safety Covenant above to continue.
          </p>
        )}
      </div>
    </section>
  );
}
