import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Cpu, MapPin, Save } from "lucide-react";
import VerdictBadge from "../components/assess/VerdictBadge.tsx";
import CandidateList from "../components/assess/CandidateList.tsx";
import LookalikeCards from "../components/assess/LookalikeCards.tsx";
import Checklist from "../components/assess/Checklist.tsx";
import ReasonTrace from "../components/assess/ReasonTrace.tsx";
import EmergencyCard from "../components/assess/EmergencyCard.tsx";
import DeepLookPanel from "../components/assess/DeepLookPanel.tsx";
import Button from "../components/ui/Button.tsx";
import { useScanStore } from "../stores/scanStore.ts";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { useModelStore } from "../stores/modelStore.ts";
import { computeVerdict } from "../engine/safetyEngine.ts";
import type { FloraDB, SafetyVerdict, Species, TierScore } from "../engine/types.ts";
import type { DeepLookJson } from "../engine/deepLookSchema.ts";
import { sha256Hex, shortHash } from "../lib/hash.ts";
import { getSpeciesEmbeddings, makeCacheKey, putSpeciesEmbeddings } from "../db/embeddingsCache.ts";
import { addFieldLogEntry, makeFieldLogId } from "../db/fieldLog.ts";
import { getCurrentFix, type GpsFix } from "../lib/geo.ts";
import { __getTestHook, gemmaClient } from "../ai/gemmaClient.ts";
import { formatDateTime } from "../lib/format.ts";

type Phase = "loading" | "needs-setup" | "identifying" | "done" | "error" | "expired";

