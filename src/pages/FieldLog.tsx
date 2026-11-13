import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Braces, ClipboardCheck, FileSpreadsheet, Import, MapPin, NotebookPen, Trash2 } from "lucide-react";
import { deleteFieldLogEntry, listFieldLogEntries, type FieldLogRecord } from "../db/fieldLog.ts";
import { addFieldLogEntry } from "../db/fieldLog.ts";
import { exportLogCSV, exportLogJSON, importLogJSON } from "../lib/export.ts";
import { formatDateTime } from "../lib/format.ts";
import Button from "../components/ui/Button.tsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.tsx";
import Emblem from "../components/ui/Emblem.tsx";
import Pill from "../components/ui/Pill.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import BayTile from "../components/fieldlog/BayTile.tsx";
import { gpsStamp } from "../components/fieldlog/gps.ts";
import { primaryLinkClass } from "../components/fieldlog/linkStyles.ts";
import { relativeTime } from "../components/fieldlog/time.ts";
import { useNow } from "../components/fieldlog/useNow.ts";
import {
  badgeTextOf,
  badgeToneOf,
  rimClass,
  scientificNameOf,
  stampClass,
  topNameOf,
} from "../components/fieldlog/verdict.ts";

function badgeOf(entry: FieldLogRecord): string {
  return badgeTextOf(entry.verdict);
}

function topOf(entry: FieldLogRecord): string {
  return topNameOf(entry.verdict);
}

export default function FieldLog() {
  const [entries, setEntries] = useState<FieldLogRecord[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<number | null>(null);
  const now = useNow();

  async function refresh() {
    setEntries(await listFieldLogEntries());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const count = String(entries.length);

  return (
    <section aria-labelledby="log-h" className="grid gap-3 animate-rise-in">
      <SectionHeader
        as="h1"
        id="log-h"
        eyebrow="03 · FIELD LOG"
        title="Specimen Archive"
        right={
          <Pill tone="trail" icon={<NotebookPen />}>
            {entries.length} ENTRIES
          </Pill>
        }
      />

      {notice && (
        <div role="status" className="tac-card flex items-center gap-3 border-l-8 border-l-edible p-3 animate-rise-in">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-tac-sm bg-edible-bg text-edible">
            <ClipboardCheck size={22} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="mono-label block text-edible">IMPORT COMPLETE</span>
            <span className="mt-1 block text-base font-semibold text-ink">{notice}</span>
          </span>
        </div>
      )}

      <div className="tac-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="mono-label text-ink-muted">DATA EXPORT BAY</p>
          <p className="mono-label text-ink-muted">LOCAL FILES ONLY</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <BayTile icon={<Braces />} label="Export JSON" counter={count} onClick={() => void exportLogJSON()} />
          <BayTile icon={<FileSpreadsheet />} label="Export CSV" counter={count} onClick={() => void exportLogCSV()} />
          <BayTile
            as="label"
            icon={<Import />}
            label="Import Field Notes"
            counter={lastImported === null ? "JSON" : String(lastImported)}
          >
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
                  setLastImported(r.imported);
                  void refresh();
                });
                e.target.value = "";
              }}
            />
          </BayTile>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="tac-card topo overflow-hidden p-6 text-center">
          <Emblem size={48} className="mx-auto text-trail" />
          <p className="mono-label mt-3 text-ink-muted">ARCHIVE EMPTY</p>
          <h2 className="mt-1 text-2xl font-extrabold">No entries yet — the trail is waiting.</h2>
          <p className="mx-auto mt-2 max-w-md text-base text-ink-muted">
            Head outside, photograph one specimen at a time, and your assessments will
            collect here with verdicts, lookalikes, and checklists.
          </p>
          <Link to="/scan" className={`${primaryLinkClass} mt-4`}>
            Scan your first specimen
          </Link>
        </div>
      ) : (
        <ol className="grid gap-3">
          {entries.map((e, i) => {
            const tone = badgeToneOf(e.verdict);
            const scientific = scientificNameOf(e.verdict);
            return (
              <li key={e.id} className={`tac-card overflow-hidden p-0 border-l-8 ${rimClass[tone]}`}>
                <Link
                  to={`/log/${e.id}`}
                  className="flex min-h-[88px] items-center gap-3 p-3 tac-press hover:bg-surface-2"
                  aria-label={`Open log entry: ${topOf(e)}, ${badgeOf(e)}`}
                >
                  <Thumbnail blob={e.thumbnailBlob} label={topOf(e)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-extrabold leading-tight text-ink">{topOf(e)}</span>
                    {scientific && (
                      <span className="block truncate text-base italic text-ink-muted">{scientific}</span>
                    )}
                    <span className="mono-label mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
                      <span title={formatDateTime(e.createdAt)}>{relativeTime(e.createdAt, now)}</span>
                      <span aria-hidden className="text-ink-faint">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} aria-hidden />
                        {gpsStamp(e.gps)}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`stamp text-sm ${stampClass[tone]}`}>{badgeOf(e)}</span>
                    <span className="mono-label text-ink-muted">№ {String(entries.length - i).padStart(3, "0")}</span>
                  </span>
                </Link>
                <div className="flex justify-end border-t border-line px-2">
                  <Button variant="ghost" onClick={() => setConfirmDelete(e.id)}>
                    <Trash2 size={18} aria-hidden /> Delete entry
                  </Button>
                </div>
              </li>
            );
          })}
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
  if (!url) return <span className="size-16 shrink-0 rounded-full bg-surface-3 ring-2 ring-line-strong" aria-hidden />;
  return (
    <img
      src={url}
      alt=""
      className="size-16 shrink-0 rounded-full bg-surface-3 object-cover ring-2 ring-line-strong"
      aria-label={`${label} thumbnail`}
    />
  );
}
