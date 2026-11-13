import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
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
import { scientificNameOf, topNameOf } from "../components/fieldlog/verdict.ts";
import { formatDateTime } from "../lib/format.ts";
import type { Badge, Confidence } from "../engine/types.ts";

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
      <p role="status" className="mono-label flex min-h-14 items-center gap-2 text-ink-muted">
        <span aria-hidden className="size-2 rounded-full bg-trail-glow animate-blink" />
        LOADING ENTRY…
      </p>
    );
  }
  if (entry === null) {
    return (
      <section className="grid gap-3 animate-rise-in">
        <div className="tac-card overflow-hidden p-0">
          <div aria-hidden className="hazard-stripes h-2.5" />
          <div className="p-5">
            <p className="mono-label text-danger">ERR · ENTRY NOT FOUND</p>
            <h1 className="mt-1 text-3xl font-black">Entry not found</h1>
            <p className="mt-2 text-base text-ink-muted">
              This specimen is not in the on-device archive. It may have been deleted or never saved.
            </p>
            <Link to="/log" className={`${primaryLinkClass} mt-4 w-full`}>
              <ArrowLeft size={20} aria-hidden /> Back to Field Log
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const v = entry.verdict as {
    badge: Badge;
    headline: string;
    confidence: Confidence;
    reasons?: string[];
  };
  const t1 = entry.tier1 as { scores?: { speciesId: string; similarity: number }[] };
  const name = topNameOf(entry.verdict);
  const scientific = scientificNameOf(entry.verdict);

  return (
    <article className="grid gap-4 animate-rise-in">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/log"
          className="mono-label -ml-2 inline-flex min-h-13 items-center gap-1.5 rounded-tac px-2 text-trail tac-press hover:bg-surface-2"
        >
          <ArrowLeft size={16} aria-hidden /> FIELD LOG
        </Link>
        <Pill tone="neutral" icon={<Clock />} title={formatDateTime(entry.createdAt)}>
          {relativeTime(entry.createdAt, now)}
        </Pill>
      </div>
      <SectionHeader
        as="h1"
        eyebrow={`03 · FIELD LOG · ENTRY ${entry.id.slice(0, 8).toUpperCase()}`}
        title={
          <>
            {name}
            {scientific && (
              <span className="mt-0.5 block text-base font-medium italic tracking-normal text-ink-muted">
                {scientific}
              </span>
            )}
          </>
        }
      />
      <SpecimenPlate photoUrl={photoUrl} capturedAt={entry.createdAt} gps={entry.gps} dbVersion={entry.dbVersion} />
      <div data-testid="verdict">
        <VerdictBadge badge={v.badge} headline={v.headline} confidence={v.confidence} />
      </div>
      {t1?.scores && t1.scores.length > 0 && (
        <section aria-label="Top matches">
          <SectionHeader eyebrow="TIER 1 · TOP MATCHES" title="Top matches" />
          <MatchLedger scores={t1.scores.slice(0, 5)} />
        </section>
      )}
      {entry.userNotes && (
        <section aria-label="Notes" className="tac-card p-4">
          <SectionHeader eyebrow="FIELD NOTES" title="Notes" />
          <p className="mt-3 whitespace-pre-wrap rounded-tac border border-line bg-surface-2 grid-paper p-3 text-lg leading-relaxed text-ink">
            {entry.userNotes}
          </p>
        </section>
      )}
      {v.reasons && v.reasons.length > 0 && (
        <section aria-label="Why this verdict">
          <SectionHeader eyebrow="SAFETY ENGINE · TRACE" title="Why this verdict" />
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
      <Button
        variant="danger"
        onClick={() => setConfirm(true)}
      >
        <Trash2 size={20} aria-hidden /> Delete entry
      </Button>
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
