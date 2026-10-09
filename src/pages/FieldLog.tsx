import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Sprout, Upload } from "lucide-react";
import { deleteFieldLogEntry, listFieldLogEntries, type FieldLogRecord } from "../db/fieldLog.ts";
import { addFieldLogEntry } from "../db/fieldLog.ts";
import { exportLogCSV, exportLogJSON, importLogJSON } from "../lib/export.ts";
import { formatDateTime } from "../lib/format.ts";
import Button from "../components/ui/Button.tsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.tsx";

function badgeOf(entry: FieldLogRecord): string {
  const v = entry.verdict as { badge?: string };
  return typeof v?.badge === "string" ? v.badge : "UNKNOWN";
}

function topOf(entry: FieldLogRecord): string {
  const v = entry.verdict as { topCandidate?: { common_names?: string[] } };
  return v?.topCandidate?.common_names?.[0] ?? "Unidentified";
}

export default function FieldLog() {
  const [entries, setEntries] = useState<FieldLogRecord[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setEntries(await listFieldLogEntries());
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section aria-labelledby="log-h" className="grid gap-3">
      <h1 id="log-h" className="text-3xl font-extrabold">
        Field Log
      </h1>
      {notice && (
        <p role="status" className="rounded-2xl bg-(--color-edible-bg) p-3 text-(--color-edible)">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void exportLogJSON()}>
          <Download size={20} aria-hidden /> Export JSON
        </Button>
        <Button variant="secondary" onClick={() => void exportLogCSV()}>
          <Download size={20} aria-hidden /> Export CSV
        </Button>
        <label className="inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-2 border-(--color-trail) px-5 text-lg font-semibold text-(--color-trail)">
          <Upload size={20} aria-hidden /> Import JSON
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            aria-label="Import field log JSON"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void importLogJSON(f, (entry) => addFieldLogEntry(entry)).then((r) => {
                setNotice(`Imported ${r.imported} entries${r.skipped ? `, skipped ${r.skipped}` : ""}.`);
                void refresh();
              });
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/25 p-6 text-center">
          <Sprout size={40} aria-hidden className="mx-auto" />
          <p className="mt-2 text-xl font-bold">No entries yet — the trail is waiting.</p>
          <p className="mt-1">
            Head outside, photograph one specimen at a time, and your assessments will
            collect here with verdicts, lookalikes, and checklists.
          </p>
          <Link to="/scan" className="mt-3 inline-block min-h-14 rounded-xl bg-(--color-trail) px-5 py-3 text-lg font-semibold text-white">
            Scan your first specimen
          </Link>
        </div>
      ) : (
        <ol className="grid gap-3">
          {entries.map((e) => (
            <li key={e.id} className="rounded-2xl border border-black/10 p-3">
              <Link to={`/log/${e.id}`} className="flex items-center gap-3" aria-label={`Open log entry: ${topOf(e)}, ${badgeOf(e)}`}>
                <Thumbnail blob={e.thumbnailBlob} label={topOf(e)} />
                <span className="flex-1">
                  <span className="block text-lg font-bold">{topOf(e)}</span>
                  <span className="block text-base opacity-70">{formatDateTime(e.createdAt)}</span>
                  {e.gps && (
                    <span className="block text-base opacity-70">
                      {e.gps.lat.toFixed(4)}, {e.gps.lon.toFixed(4)}
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-base font-extrabold ${
                    badgeOf(e) === "TOXIC"
                      ? "bg-(--color-danger-bg) text-(--color-danger)"
                      : badgeOf(e) === "CAUTION"
                        ? "bg-(--color-caution-bg) text-(--color-caution)"
                        : badgeOf(e) === "EDIBLE"
                          ? "bg-(--color-edible-bg) text-(--color-edible)"
                          : "bg-(--color-unknown-bg) text-(--color-unknown)"
                  }`}
                >
                  {badgeOf(e)}
                </span>
              </Link>
              <Button variant="ghost" className="mt-1 min-h-12 text-base" onClick={() => setConfirmDelete(e.id)}>
                Delete entry
              </Button>
            </li>
          ))}
        </ol>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this entry?"
          body="The photos and assessment will be removed from this device. This cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            const target = confirmDelete;
            setConfirmDelete(null);
            void deleteFieldLogEntry(target).then(() => refresh());
          }}
        />
      )}
    </section>
  );
}

function Thumbnail({ blob, label }: { blob: Blob; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return <span className="h-16 w-16 rounded-xl bg-black/10" aria-hidden />;
  return <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" aria-label={`${label} thumbnail`} />;
}
