import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CameraOff, CloudDownload, MapPin, Microscope, Save, TriangleAlert } from "lucide-react";
import VerdictBadge from "../components/assess/VerdictBadge.tsx";
import CandidateList from "../components/assess/CandidateList.tsx";
import LookalikeCards from "../components/assess/LookalikeCards.tsx";
import Checklist from "../components/assess/Checklist.tsx";
import ReasonTrace from "../components/assess/ReasonTrace.tsx";
import EmergencyCard from "../components/assess/EmergencyCard.tsx";
import DeepLookPanel from "../components/assess/DeepLookPanel.tsx";
import SpecimenFrame from "../components/assess/SpecimenFrame.tsx";
import Button, { buttonClass } from "../components/ui/Button.tsx";
import Emblem from "../components/ui/Emblem.tsx";
import Pill from "../components/ui/Pill.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
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

type Phase = "loading" | "needs-setup" | "identifying" | "done" | "error" | "expired";

/** Shared frame for the non-result states (expired, needs setup, failed, working). */
const STATE_PLATE = "plate mx-auto grid w-full max-w-xl justify-items-start gap-4 p-6 animate-rise-in sm:p-8";
const STATE_ICON = "flex size-14 items-center justify-center rounded-full border";

export default function Assess() {
  const { id } = useParams();
  const nav = useNavigate();
  const draft = useScanStore((s) => s.draft);
  const region = useSettingsStore((s) => s.region);
  const gpsEnabled = useSettingsStore((s) => s.gpsEnabled);
  const setTier = useModelStore((s) => s.setTier);
  const deepLookState = useModelStore((s) => s.deepLook);
  const fieldIdDevice = useModelStore((s) => s.fieldId.device);

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
  const [imageHash, setImageHash] = useState<string | null>(null);

  // Object URL for the specimen photo. Created and revoked inside one effect so
  // the URL in state is always live (a memoised URL is left revoked when React
  // re-runs effects, which showed a broken image in development).
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!draft || draft.id !== id) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.blob);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft, id]);

  // Display-only fingerprint of the stored image bytes for the specimen label.
  // Unavailable (e.g. no SubtleCrypto) simply means the row is not shown.
  useEffect(() => {
    if (!draft || draft.id !== id) return;
    let cancelled = false;
    setImageHash(null);
    void draft.blob
      .arrayBuffer()
      .then((bytes) => sha256Hex(bytes))
      .then((hex) => {
        if (!cancelled) setImageHash(shortHash(hex));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [draft, id]);

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
      <section aria-labelledby="exp-h" className={STATE_PLATE}>
        <span className={`${STATE_ICON} border-line-strong bg-surface-2 text-ink-muted`}>
          <CameraOff size={26} aria-hidden />
        </span>
        <p className="mono-label text-ink-faint">Nothing to assess</p>
        <h1 id="exp-h" className="display text-display-md">
          Draft expired
        </h1>
        <p className="text-ink-muted">
          This assessment draft is no longer in memory (reloads clear unsaved drafts to
          protect your privacy). Take or pick a fresh photo — your saved Field Log entries
          are unaffected.
        </p>
        <Link to="/scan" className={`${buttonClass("primary")} mt-2 w-full sm:w-auto`}>
          Back to Scan
        </Link>
      </section>
    );
  }

  if (phase === "needs-setup") {
    return (
      <section aria-labelledby="setup-h" className={STATE_PLATE}>
        <span className={`${STATE_ICON} border-caution/50 bg-caution-bg text-caution`}>
          <CloudDownload size={26} aria-hidden />
        </span>
        <p className="mono-label text-caution">Tier 1 model missing</p>
        <h1 id="setup-h" className="display text-display-md">
          Offline ID not ready
        </h1>
        <p className="text-ink-muted">
          The Tier 1 model is not downloaded yet. Set it up once over Wi-Fi, then identify offline.
        </p>
        <Link to="/models" className={`${buttonClass("primary")} mt-2 w-full sm:w-auto`}>
          Go to Models
        </Link>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section aria-labelledby="fault-h" className="plate mx-auto w-full max-w-xl overflow-hidden border-danger/50 animate-rise-in">
        <div aria-hidden className="thorn-edge text-danger" />
        <div className="grid justify-items-start gap-4 p-6 sm:p-8">
          <span className={`${STATE_ICON} border-danger/50 bg-danger-bg text-danger-ink`}>
            <TriangleAlert size={26} aria-hidden />
          </span>
          <p className="mono-label text-danger-ink">No verdict was produced</p>
          <h1 id="fault-h" className="display text-display-md">
            Assessment failed
          </h1>
          <p
            role="alert"
            className="w-full rounded-field border border-caution/60 bg-caution-bg p-4 leading-snug font-semibold break-words text-caution"
          >
            {error ?? "Unknown error."} When in doubt: do not ingest.
          </p>
          <Link to="/scan" className={`${buttonClass("primary")} mt-2 w-full sm:w-auto`}>
            Try another photo
          </Link>
        </div>
      </section>
    );
  }

  if (!verdict || !db) {
    return (
      <section aria-labelledby="assess-loading" aria-live="polite" className={STATE_PLATE}>
        <Emblem size={52} className="text-ink animate-pulse-soft" />
        <p className="mono-label text-amber">On-device · nothing leaves this device</p>
        <h1 id="assess-loading" className="display text-display-md">
          Assessing…
        </h1>
        <p role="status" className="well w-full rounded-field px-4 py-3.5 font-mono text-[0.9375rem] text-ink-muted">
          {statusLine}
        </p>
        {/* Placeholder shapes for the result that is still being computed. */}
        <div aria-hidden className="grid w-full gap-3 pt-1">
          <span className="skeleton h-16 w-3/4" />
          <span className="skeleton h-4 w-full" />
          <span className="skeleton h-4 w-5/6" />
        </div>
        <p className="text-[0.9375rem] text-ink-muted">Until a verdict appears: unidentified — do not ingest.</p>
      </section>
    );
  }

  const deepLookReady = deepLookState.status === "ready";
  const deepLookPill = deepLooking
    ? { tone: "violet" as const, live: true, text: "Inspecting" }
    : deepLookReady
      ? { tone: "violet" as const, live: false, text: "Model ready" }
      : { tone: "neutral" as const, live: false, text: "Model not loaded" };
  return (
    <article
      aria-labelledby="assess-h"
      data-testid="assessment"
      className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10"
    >
      <h1 id="assess-h" className="sr-only">
        Instant assessment
      </h1>

      {/* Left on desktop, first on phones: the specimen and its capture label. */}
      <div className="lg:sticky lg:top-24">
        <SpecimenFrame
          photoUrl={photoUrl}
          capturedAt={draft?.createdAt ?? Date.now()}
          width={draft?.width ?? 0}
          height={draft?.height ?? 0}
          inferenceMs={inferenceMs}
          imageHash={imageHash}
          device={fieldIdDevice}
          dbVersion={db.version}
        />
      </div>

      <div className="grid min-w-0 gap-9">
        <div data-testid="verdict">
          <VerdictBadge badge={verdict.badge} headline={verdict.headline} confidence={verdict.confidence} />
        </div>

        <LookalikeCards lookalikes={verdict.hazardousLookalikes} tellApart={tellApart} />
        <CandidateList scores={scores} species={speciesMap} />
        <Checklist items={verdict.checklist} />
        <ReasonTrace reasons={verdict.reasons} />

        {/* Tier 2 Deep Look: one elderberry panel holding the trigger and its transcript. */}
        <div className="relative overflow-hidden rounded-plate border border-violet-ink/35 bg-violet-bg shadow-plate">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-violet opacity-25 blur-3xl hc:hidden"
          />
          <div className="relative grid gap-5 p-5 sm:p-6">
            <section aria-labelledby="deeplook-cta-h" className="grid gap-4">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-violet-ink/45 bg-bg/40 text-violet-ink">
                  <Microscope size={22} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mono-label text-violet-ink">Tier 2 · feature inspection</p>
                  <h2 id="deeplook-cta-h" className="display mt-2 text-display-md text-ink">
                    Deep Look
                  </h2>
                  <Pill tone={deepLookPill.tone} dot live={deepLookPill.live} className="mt-3">
                    {deepLookPill.text}
                  </Pill>
                </div>
              </div>
              <p className="text-ink-muted">
                Describes what is visible and checks it against the top candidates. It can only lower
                the verdict, never raise it.
              </p>
              {deepLookReady ? (
                <Button
                  variant="violet"
                  className="w-full"
                  disabled={deepLooking}
                  onClick={() => void runDeepLook()}
                >
                  <Microscope size={20} aria-hidden />
                  {deepLooking ? "Describing features…" : "Describe visible features"}
                </Button>
              ) : (
                <div className="grid gap-3">
                  <p className="text-ink">Deep Look needs the ≈3.3 GB Tier 2 model on a WebGPU device.</p>
                  <Link to="/models" className={`${buttonClass("secondary")} w-full border-violet-ink/45`}>
                    Open Models to review the requirements
                  </Link>
                </div>
              )}
            </section>
            <DeepLookPanel
              streaming={deepLookText}
              result={deepLookJson}
              cancellable={deepLooking}
              onCancel={cancelDeepLook}
            />
          </div>
        </div>

        <EmergencyCard universal={verdict.emergency.universal} regional={verdict.emergency.regional} />

        <section aria-labelledby="save-h" className="plate grid gap-5 p-5 sm:p-6">
          <SectionHeader id="save-h" eyebrow="Field journal" title="Save to Field Log" />
          <div className="grid gap-2">
            <label htmlFor="notes" className="mono-label text-ink-faint">
              Field notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Where, how many, what the patch looked like…"
              className="field min-h-28 w-full p-4 leading-relaxed"
            />
          </div>
          {gpsEnabled && (
            <div className="grid gap-3">
              <Button variant="secondary" className="w-full" onClick={() => void captureGps()}>
                <MapPin size={20} aria-hidden /> {gps ? "Refresh GPS fix" : "Add GPS fix"}
              </Button>
              {gps && (
                <p className="well flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field px-4 py-3">
                  <span className="mono-label text-glow">Geotag</span>
                  <span className="mono-value text-[0.9375rem] text-ink">
                    {Math.abs(gps.lat).toFixed(5)}° {gps.lat >= 0 ? "N" : "S"} · {Math.abs(gps.lon).toFixed(5)}°{" "}
                    {gps.lon >= 0 ? "E" : "W"} ±{Math.round(gps.accuracyM)} m
                  </span>
                </p>
              )}
              {gpsError && (
                <p role="alert" className="leading-snug font-semibold text-danger-ink">
                  {gpsError}
                </p>
              )}
            </div>
          )}
          <Button variant="primary" size="lg" className="w-full" onClick={() => void save()} disabled={saving}>
            <Save size={22} aria-hidden /> {saving ? "Saving…" : "Save to Field Log"}
          </Button>
        </section>
      </div>
    </article>
  );
}
