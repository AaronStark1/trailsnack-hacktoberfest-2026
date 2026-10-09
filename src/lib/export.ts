import { listFieldLogEntries } from "../db/fieldLog.ts";

export interface ExportableEntry {
  id: string;
  createdAt: string;
  verdict: string;
  confidence: string;
  topCandidate: string;
  topScientific: string;
  similarity: string;
  lat: string;
  lon: string;
  notes: string;
}

function verdictOf(v: unknown): { badge: string; confidence: string; top: string; sci: string; sim: string } {
  const vv = v as {
    badge?: string;
    confidence?: string;
    topCandidate?: { common_names?: string[]; scientific_name?: string };
    plausibleCandidates?: unknown[];
  };
  return {
    badge: typeof vv?.badge === "string" ? vv.badge : "UNKNOWN",
    confidence: typeof vv?.confidence === "string" ? vv.confidence : "low",
    top: vv?.topCandidate?.common_names?.[0] ?? "",
    sci: vv?.topCandidate?.scientific_name ?? "",
    sim: "",
  };
}

export async function buildExportRows(): Promise<ExportableEntry[]> {
  const entries = await listFieldLogEntries();
  return entries.map((e) => {
    const t1 = e.tier1 as { scores?: { similarity?: number }[] };
    const vd = verdictOf(e.verdict);
    return {
      id: e.id,
      createdAt: new Date(e.createdAt).toISOString(),
      verdict: vd.badge,
      confidence: vd.confidence,
      topCandidate: vd.top,
      topScientific: vd.sci,
      similarity: t1?.scores?.[0]?.similarity?.toFixed(3) ?? "",
      lat: e.gps ? String(e.gps.lat) : "",
      lon: e.gps ? String(e.gps.lon) : "",
      notes: e.userNotes ?? "",
    };
  });
}

export async function exportLogJSON(): Promise<void> {
  const rows = await buildExportRows();
  downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), "trailsnack-log.json");
}

export async function exportLogCSV(): Promise<void> {
  const rows = await buildExportRows();
  const header = "id,createdAt,verdict,confidence,topCandidate,topScientific,similarity,lat,lon,notes";
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.id, r.createdAt, r.verdict, r.confidence, r.topCandidate, r.topScientific, r.similarity, r.lat, r.lon, r.notes].map(q).join(","),
  );
  downloadBlob(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }), "trailsnack-log.csv");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export async function importLogJSON(
  file: File,
  put: (entry: {
    id: string;
    createdAt: number;
    imageBlob: Blob;
    thumbnailBlob: Blob;
    tier1: unknown;
    verdict: unknown;
    userNotes?: string;
    dbVersion: string;
    appVersion: string;
  }) => Promise<unknown>,
): Promise<ImportResult> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Import file must be a JSON array.");
  let imported = 0;
  let skipped = 0;
  const emptyPng =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const emptyBytes = Uint8Array.from(atob(emptyPng), (c) => c.charCodeAt(0));
  for (const row of parsed) {
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.createdAt !== "string") {
      skipped++;
      continue;
    }
    const createdAt = Date.parse(r.createdAt);
    if (!Number.isFinite(createdAt)) {
      skipped++;
      continue;
    }
    await put({
      id: r.id,
      createdAt,
      imageBlob: new Blob([emptyBytes.buffer as ArrayBuffer], { type: "image/png" }),
      thumbnailBlob: new Blob([emptyBytes.buffer as ArrayBuffer], { type: "image/png" }),
      tier1: { scores: [] },
      verdict: { badge: r.verdict ?? "UNKNOWN" },
      ...(typeof r.notes === "string" && r.notes ? { userNotes: r.notes } : {}),
      dbVersion: "imported",
      appVersion: "imported",
    });
    imported++;
  }
  return { imported, skipped };
}
