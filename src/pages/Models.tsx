import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import TierCard from "../components/models/TierCard.tsx";
import DownloadProgress from "../components/models/DownloadProgress.tsx";
import QuotaInspector from "../components/models/QuotaInspector.tsx";
import CapabilityGate, { checkTier2Gate, type GateResult } from "../components/models/CapabilityGate.tsx";
import Button from "../components/ui/Button.tsx";
import { useModelStore } from "../stores/modelStore.ts";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { evictModel } from "../db/modelCacheInspector.ts";
import { requestPersistentStorage } from "../db/persistence.ts";
import { getModelManifest, putModelManifest } from "../db/modelManifest.ts";
import { gemmaClient } from "../ai/gemmaClient.ts";
import { formatBytes, formatEta } from "../lib/format.ts";

export default function Models() {
  const fieldId = useModelStore((s) => s.fieldId);
  const deepLook = useModelStore((s) => s.deepLook);
  const setTier = useModelStore((s) => s.setTier);
  const preferredDevice = useSettingsStore((s) => s.preferredDevice);
  const [tier2Confirm, setTier2Confirm] = useState("");
  const [gate, setGate] = useState<GateResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dlStart, setDlStart] = useState(0);

  async function downloadTier1() {
    setBusy("field-id");
    setNotice(null);
    setTier("field-id", { status: "loading", progressPct: 0, currentFile: "", error: null });
    const t0 = Date.now();
    setDlStart(t0);
    try {
      await requestPersistentStorage();
      const device = await gemmaClient.getDevice(preferredDevice);
      setTier("field-id", { device });
      await gemmaClient.initTier("field-id", {
        device: preferredDevice,
        onProgress: (pct, file) => setTier("field-id", { progressPct: pct, currentFile: file }),
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
      setNotice(`Tier 1 ready on ${device}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTier("field-id", { status: "error", error: message });
      setNotice(`Tier 1 download paused with cached progress — retry any time. (${message})`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadTier2() {
    const g = await checkTier2Gate();
    setGate(g);
    if (!g.webgpu) {
      setNotice("Tier 2 needs WebGPU, which this device does not expose.");
      return;
    }
    setBusy("deep-look");
    setTier("deep-look", { status: "loading", progressPct: 0, currentFile: "", error: null, device: "webgpu" });
    try {
      await requestPersistentStorage();
      await gemmaClient.initTier("deep-look", {
        device: "webgpu",
        onProgress: (pct, file) => setTier("deep-look", { progressPct: pct, currentFile: file }),
      });
      setTier("deep-look", { status: "ready", progressPct: 100, error: null });
      await putModelManifest({
        tier: "deep-look",
        modelId: gemmaClient.modelIds().tier2,
        dtype: "q4f16",
        device: "webgpu",
        downloadedAt: Date.now(),
        bytes: 0,
        status: "ready",
      });
      setNotice("Tier 2 ready on WebGPU.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTier("deep-look", { status: "error", error: message });
      setNotice(`Tier 2 failed: ${message}`);
    } finally {
      setBusy(null);
    }
  }

  async function removeTier(tier: "field-id" | "deep-look", modelId: string) {
    setBusy(tier);
    try {
      const removed = await evictModel(modelId);
      const manifest = await getModelManifest(tier).catch(() => undefined);
      void manifest;
      setTier(tier, { status: "idle", progressPct: 0, currentFile: "", error: null, device: null });
      setNotice(`Removed ${removed} cached files for ${modelId}.`);
    } finally {
      setBusy(null);
    }
  }

  const eta1 =
    busy === "field-id" && fieldId.progressPct > 2
      ? formatEta(((Date.now() - dlStart) / 1000 / fieldId.progressPct) * (100 - fieldId.progressPct))
      : "calculating…";

  const tier2Blocked = gate !== null && (!gate.webgpu || !gate.memoryOk || !gate.quotaOk);
  const tier2Confirmed = tier2Confirm.trim() === "3.3 GB";

  return (
    <section aria-labelledby="models-h" className="grid gap-4">
      <h1 id="models-h" className="text-3xl font-extrabold">
        Offline models
      </h1>
      {notice && (
        <p role="status" className="rounded-2xl bg-(--color-edible-bg) p-3 text-(--color-edible)">
          {notice}
        </p>
      )}

      <TierCard
        title="Tier 1 — Field ID (≈280 MB)"
        modelId={gemmaClient.modelIds().tier1}
        meta="EmbeddingGemma 2 · zero-shot retrieval over the safety database · WebGPU or WASM"
        status={
          fieldId.status === "loading" ? (
            <DownloadProgress pct={fieldId.progressPct} currentFile={fieldId.currentFile} bytes={formatBytes(null)} eta={eta1} />
          ) : (
            <p>
              Status: <strong>{fieldId.status}</strong>
              {fieldId.device ? ` · ${fieldId.device}` : ""}
              {fieldId.error ? ` · ${fieldId.error}` : ""}
            </p>
          )
        }
        actions={
          <>
            <Button variant="primary" disabled={busy !== null} onClick={() => void downloadTier1()}>
              <Download size={20} aria-hidden /> {fieldId.status === "ready" ? "Re-check" : fieldId.status === "error" ? "Retry" : "Download"}
            </Button>
            {fieldId.status === "ready" && fieldId.device === "webgpu" && (
              <Button variant="secondary" disabled={busy !== null} onClick={() => void downloadTier1()}>
                Retry on WASM
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={() => void removeTier("field-id", gemmaClient.modelIds().tier1)}
            >
              <Trash2 size={20} aria-hidden /> Remove
            </Button>
          </>
        }
      />

      <TierCard
        title="Tier 2 — Deep Look (≈3.3 GB)"
        modelId={gemmaClient.modelIds().tier2}
        meta="Gemma 4 E2B instruction-tuned · constrained-JSON feature verification · WebGPU only · never produces verdicts"
        status={
          deepLook.status === "loading" ? (
            <DownloadProgress pct={deepLook.progressPct} currentFile={deepLook.currentFile} bytes={formatBytes(null)} eta="calculating…" />
          ) : (
            <p>
              Status: <strong>{deepLook.status}</strong>
              {deepLook.error ? ` · ${deepLook.error}` : ""}
            </p>
          )
        }
        actions={
          <>
            <Button
              variant="primary"
              disabled={busy !== null || tier2Blocked || !tier2Confirmed}
              onClick={() => void downloadTier2()}
            >
              <Download size={20} aria-hidden /> Download Tier 2
            </Button>
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={() => void removeTier("deep-look", gemmaClient.modelIds().tier2)}
            >
              <Trash2 size={20} aria-hidden /> Remove
            </Button>
          </>
        }
      >
        <CapabilityGate onResult={setGate} />
        <label htmlFor="tier2-confirm" className="mt-2 block font-semibold">
          Type “3.3 GB” to confirm you understand the download size:
        </label>
        <input
          id="tier2-confirm"
          value={tier2Confirm}
          onChange={(e) => setTier2Confirm(e.target.value)}
          placeholder="3.3 GB"
          autoComplete="off"
          className="mt-1 block min-h-14 w-full rounded-xl border border-black/20 bg-white px-3 text-lg"
        />
      </TierCard>

      <QuotaInspector />
    </section>
  );
}
