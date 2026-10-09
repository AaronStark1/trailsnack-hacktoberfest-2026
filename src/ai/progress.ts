export interface FileProgress {
  file: string;
  loadedBytes: number;
  totalBytes: number;
}

export interface ProgressState {
  files: Map<string, FileProgress>;
  overallPct: number;
  currentFile: string;
  loadedBytes: number;
  totalBytes: number;
}

export function createProgressState(): ProgressState {
  return { files: new Map(), overallPct: 0, currentFile: "", loadedBytes: 0, totalBytes: 0 };
}

/**
 * Aggregate per-file progress_callback events from Transformers.js into a
 * single overall percentage. Events: { status: initiate|download|progress|done|ready, file, loaded, total, progress }.
 */
export function ingestProgressEvent(
  state: ProgressState,
  event: { status?: string; file?: string; loaded?: number; total?: number; progress?: number },
): ProgressState {
  const file = event.file ?? state.currentFile ?? "model";
  const total = typeof event.total === "number" ? event.total : (state.files.get(file)?.totalBytes ?? 0);
  let loaded = typeof event.loaded === "number" ? event.loaded : (state.files.get(file)?.loadedBytes ?? 0);
  if (event.status === "done" || event.status === "ready") {
    loaded = total > 0 ? total : loaded;
  } else if (typeof event.progress === "number" && total > 0) {
    loaded = Math.round((event.progress / 100) * total);
  }
  const files = new Map(state.files);
  files.set(file, { file, loadedBytes: loaded, totalBytes: total });

  let sumLoaded = 0;
  let sumTotal = 0;
  for (const f of files.values()) {
    sumLoaded += f.loadedBytes;
    sumTotal += f.totalBytes;
  }
  const overallPct = sumTotal > 0 ? Math.min(100, Math.round((sumLoaded / sumTotal) * 100)) : 0;
  return { files, overallPct, currentFile: file, loadedBytes: sumLoaded, totalBytes: sumTotal };
}
