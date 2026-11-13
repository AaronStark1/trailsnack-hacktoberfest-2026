import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Download, Footprints, RefreshCw, TriangleAlert } from "lucide-react";
import Button from "../components/ui/Button.tsx";
import Emblem from "../components/ui/Emblem.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import Toggle from "../components/ui/Toggle.tsx";
import ProvisioningBay from "../components/models/ProvisioningBay.tsx";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { useModelStore } from "../stores/modelStore.ts";
import { gemmaClient } from "../ai/gemmaClient.ts";
import { requestPersistentStorage } from "../db/persistence.ts";
import { putModelManifest } from "../db/modelManifest.ts";
import { formatBytes } from "../lib/format.ts";

const REGIONS = ["north-america", "uk-ireland", "europe", "australia-nz", "global"] as const;

const REGION_LABELS: Record<(typeof REGIONS)[number], string> = {
  "north-america": "North America",
  "uk-ireland": "UK & Ireland",
  europe: "Europe",
  "australia-nz": "Australia & NZ",
  global: "Global",
};

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

  return (
    <section aria-labelledby="welcome-h" className="grid gap-5 animate-rise-in">
      <SectionHeader
        as="h1"
        id="welcome-h"
        eyebrow="00 · FIRST RUN"
        title="The Safety Covenant"
        right={<Emblem size={44} className="text-trail" />}
      />

      {/* Safety Covenant */}
      <article className="tac-card overflow-hidden p-0">
        <div aria-hidden className="hazard-stripes h-3" />
        <div className="p-5">
          <p className="mono-label text-danger">SAFETY COVENANT · READ BEFORE USE</p>
          <p className="display-caps mt-3 text-2xl text-ink sm:text-3xl">
            The app never says “eat this” — the worst-case always wins.
          </p>
          <p className="mt-4 text-lg text-ink">
            TrailSnack is an educational reference, not a permission slip. Every assessment
            defaults to <strong>“Unidentified — do not ingest.”</strong> On-device AI only ranks
            photos against a bundled safety database; a deterministic safety engine computes the
            only verdict you see, and it can only move toward more caution. Confirm everything
            with a qualified local expert before touching or tasting anything wild.
          </p>

          {/* Signature line */}
          <label className="well mt-5 flex min-h-16 cursor-pointer items-center gap-4 rounded-tac p-3 select-none tac-press">
            <span
              className={`relative flex size-10 shrink-0 items-center justify-center rounded-tac-sm border-2 transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-trail-glow ${
                accepted
                  ? "border-trail bg-trail text-on-trail shadow-glow"
                  : "border-line-strong bg-surface bevel-light"
              }`}
            >
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                aria-label="I understand this app never declares anything safe to eat"
              />
              {accepted && <Check size={26} strokeWidth={3.2} aria-hidden />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`mono-label block ${accepted ? "text-trail" : "text-ink-muted"}`}>
                ACKNOWLEDGE
              </span>
              <span className="mt-1.5 block text-base font-semibold leading-snug text-ink sm:text-lg">
                I understand: this app never declares anything safe, and I will confirm with a
                local expert before touching or eating anything wild.
              </span>
            </span>
          </label>
        </div>
      </article>

      {/* Field setup */}
      <article className="tac-card p-5">
        <p className="mono-label text-ink-faint">FIELD SETUP</p>

        <div className="mt-4">
          <label htmlFor="region" className="block text-lg font-semibold text-ink">
            Region (sets emergency numbers)
          </label>
          <div className="relative mt-2">
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="well min-h-14 w-full appearance-none rounded-tac px-3 pr-12 text-lg font-semibold text-ink"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_LABELS[r]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={24}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4 border-t border-line pt-5">
          <Toggle checked={gps} onChange={setGps} label="Enable GPS tagging of saved entries" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-snug text-ink">
              Tag saved entries with GPS (optional, offline)
            </p>
            <p className="mono-label mt-1.5 text-ink-muted">WORKS WITHOUT SIGNAL</p>
          </div>
        </div>
      </article>

      {/* On-device model provisioning */}
      <article className="tac-card p-5">
        <p className="mono-label text-ink-faint">ON-DEVICE MODEL PROVISIONING BAY</p>
        <h2 className="mt-2 text-2xl font-extrabold text-ink">Tier 1 · Field ID</h2>
        <p className="mt-2 truncate font-mono text-xs font-semibold tracking-[0.12em] text-trail">
          {tier1ModelId}
        </p>
        <p className="mt-1 text-base text-ink-muted">
          ≈280 MB · downloads once over Wi-Fi · then airplane mode
        </p>

        {showBay && (
          <div className="mt-4">
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
            <span className="mono-label text-ink-muted">MANIFEST</span>
            <span className="font-mono text-sm font-semibold text-ink-muted" data-testid="welcome-dl-status">
              {formatBytes(dlBytes > 0 ? dlBytes : null)}
              {fieldId.device ? ` · ${fieldId.device}` : ""}
            </span>
          </p>
        )}

        {canStartDownload && (
          <Button variant="primary" size="lg" className="mt-4 w-full" onClick={() => void setupOffline()}>
            <Download size={24} aria-hidden /> Download Tier 1 model
          </Button>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 overflow-hidden rounded-tac border-2 border-caution/60 bg-caution-bg"
          >
            <div className="flex items-start gap-3 p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-tac-sm border-2 border-caution/50 bg-surface text-caution">
                <TriangleAlert size={26} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mono-label text-caution">DOWNLINK FAULT</p>
                <p className="mt-1.5 text-lg font-bold text-ink">
                  Download had trouble — progress is cached, retry any time.
                </p>
                <p className="mt-1 font-mono text-sm break-words text-ink-muted">{error}</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <Button variant="secondary" className="w-full" onClick={() => void setupOffline()}>
                <RefreshCw size={22} aria-hidden /> Retry
              </Button>
            </div>
          </div>
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
          <Footprints size={24} aria-hidden /> Accept and hit the trail
        </Button>
        {!accepted && (
          <p className="text-center text-base font-medium text-ink-muted">
            Acknowledge the Safety Covenant above to continue.
          </p>
        )}
      </div>
    </section>
  );
}
