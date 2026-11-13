import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Microscope, Trash2 } from "lucide-react";
import { deleteFieldLogEntry, getFieldLogEntry, type FieldLogRecord } from "../db/fieldLog.ts";
import VerdictBadge from "../components/assess/VerdictBadge.tsx";
import EmergencyCard from "../components/assess/EmergencyCard.tsx";
import Button from "../components/ui/Button.tsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.tsx";
import Pill from "../components/ui/Pill.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import MatchLedger from "../components/fieldlog/MatchLedger.tsx";
import ReasonLedger from "../components/fieldlog/ReasonLedger.tsx";
import SpecimenPlate from "../components/fieldlog/SpecimenPlate.tsx";
import { primaryLinkClass } from "../components/fieldlog/linkStyles.ts";
import { relativeTime } from "../components/fieldlog/time.ts";
import { useNow } from "../components/fieldlog/useNow.ts";
import { badgeToneOf, scientificNameOf, topNameOf } from "../components/fieldlog/verdict.ts";
import { formatDateTime } from "../lib/format.ts";
import type { Confidence } from "../engine/types.ts";

/** Observed-feature strings of a stored Deep Look, read defensively; null when none were saved. */
function storedObservations(tier2: unknown): string[] | null {
  if (!tier2 || typeof tier2 !== "object") return null;
  const json = (tier2 as { json?: unknown }).json;
  if (!json || typeof json !== "object") return [];
  const features = (json as { observed_features?: unknown }).observed_features;
  return Array.isArray(features) ? features.filter((f): f is string => typeof f === "string") : [];
}

export default function FieldLogDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [entry, setEntry] = useState<FieldLogRecord | null | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const now = useNow();

  useEffect(() => {
    if (!id) return;
    void getFieldLogEntry(id).then((e) => setEntry(e ?? null));
  }, [id]);

  useEffect(() => {
    if (!entry) return;
    const u = URL.createObjectURL(entry.imageBlob);
    setPhotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [entry]);

  if (entry === undefined) {
    return (
      <p role="status" className="mono-label flex min-h-14 items-center gap-2.5 text-ink-muted">
        <span aria-hidden className="size-2 rounded-full bg-amber animate-pulse-soft" />
        Loading entry…
      </p>
    );
  }
  if (entry === null) {
    return (
      <section aria-labelledby="missing-h" className="mx-auto grid w-full max-w-3xl gap-8 animate-rise-in">
        <div className="plate p-6 sm:p-8">
          <SectionHeader
            as="h1"
            id="missing-h"
            eyebrow="03 · Field Log"
            title="Entry not found"
            lede="This specimen is not in the on-device archive. It may have been deleted or never saved."
          />
          <Link to="/log" className={`${primaryLinkClass} mt-7 w-full sm:w-auto`}>
            <ArrowLeft size={20} aria-hidden /> Back to Field Log
          </Link>
        </div>
      </section>
    );
  }

  const v = entry.verdict as {
    headline?: unknown;
    confidence: Confidence;
    reasons?: string[];
  };
  // Imported entries can carry any badge string; anything outside the engine's
  // four verdicts is shown as UNKNOWN, the most cautious reading.
  const badge = badgeToneOf(entry.verdict);
  const headline = typeof v.headline === "string" ? v.headline : "No verdict headline was stored with this entry.";
  const t1 = entry.tier1 as { scores?: { speciesId: string; similarity: number }[] };
  const name = topNameOf(entry.verdict);
  const scientific = scientificNameOf(entry.verdict);
  const observations = storedObservations(entry.tier2);

  return (
    <article aria-labelledby="entry-h" className="grid gap-5 animate-rise-in">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/log"
          className="mono-label -ml-3 inline-flex items-center gap-2 rounded-full px-3 text-amber no-underline press hover:bg-surface-3"
        >
          <ArrowLeft size={16} aria-hidden /> Field Log
        </Link>
        <Pill tone="neutral" icon={<Clock />} title={formatDateTime(entry.createdAt)}>
          {relativeTime(entry.createdAt, now)}
        </Pill>
      </div>

      {/* Phone: name → verdict → plate → record. Desktop: plate pinned left, record right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-8">
        <SectionHeader
          as="h1"
          id="entry-h"
          eyebrow={`03 · Field Log · Entry ${entry.id.slice(0, 8)}`}
          title={name}
          {...(scientific ? { lede: <span className="sci text-xl">{scientific}</span> } : {})}
          className="lg:col-start-2 lg:row-start-1"
        />

        <div data-testid="verdict" className="lg:col-start-2 lg:row-start-2">
          <VerdictBadge badge={badge} headline={headline} confidence={v.confidence} />
        </div>

        <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <SpecimenPlate photoUrl={photoUrl} capturedAt={entry.createdAt} gps={entry.gps} dbVersion={entry.dbVersion} />
        </div>

        <div className="grid min-w-0 gap-8 lg:col-start-2 lg:row-start-3">
          {t1?.scores && t1.scores.length > 0 && (
            <section aria-label="Top matches" className="grid gap-4">
              <SectionHeader
                eyebrow="Tier 1 · Stored ranking"
                title="Top matches"
                lede="Embedding similarity recorded at assessment time — closeness to a reference description, not a probability of edibility."
              />
              <MatchLedger scores={t1.scores.slice(0, 5)} />
            </section>
          )}

          {observations !== null && (
            <section aria-label="Deep Look" className="rounded-plate border border-violet-ink/40 bg-violet-bg p-5">
              <p className="mono-label flex items-center gap-2 text-violet-ink">
                <Microscope size={14} aria-hidden /> Tier 2 · Deep Look saved with this entry
              </p>
              {observations.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {observations.map((f, i) => (
                    <li
                      key={i}
                      className="rounded-chip border border-violet-ink/30 px-2.5 py-1.5 font-mono text-xs text-ink"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[0.9375rem] text-ink-muted">No observed features were stored.</p>
              )}
            </section>
          )}

          {entry.userNotes && (
            <section aria-label="Notes" className="grid gap-4">
              <SectionHeader eyebrow="Field notes" title="Notes" />
              <p className="plate p-5 leading-relaxed whitespace-pre-wrap text-ink">{entry.userNotes}</p>
            </section>
          )}

          {v.reasons && v.reasons.length > 0 && (
            <section aria-label="Why this verdict" className="grid gap-4">
              <SectionHeader eyebrow="Safety engine · Trace" title="Why this verdict" />
              <ReasonLedger reasons={v.reasons} />
            </section>
          )}

          <EmergencyCard
            universal={[
              "Call your local emergency number if there is difficulty breathing, seizures, or loss of consciousness.",
              "Do not induce vomiting unless instructed by poison control.",
            ]}
            regional={null}
          />

          <div className="flex justify-end border-t border-line pt-6">
            <Button variant="danger" className="w-full sm:w-auto" onClick={() => setConfirm(true)}>
              <Trash2 size={20} aria-hidden /> Delete entry
            </Button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete this entry?"
          body="The photos and assessment will be removed from this device."
          confirmLabel="Delete"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            if (!id) return;
            void deleteFieldLogEntry(id).then(() => nav("/log"));
          }}
        />
      )}
    </article>
  );
}
