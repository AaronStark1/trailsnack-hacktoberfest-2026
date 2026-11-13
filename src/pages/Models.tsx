import { useEffect, useState } from "react";
import { Cpu, Download, Gpu, Microscope, Sprout, Trash2 } from "lucide-react";
import TierCard from "../components/models/TierCard.tsx";
import ProvisioningBay from "../components/models/ProvisioningBay.tsx";
import QuotaInspector from "../components/models/QuotaInspector.tsx";
import DeviceCards from "../components/models/DeviceCards.tsx";
import CapabilityGate, { checkTier2Gate, type GateResult } from "../components/models/CapabilityGate.tsx";
import Button from "../components/ui/Button.tsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.tsx";
import Notice, { type NoticeTone } from "../components/ui/Notice.tsx";
import Pill, { type PillTone } from "../components/ui/Pill.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import { useModelStore, type TierState } from "../stores/modelStore.ts";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { evictModel, type CacheReport } from "../db/modelCacheInspector.ts";
import { requestPersistentStorage } from "../db/persistence.ts";
import { getModelManifest, listModelManifests, putModelManifest } from "../db/modelManifest.ts";
import type { ModelManifestRecord } from "../db/modelManifest.ts";
import { gemmaClient } from "../ai/gemmaClient.ts";
import { formatBytes } from "../lib/format.ts";

type TierKey = "field-id" | "deep-look";

const statusTones: Record<TierState["status"], PillTone> = {
  idle: "neutral",
  loading: "accent",
  ready: "ok",
  error: "danger",
};

/** Session state of a tier in plain words. "Not loaded" is not the same as "not cached". */
const statusWords: Record<TierState["status"], string> = {
  idle: "Not loaded",
  loading: "Loading",
  ready: "Ready",
  error: "Error",
};

/** Real byte counters of the download in flight, summed from the worker's per-file progress. */
interface Transfer {
  startedAt: number;
  loaded: number;
  total: number;
}

const NO_TRANSFER: Transfer = { startedAt: 0, loaded: 0, total: 0 };

