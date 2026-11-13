import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Braces,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  HelpCircle,
  Import,
  MapPin,
  NotebookPen,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { deleteFieldLogEntry, listFieldLogEntries, type FieldLogRecord } from "../db/fieldLog.ts";
import { addFieldLogEntry } from "../db/fieldLog.ts";
import { exportLogCSV, exportLogJSON, importLogJSON } from "../lib/export.ts";
import { formatDateTime } from "../lib/format.ts";
import type { Badge } from "../engine/types.ts";
import Button from "../components/ui/Button.tsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.tsx";
import Emblem from "../components/ui/Emblem.tsx";
import Notice, { type NoticeTone } from "../components/ui/Notice.tsx";
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
  tagClass,
  topNameOf,
} from "../components/fieldlog/verdict.ts";

function badgeOf(entry: FieldLogRecord): string {
  return badgeTextOf(entry.verdict);
}

function topOf(entry: FieldLogRecord): string {
  return topNameOf(entry.verdict);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Same glyph per verdict as the full verdict banner, so a tag never rests on colour. */
const tagIcon: Record<Badge, LucideIcon> = {
  EDIBLE: ShieldCheck,
  CAUTION: AlertTriangle,
  TOXIC: ShieldAlert,
  UNKNOWN: HelpCircle,
};

interface Feedback {
  tone: NoticeTone;
  label: string;
  text: string;
}

export default function FieldLog() {
  // null until the archive has been read once, so the empty state never flashes.
  const [entries, setEntries] = useState<FieldLogRecord[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const [lastImported, setLastImported] = useState<number | null>(null);
  const [exporting, setExporting] = useState<"JSON" | "CSV" | null>(null);
  const now = useNow();

  async function refresh() {
    try {
      setEntries(await listFieldLogEntries());
    } catch (err) {
      setEntries((prev) => prev ?? []);
      setNotice({ tone: "danger", label: "Archive unavailable", text: `Could not read the field log: ${messageOf(err)}` });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function runExport(kind: "JSON" | "CSV") {
    setExporting(kind);
    try {
      await (kind === "JSON" ? exportLogJSON() : exportLogCSV());
      const n = entries?.length ?? 0;
      setNotice({
        tone: "ok",
        label: "Export complete",
        text: `Exported ${n} ${n === 1 ? "entry" : "entries"} as ${kind}.`,
      });
    } catch (err) {
      setNotice({ tone: "danger", label: "Export failed", text: `The ${kind} export did not finish: ${messageOf(err)}` });
    } finally {
      setExporting(null);
    }
  }

  const total = entries?.length ?? 0;
  const count = entries === null ? "…" : String(total);

  return (
    <section aria-labelledby="log-h" className="grid gap-8">
      <SectionHeader
        as="h1"
        id="log-h"
        eyebrow="03 · Field Log"
        title="Specimen Archive"
        lede="Every saved assessment, kept on this device with its verdict, location and notes."
        right={
          <Pill tone="accent" icon={<NotebookPen />}>
            {count} {total === 1 ? "entry" : "entries"}
          </Pill>
        }
      />

      {notice && (
        <Notice tone={notice.tone} label={notice.label} role={notice.tone === "danger" ? "alert" : "status"}>
          {notice.text}
        </Notice>
      )}

      <div className="plate p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="mono-label text-ink-faint">Export &amp; import</p>
          <p className="mono-label text-ink-faint">Local files only</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <BayTile
            icon={<Braces />}
            label="Export JSON"
            counter={count}
            disabled={exporting !== null}
            onClick={() => void runExport("JSON")}
          />
          <BayTile
            icon={<FileSpreadsheet />}
            label="Export CSV"
            counter={count}
            disabled={exporting !== null}
            onClick={() => void runExport("CSV")}
          />
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
                void importLogJSON(f, (entry) => addFieldLogEntry(entry))
                  .then((r) => {
                    setNotice({
                      tone: "ok",
                      label: "Import complete",
                      text: `Imported ${r.imported} entries${r.skipped ? `, skipped ${r.skipped}` : ""}.`,
                    });
                    setLastImported(r.imported);
                  })
                  .catch((err: unknown) => {
                    setNotice({
                      tone: "danger",
                      label: "Import failed",
                      text: `That file could not be imported: ${messageOf(err)}`,
                    });
                  })
                  .finally(() => void refresh());
                e.target.value = "";
              }}
            />
          </BayTile>
        </div>
      </div>

      {entries === null ? (
        <div role="status" aria-label="Loading field log" className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="plate flex items-center gap-4 p-4">
              <span aria-hidden className="skeleton size-[5.5rem] shrink-0" />
              <span aria-hidden className="grid flex-1 gap-2.5">
                <span className="skeleton h-4 w-20" />
                <span className="skeleton h-5 w-2/3" />
                <span className="skeleton h-4 w-1/2" />
              </span>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="plate relative overflow-hidden px-6 py-12 text-center sm:py-16">
          <Emblem
            size={220}
            className="pointer-events-none absolute -right-12 -bottom-14 text-ink opacity-[0.06]"
          />
          <div className="relative">
            <Emblem size={52} className="mx-auto text-ink" />
            <p className="mono-label mt-5 text-amber">Archive empty</p>
            <h2 className="display mx-auto mt-3 max-w-md text-display-md">No entries yet — the trail is waiting.</h2>
            <p className="mx-auto mt-4 max-w-md text-ink-muted">
              Head outside, photograph one specimen at a time, and your assessments will
              collect here with verdicts, lookalikes, and checklists.
            </p>
            <Link to="/scan" className={`${primaryLinkClass} mt-7`}>
              Scan your first specimen
            </Link>
          </div>
        </div>
      ) : (
        <ol className="grid gap-4">
          {entries.map((e, i) => {
            const tone = badgeToneOf(e.verdict);
            const scientific = scientificNameOf(e.verdict);
            const TagIcon = tagIcon[tone];
            return (
              <li
                key={e.id}
                style={{ "--i": i } as CSSProperties}
                className={`plate overflow-hidden border-l-[3px] animate-rise-in ${rimClass[tone]}`}
              >
                <Link
                  to={`/log/${e.id}`}
                  className="group flex items-center gap-4 p-4 text-ink no-underline press hover:bg-surface-3/60"
                  aria-label={`Open log entry: ${topOf(e)}, ${badgeOf(e)}`}
                >
                  <Thumbnail blob={e.thumbnailBlob} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`mono-label inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 ${tagClass[tone]}`}
                    >
                      <TagIcon size={13} aria-hidden className="shrink-0" />
                      <span className="truncate">{badgeOf(e)}</span>
                    </span>
                    <span className="mt-2 block truncate text-lg leading-tight font-semibold text-ink">{topOf(e)}</span>
                    {scientific && <span className="sci mt-0.5 block truncate text-ink-muted">{scientific}</span>}
                    <span className="mono-label mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-faint">
                      <span className="inline-flex items-center gap-1.5" title={formatDateTime(e.createdAt)}>
                        <Clock size={12} aria-hidden />
                        {relativeTime(e.createdAt, now)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={12} aria-hidden />
                        {gpsStamp(e.gps)}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    size={20}
                    aria-hidden
                    className="hidden shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink sm:block"
                  />
                </Link>
                <div className="flex items-center justify-between gap-3 border-t border-line py-1 pr-2 pl-4">
                  <span className="mono-label text-ink-faint">№ {String(entries.length - i).padStart(3, "0")}</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(e.id)}>
                    <Trash2 size={16} aria-hidden /> Delete entry
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

/** Square specimen thumbnail from the stored blob; a skeleton holds its place until the URL resolves. */
function Thumbnail({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return <span aria-hidden className="skeleton size-[5.5rem] shrink-0" />;
  return (
    <img
      src={url}
      alt=""
      className="size-[5.5rem] shrink-0 rounded-field border border-line-strong bg-surface-2 object-cover"
    />
  );
}
