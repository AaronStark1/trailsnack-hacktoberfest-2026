import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { deleteFieldLogEntry, getFieldLogEntry, type FieldLogRecord } from "../db/fieldLog.ts";
import VerdictBadge from "../components/assess/VerdictBadge.tsx";
import EmergencyCard from "../components/assess/EmergencyCard.tsx";
import Button from "../components/ui/Button.tsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.tsx";
import { formatDateTime } from "../lib/format.ts";
import type { Badge, Confidence } from "../engine/types.ts";

export default function FieldLogDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [entry, setEntry] = useState<FieldLogRecord | null | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

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

  if (entry === undefined) return <p role="status">Loading entry…</p>;
  if (entry === null) {
    return (
      <section className="grid gap-3">
        <h1 className="text-3xl font-extrabold">Entry not found</h1>
        <Link to="/log" className="text-lg text-(--color-trail) underline">
          Back to Field Log
        </Link>
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

  return (
    <article className="grid gap-4">
      {photoUrl && <img src={photoUrl} alt="Saved specimen photo" className="aspect-square w-full rounded-2xl object-cover" />}
      <div data-testid="verdict">
        <VerdictBadge badge={v.badge} headline={v.headline} confidence={v.confidence} />
      </div>
      <p className="text-base opacity-70">
        {formatDateTime(entry.createdAt)}
        {entry.gps ? ` · ${entry.gps.lat.toFixed(5)}, ${entry.gps.lon.toFixed(5)} (±${Math.round(entry.gps.accuracyM)} m)` : " · no GPS"}
        {` · database ${entry.dbVersion}`}
      </p>
      {t1?.scores && t1.scores.length > 0 && (
        <section aria-label="Top matches">
          <h2 className="text-xl font-bold">Top matches</h2>
          <ul className="mt-1 grid gap-1">
            {t1.scores.slice(0, 5).map((s) => (
              <li key={s.speciesId}>
                {s.speciesId} — {(s.similarity * 100).toFixed(0)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {entry.userNotes && (
        <section aria-label="Notes">
          <h2 className="text-xl font-bold">Notes</h2>
          <p>{entry.userNotes}</p>
        </section>
      )}
      {v.reasons && v.reasons.length > 0 && (
        <section aria-label="Why this verdict">
          <h2 className="text-xl font-bold">Why this verdict</h2>
          <ol className="list-decimal pl-6">
            {v.reasons.map((r, i) => (
              <li key={i} className="mt-1">
                {r}
              </li>
            ))}
          </ol>
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