function sum(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Status pills for a tier: session state, device, compatibility and actual cache contents. */
function TierBadges({
  tier,
  cached,
  incompatible = false,
}: {
  tier: TierState;
  /** From the Cache API report; null while unmeasured or stale. */
  cached: boolean | null;
  incompatible?: boolean;
}) {
  return (
    <>
      <Pill tone={statusTones[tier.status]} dot live={tier.status === "loading"}>
        {statusWords[tier.status]}
      </Pill>
      {incompatible && <Pill tone="danger">Incompatible</Pill>}
      {cached !== null && <Pill tone="neutral">{cached ? "Cached" : "Uncached"}</Pill>}
      {tier.device && (
        <Pill tone="neutral" icon={tier.device === "webgpu" ? <Gpu /> : <Cpu />}>
          {tier.device === "webgpu" ? "WebGPU" : "WASM"}
        </Pill>
      )}
    </>
  );
}

export default function Models() {
  const fieldId = useModelStore((s) => s.fieldId);
  const deepLook = useModelStore((s) => s.deepLook);
  const setTier = useModelStore((s) => s.setTier);
  const preferredDevice = useSettingsStore((s) => s.preferredDevice);
  const [tier2Confirm, setTier2Confirm] = useState("");
  const [gate, setGate] = useState<GateResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null);
  const [transfers, setTransfers] = useState<Record<TierKey, Transfer>>({
    "field-id": NO_TRANSFER,
    "deep-look": NO_TRANSFER,
  });
  const [manifests, setManifests] = useState<ModelManifestRecord[]>([]);
  const [cacheReport, setCacheReport] = useState<CacheReport | null>(null);
  // Tiers whose cache contents changed since the last measurement: no badge until re-measured.
  const [cacheStale, setCacheStale] = useState<Record<TierKey, boolean>>({ "field-id": false, "deep-look": false });
  const [confirmRemove, setConfirmRemove] = useState<{ tier: TierKey; modelId: string; name: string } | null>(null);

  useEffect(() => {
    void listModelManifests()
      .then(setManifests)
      .catch(() => undefined);
  }, []);

  async function refreshManifests() {
    try {
      setManifests(await listModelManifests());
    } catch {
      // IndexedDB unavailable; the on-screen status still reflects the store.
    }
  }

  function manifestFor(tier: string): ModelManifestRecord | undefined {
    return manifests.find((m) => m.tier === tier);
  }

  function manifestLine(tier: string): string {
    const m = manifestFor(tier);
    // An evicted model leaves an "absent" manifest behind: that is not on disk.
    if (!m || m.status === "absent") return "Not downloaded yet.";
    const bytes = m.bytes > 0 ? formatBytes(m.bytes) : "size unknown (re-download to measure)";
    const when = new Date(m.downloadedAt).toLocaleDateString();
    return `On disk: ${bytes} · downloaded ${when} · ${m.device} · ${m.dtype}.`;
  }

  function onCacheReport(report: CacheReport) {
    setCacheReport(report);
    setCacheStale({ "field-id": false, "deep-look": false });
  }

  /** True/false from the measured Cache API contents; null when unmeasured or stale. */
  function cachedState(tier: TierKey, modelId: string): boolean | null {
    if (!cacheReport || cacheStale[tier]) return null;
    return cacheReport.perModel.some((m) => m.modelId === modelId && m.fileCount > 0);
  }

  function markCacheStale(tier: TierKey) {
    setCacheStale((s) => ({ ...s, [tier]: true }));
  }

  async function downloadTier1() {
    setBusy("field-id");
    setNotice(null);
    setTier("field-id", { status: "loading", progressPct: 0, currentFile: "", error: null });
    const t0 = Date.now();
    setTransfers((t) => ({ ...t, "field-id": { startedAt: t0, loaded: 0, total: 0 } }));
    markCacheStale("field-id");
    // Sum of per-file totals seen on the progress callbacks = real bytes.
    const totals = new Map<string, number>();
    const loadedMap = new Map<string, number>();
    try {
      await requestPersistentStorage();
      const device = await gemmaClient.getDevice(preferredDevice);
      setTier("field-id", { device });
      await gemmaClient.initTier("field-id", {
        device: preferredDevice,
        onProgress: (pct, file, loaded, total) => {
          setTier("field-id", { progressPct: pct, currentFile: file });
          if (typeof total === "number" && total > 0) totals.set(file, total);
          if (typeof loaded === "number") loadedMap.set(file, loaded);
          setTransfers((t) => ({
            ...t,
            "field-id": { startedAt: t0, loaded: sum(loadedMap.values()), total: sum(totals.values()) },
          }));
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
      await refreshManifests();
      setNotice({ text: `Tier 1 ready on ${device}.`, tone: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTier("field-id", { status: "error", error: message });
      setNotice({
        text: `Tier 1 download paused with cached progress — retry any time. (${message})`,
        tone: "warn",
      });
    } finally {
      setBusy(null);
    }
  }

  async function downloadTier2() {
    const g = await checkTier2Gate();
    setGate(g);
    if (!g.webgpu) {
      setNotice({ text: "Tier 2 needs WebGPU, which this device does not expose.", tone: "warn" });
      return;
    }
    if (!g.memoryOk || !g.quotaOk) {
      setNotice({
        text: "Tier 2 blocked: the device does not report enough memory or free storage (need ≥ 8 GB RAM and ≥ 4.5 GB free).",
        tone: "warn",
      });
      return;
    }
    setBusy("deep-look");
    setTier("deep-look", { status: "loading", progressPct: 0, currentFile: "", error: null, device: "webgpu" });
    const t0 = Date.now();
    setTransfers((t) => ({ ...t, "deep-look": { startedAt: t0, loaded: 0, total: 0 } }));
    markCacheStale("deep-look");
    const totals = new Map<string, number>();
    const loadedMap = new Map<string, number>();
    try {
      await requestPersistentStorage();
      await gemmaClient.initTier("deep-look", {
        device: "webgpu",
        onProgress: (pct, file, loaded, total) => {
          setTier("deep-look", { progressPct: pct, currentFile: file });
          if (typeof total === "number" && total > 0) totals.set(file, total);
          if (typeof loaded === "number") loadedMap.set(file, loaded);
          setTransfers((t) => ({
            ...t,
            "deep-look": { startedAt: t0, loaded: sum(loadedMap.values()), total: sum(totals.values()) },
          }));
        },
      });
      setTier("deep-look", { status: "ready", progressPct: 100, error: null });
      const bytes = [...totals.values()].reduce((a, b) => a + b, 0);
      await putModelManifest({
        tier: "deep-look",
        modelId: gemmaClient.modelIds().tier2,
        dtype: "q4f16",
        device: "webgpu",
        downloadedAt: Date.now(),
        bytes,
        status: "ready",
      });
      await refreshManifests();
      setNotice({ text: "Tier 2 ready on WebGPU.", tone: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTier("deep-look", { status: "error", error: message });
      setNotice({ text: `Tier 2 failed: ${message}`, tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  async function removeTier(tier: TierKey, modelId: string) {
    setBusy(tier);
    try {
      const removed = await evictModel(modelId);
      const manifest = await getModelManifest(tier).catch(() => undefined);
      void manifest;
      setTier(tier, { status: "idle", progressPct: 0, currentFile: "", error: null, device: null });
      markCacheStale(tier);
      await refreshManifests();
      setNotice({ text: `Removed ${removed} cached files for ${modelId}.`, tone: "info" });
    } finally {
      setBusy(null);
    }
  }

  const tier1Id = gemmaClient.modelIds().tier1;
  const tier2Id = gemmaClient.modelIds().tier2;
  const tier2Blocked = gate !== null && (!gate.webgpu || !gate.memoryOk || !gate.quotaOk);
  const tier2Confirmed = tier2Confirm.trim() === "3.3 GB";

  /** Recessed readout under a tier: live download dial, or the manifest line and any error. */
  function tierStatus(key: TierKey, tier: TierState, testId: string, accent: "amber" | "violet") {
    return (
      <div className="grid gap-3">
        {tier.status === "loading" && (
          <ProvisioningBay
            pct={tier.progressPct}
            currentFile={tier.currentFile}
            loadedBytes={transfers[key].loaded}
            totalBytes={transfers[key].total}
            startedAt={transfers[key].startedAt}
            device={tier.device}
            status="loading"
            label={key === "field-id" ? "Tier 1 model download" : "Tier 2 model download"}
            accent={accent}
          />
        )}
        {tier.error && tier.status !== "loading" && (
          <Notice tone="danger" role="note" label="Last error">
            {tier.error}
          </Notice>
        )}
        <p className="well mono-value rounded-field px-4 py-3 text-sm leading-relaxed text-ink-muted" data-testid={testId}>
          {manifestLine(key)}
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="models-h" className="grid gap-8">
      <SectionHeader
        as="h1"
        id="models-h"
        eyebrow="04 · Models"
        title="Models & Diagnostics"
        lede="Both models run entirely on this device. Download a tier once over Wi-Fi; after that it works with zero bars."
        right={
          <Pill tone={statusTones[fieldId.status]} dot live={fieldId.status === "loading"}>
            T1 {statusWords[fieldId.status]}
          </Pill>
        }
      />

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <DeviceCards activeDevice={fieldId.device} preferredDevice={preferredDevice} />

      <section aria-labelledby="tiers-h" className="grid gap-4">
        <SectionHeader id="tiers-h" eyebrow="Model tiers" title="On-device models" />

        <TierCard
          eyebrow="Tier 1 · EmbeddingGemma 2"
          title="Field ID"
          size="≈280 MB"
          icon={<Sprout />}
          modelId={tier1Id}
          meta="Zero-shot retrieval over the bundled safety database. Runs on WebGPU or WASM."
          badges={<TierBadges tier={fieldId} cached={cachedState("field-id", tier1Id)} />}
          status={tierStatus("field-id", fieldId, "tier1-manifest", "amber")}
          actions={
            <>
              <Button variant="primary" disabled={busy !== null} onClick={() => void downloadTier1()}>
                <Download size={20} aria-hidden />{" "}
                {fieldId.status === "ready" ? "Re-check" : fieldId.status === "error" ? "Retry" : "Download"}
              </Button>
              {fieldId.status === "ready" && fieldId.device === "webgpu" && (
                <Button variant="secondary" disabled={busy !== null} onClick={() => void downloadTier1()}>
                  Retry on WASM
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy !== null}
                onClick={() => setConfirmRemove({ tier: "field-id", modelId: tier1Id, name: "Tier 1 · Field ID" })}
              >
                <Trash2 size={20} aria-hidden /> Remove
              </Button>
            </>
          }
        />

        <TierCard
          accent="violet"
          eyebrow="Tier 2 · Gemma 4 E2B"
          title="Deep Look"
          size="≈3.3 GB"
          icon={<Microscope />}
          modelId={tier2Id}
          meta="Instruction-tuned, constrained-JSON feature verification. WebGPU only. It never produces a verdict."
          badges={
            <TierBadges tier={deepLook} cached={cachedState("deep-look", tier2Id)} incompatible={tier2Blocked} />
          }
          status={tierStatus("deep-look", deepLook, "tier2-manifest", "violet")}
          actions={
            <>
              <Button
                variant="violet"
                disabled={busy !== null || tier2Blocked || !tier2Confirmed}
                onClick={() => void downloadTier2()}
              >
                <Download size={20} aria-hidden /> Download Tier 2
              </Button>
              <Button
                variant="ghost"
                disabled={busy !== null}
                onClick={() => setConfirmRemove({ tier: "deep-look", modelId: tier2Id, name: "Tier 2 · Deep Look" })}
              >
                <Trash2 size={20} aria-hidden /> Remove
              </Button>
            </>
          }
        >
          <p className="mono-label mb-3 text-ink-faint">Capability gate</p>
          <CapabilityGate onResult={setGate} />
          {tier2Blocked && (
            <p className="mt-3 text-sm leading-snug text-ink-muted">
              This device does not pass every check, so the Tier 2 download stays locked. Tier 1 is unaffected.
            </p>
          )}
          <p className="mono-label mt-6 text-ink-faint">Confirm size</p>
          <label htmlFor="tier2-confirm" className="mt-2 block font-semibold text-ink">
            Type “3.3 GB” to confirm you understand the download size:
          </label>
          <input
            id="tier2-confirm"
            value={tier2Confirm}
            onChange={(e) => setTier2Confirm(e.target.value)}
            placeholder="3.3 GB"
            autoComplete="off"
            className="field mono-value mt-3 block min-h-14 w-full px-4 text-lg"
          />
        </TierCard>
      </section>

      <QuotaInspector onReport={onCacheReport} />

      {confirmRemove && (
        <ConfirmDialog
          title="Remove cached model?"
          body={`${confirmRemove.name} will be deleted from this device's cache. It must be downloaded again before it can run — which needs a connection.`}
          confirmLabel="Remove"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            const target = confirmRemove;
            setConfirmRemove(null);
            void removeTier(target.tier, target.modelId);
          }}
        />
      )}
    </section>
  );
}