export default function Assess() {
  const { id } = useParams();
  const nav = useNavigate();
  const draft = useScanStore((s) => s.draft);
  const region = useSettingsStore((s) => s.region);
  const gpsEnabled = useSettingsStore((s) => s.gpsEnabled);
  const setTier = useModelStore((s) => s.setTier);
  const deepLookState = useModelStore((s) => s.deepLook);

  const [phase, setPhase] = useState<Phase>("loading");
  const [db, setDb] = useState<FloraDB | null>(null);
  const [scores, setScores] = useState<TierScore[]>([]);
  const [verdict, setVerdict] = useState<SafetyVerdict | null>(null);
  const [inferenceMs, setInferenceMs] = useState(0);
  const [statusLine, setStatusLine] = useState("Loading safety database…");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deepLookText, setDeepLookText] = useState("");
  const [deepLookJson, setDeepLookJson] = useState<DeepLookJson | null>(null);
  const [deepLooking, setDeepLooking] = useState(false);

  const photoUrl = useMemo(() => {
    if (!draft || draft.id !== id) return null;
    return URL.createObjectURL(draft.blob);
  }, [draft, id]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    const currentDraft = draft;
    if (!currentDraft || currentDraft.id !== id) {
      setPhase("expired");
      return;
    }
    const frameWidth = currentDraft.width;
    const frameHeight = currentDraft.height;
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/data/flora_safety_db.json");
        if (!res.ok) throw new Error(`Safety database unavailable (HTTP ${res.status}).`);
        const text = await res.text();
        const parsed = JSON.parse(text) as FloraDB;
        const hash = shortHash(await sha256Hex(text));
        if (cancelled) return;
        setDb(parsed);

        const frame = (window as unknown as { __trailsnackFrame?: ArrayBuffer }).__trailsnackFrame;
        const testMode = __getTestHook().enabled;

        if (testMode) {
          const mock = __getTestHook().identifyScores ?? [];
          setScores(mock);
          setInferenceMs(1);
          setVerdict(computeVerdict(mock, parsed, { region }));
          setPhase("done");
          return;
        }

        if (!frame) {
          setPhase("expired");
          return;
        }

        // Ensure Tier 1 is ready (init if needed).
        setStatusLine("Loading on-device identification…");
        setTier("field-id", { status: "loading", error: null });
        const settings = useSettingsStore.getState();
        const device = await gemmaClient.getDevice(settings.preferredDevice);
        try {
          await gemmaClient.initTier("field-id", {
            device: settings.preferredDevice,
            onProgress: (pct, file) => setTier("field-id", { progressPct: pct, currentFile: file, device }),
          });
        } catch {
          setPhase("needs-setup");
          setTier("field-id", { status: "error", error: "Model unavailable" });
          return;
        }
        if (cancelled) return;
        // initTier may have fallen back from WebGPU to WASM: use the device
        // actually in effect, or the embedding cache key gets the wrong dtype.
        const actual = gemmaClient.currentDevice() ?? device;
        setTier("field-id", { status: "ready", progressPct: 100, device: actual });

        // Species index: idb cache or compute in worker.
        const dtype = actual === "webgpu" ? "q4f16" : "q4";
        const cacheKey = makeCacheKey(gemmaClient.modelIds().tier1, dtype, hash);
        setStatusLine("Preparing species index…");
        const cached = await getSpeciesEmbeddings(cacheKey).catch(() => undefined);
        const speciesPayload = parsed.species.map((s) => ({
          id: s.id,
          prompts: s.visual_prompts,
          commonName: s.common_names[0] ?? s.id,
          scientificName: s.scientific_name,
        }));
        if (cached && !cancelled) {
          await gemmaClient.prepareSpeciesIndex(speciesPayload, { cached, dbHash: hash });
        } else if (!cancelled) {
          const built = await gemmaClient.prepareSpeciesIndex(speciesPayload, { dbHash: hash });
          await putSpeciesEmbeddings({
            cacheKey,
            dims: built.dims,
            speciesIds: built.speciesIds,
            promptOffsets: built.promptOffsets,
            matrix: built.matrix,
            createdAt: Date.now(),
          }).catch(() => undefined);
        }
        if (cancelled) return;

        setStatusLine("Identifying…");
        setPhase("identifying");
        const t0 = performance.now();
        const out = await gemmaClient.identify(
          { data: frame.slice(0), width: frameWidth, height: frameHeight },
          8,
        );
        if (cancelled) return;
        setScores(out.scores);
        setInferenceMs(Math.round(performance.now() - t0));
        setVerdict(computeVerdict(out.scores, parsed, { region }));
        setPhase("done");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setPhase("error");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const speciesMap = useMemo(() => {
    const m = new Map<string, Species>();
    db?.species.forEach((s) => m.set(s.id, s));
    return m;
  }, [db]);

  const tellApart = useMemo(() => {
    const m = new Map<string, string>();
    const top = verdict?.topCandidate;
    top?.confusable_with.forEach((c) => m.set(c.species_id, c.how_to_tell_apart));
    return m;
  }, [verdict]);

  async function runDeepLook() {
    if (!db || scores.length === 0) return;
    const frame = (window as unknown as { __trailsnackFrame?: ArrayBuffer }).__trailsnackFrame;
    if (!frame || !draft) return;
    setDeepLooking(true);
    setDeepLookText("");
    setDeepLookJson(null);
    try {
      const candidates = scores.slice(0, 3).map((s) => {
        const sp = speciesMap.get(s.speciesId);
        return {
          id: s.speciesId,
          commonName: sp?.common_names[0] ?? s.speciesId,
          scientificName: sp?.scientific_name ?? s.speciesId,
          checklist: sp?.verification_checklist ?? [],
        };
      });
      const out = await gemmaClient.deepLook(
        { data: frame.slice(0), width: draft.width, height: draft.height },
        candidates,
        (t) => setDeepLookText((prev) => prev + t),
      );
      setDeepLookJson(out.json);
      // Recompute through the deterministic engine: Deep Look can only downgrade.
      setVerdict(computeVerdict(scores, db, { region, deepLook: out.json }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeepLookText(
        /abort/i.test(msg) ? "Deep Look cancelled." : `Deep Look could not finish: ${msg}. The Tier 1 verdict above stands.`,
      );
    } finally {
      setDeepLooking(false);
    }
  }

  function cancelDeepLook() {
    gemmaClient.abortDeepLook();
  }

  async function captureGps() {
    setGpsError(null);
    try {
      setGps(await getCurrentFix());
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : "GPS failed.");
    }
  }

  async function save() {
    if (!draft || !db || !verdict) return;
    setSaving(true);
    try {
      const entryId = makeFieldLogId();
      await addFieldLogEntry({
        id: entryId,
        createdAt: Date.now(),
        imageBlob: draft.blob,
        thumbnailBlob: draft.thumbnailBlob,
        tier1: { scores, inferenceMs },
        ...(deepLookJson ? { tier2: { json: deepLookJson } } : {}),
        verdict: {
          badge: verdict.badge,
          headline: verdict.headline,
          confidence: verdict.confidence,
          topCandidate: verdict.topCandidate,
          reasons: verdict.reasons,
        },
        ...(gps ? { gps: { lat: gps.lat, lon: gps.lon, accuracyM: gps.accuracyM, ...(gps.altitudeM !== undefined ? { altitudeM: gps.altitudeM } : {}), capturedAt: gps.capturedAt } } : {}),
        ...(notes ? { userNotes: notes } : {}),
        dbVersion: db.version,
        appVersion: "0.1.0",
      });
      nav(`/log/${entryId}`);
    } finally {
      setSaving(false);
    }
  }

  if (phase === "expired") {
    return (
      <section aria-labelledby="exp-h" className="grid gap-3">
        <h1 id="exp-h" className="text-3xl font-extrabold">
          Draft expired
        </h1>
        <p>
          This assessment draft is no longer in memory (reloads clear unsaved drafts to
          protect your privacy). Take or pick a fresh photo — your saved Field Log entries
          are unaffected.
        </p>
        <Link to="/scan" className="min-h-14 rounded-xl bg-(--color-trail) px-5 text-center text-lg font-semibold text-white">
          Back to Scan
        </Link>
      </section>
    );
  }

  if (phase === "needs-setup") {
    return (
      <section className="grid gap-3">
        <h1 className="text-3xl font-extrabold">Offline ID not ready</h1>
        <p>The Tier 1 model is not downloaded yet. Set it up once over Wi-Fi, then identify offline.</p>
        <Link to="/models" className="min-h-14 rounded-xl bg-(--color-trail) px-5 text-center text-lg font-semibold text-white">
          Go to Models
        </Link>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="grid gap-3">
        <h1 className="text-3xl font-extrabold">Assessment failed</h1>
        <p role="alert" className="rounded-2xl bg-(--color-caution-bg) p-3 text-(--color-caution)">
          {error ?? "Unknown error."} When in doubt: do not ingest.
        </p>
        <Link to="/scan" className="min-h-14 rounded-xl bg-(--color-trail) px-5 text-center text-lg font-semibold text-white">
          Try another photo
        </Link>
      </section>
    );
  }

  if (!verdict || !db) {
    return (
      <section aria-labelledby="assess-loading" aria-live="polite" className="grid gap-3">
        <h1 id="assess-loading" className="text-3xl font-extrabold">
          Assessing…
        </h1>
        <p role="status">{statusLine}</p>
      </section>
    );
  }

  const deepLookReady = deepLookState.status === "ready";
  return (
    <article aria-labelledby="assess-h" className="grid gap-4" data-testid="assessment">
      <h1 id="assess-h" className="sr-only">
        Instant assessment
      </h1>
      {photoUrl && (
        <img src={photoUrl} alt="Your specimen photo" className="aspect-square w-full rounded-2xl object-cover" />
      )}
      <div data-testid="verdict">
        <VerdictBadge badge={verdict.badge} headline={verdict.headline} confidence={verdict.confidence} />
      </div>
      <p className="text-base opacity-70">
        Assessed {formatDateTime(Date.now())} · {inferenceMs} ms on-device · database {db.version}
      </p>

      <CandidateList scores={scores} species={speciesMap} />
      <LookalikeCards lookalikes={verdict.hazardousLookalikes} tellApart={tellApart} />
      <Checklist items={verdict.checklist} />
      <ReasonTrace reasons={verdict.reasons} />
      <EmergencyCard universal={verdict.emergency.universal} regional={verdict.emergency.regional} />

      <section aria-labelledby="deeplook-cta-h" className="rounded-2xl border border-black/10 p-4">
        <h2 id="deeplook-cta-h" className="flex items-center gap-2 text-xl font-bold">
          <Cpu size={22} aria-hidden /> Deep Look (Tier 2)
        </h2>
        {deepLookReady ? (
          <Button
            variant="secondary"
            className="mt-2 w-full"
            disabled={deepLooking}
            onClick={() => void runDeepLook()}
          >
            {deepLooking ? "Describing features…" : "Describe visible features"}
          </Button>
        ) : (
          <p className="mt-1">
            Deep Look needs the ≈3.3 GB Tier 2 model on a WebGPU device.{" "}
            <Link to="/models" className="font-semibold text-(--color-trail) underline">
              Open Models to review the requirements
            </Link>
            .
          </p>
        )}
      </section>
      <DeepLookPanel streaming={deepLookText} result={deepLookJson} cancellable={deepLooking} onCancel={cancelDeepLook} />

      <section aria-labelledby="save-h" className="grid gap-2 rounded-2xl border border-black/10 p-4">
        <h2 id="save-h" className="text-xl font-bold">
          Save to Field Log
        </h2>
        <label htmlFor="notes" className="font-semibold">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Where, how many, what the patch looked like…"
          className="rounded-xl border border-black/20 p-3 text-lg"
        />
        {gpsEnabled && (
          <div>
            <Button variant="secondary" onClick={() => void captureGps()}>
              <MapPin size={20} aria-hidden /> {gps ? "Refresh GPS fix" : "Add GPS fix"}
            </Button>
            {gps && (
              <p className="mt-1 text-base">
                {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)} (±{Math.round(gps.accuracyM)} m)
              </p>
            )}
            {gpsError && <p role="alert" className="text-base text-(--color-danger)">{gpsError}</p>}
          </div>
        )}
        <Button variant="primary" onClick={() => void save()} disabled={saving} className="min-h-16 text-xl">
          <Save size={22} aria-hidden /> {saving ? "Saving…" : "Save to Field Log"}
        </Button>
      </section>
    </article>
  );
}
