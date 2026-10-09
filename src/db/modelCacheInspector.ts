import { getStorageEstimate, isStoragePersisted } from "./persistence.ts";
import { putModelManifest } from "./modelManifest.ts";

/** Cache API name used by Transformers.js v4 (`env.cacheKey`). Verified in node_modules source. */
export const TRANSFORMERS_CACHE_KEY = "transformers-cache";

export interface PerModelUsage {
  modelId: string;
  bytes: number;
  fileCount: number;
}

export interface CacheReport {
  perModel: PerModelUsage[];
  totalBytes: number;
  quotaBytes: number | null;
  usageBytes: number | null;
  persisted: boolean;
}

function modelIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url, "https://huggingface.co");
    const parts = u.pathname.split("/").filter(Boolean);
    // Transformers.js caches https://huggingface.co/<org>/<repo>/resolve/<rev>/<file>
    if (parts.length >= 2 && u.hostname.includes("huggingface.co")) {
      return `${parts[0]}/${parts[1]}`;
    }
    const m = url.match(/huggingface\.co\/([^/]+\/[^/]+)/);
    if (m?.[1]) return m[1];
    return null;
  } catch {
    return null;
  }
}

export async function inspectModelCache(): Promise<CacheReport> {
  const perModel = new Map<string, { bytes: number; fileCount: number }>();
  let totalBytes = 0;
  try {
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      for (const name of names) {
        if (name !== TRANSFORMERS_CACHE_KEY) continue;
        const cache = await caches.open(name);
        const requests = await cache.keys();
        for (const req of requests) {
          const res = await cache.match(req);
          if (!res) continue;
          const lenHeader = res.headers.get("content-length");
          const buf = await res.clone().arrayBuffer().catch(() => null);
          const bytes =
            buf !== null
              ? buf.byteLength
              : lenHeader !== null && Number.isFinite(Number(lenHeader))
                ? Number(lenHeader)
                : 0;
          totalBytes += bytes;
          const id = modelIdFromUrl(req.url) ?? "unknown";
          const cur = perModel.get(id) ?? { bytes: 0, fileCount: 0 };
          cur.bytes += bytes;
          cur.fileCount += 1;
          perModel.set(id, cur);
        }
      }
    }
  } catch {
    // Cache API unavailable (e.g. jsdom tests); return empty report.
  }
  const est = await getStorageEstimate();
  const persisted = await isStoragePersisted();
  return {
    perModel: [...perModel.entries()].map(([modelId, v]) => ({
      modelId,
      bytes: v.bytes,
      fileCount: v.fileCount,
    })),
    totalBytes,
    quotaBytes: est.quotaBytes,
    usageBytes: est.usageBytes,
    persisted,
  };
}

export async function evictModel(modelId: string): Promise<number> {
  let removed = 0;
  try {
    if (typeof caches === "undefined") return 0;
    const cache = await caches.open(TRANSFORMERS_CACHE_KEY);
    const requests = await cache.keys();
    for (const req of requests) {
      if (modelIdFromUrl(req.url) === modelId) {
        const ok = await cache.delete(req);
        if (ok) removed += 1;
      }
    }
  } catch {
    return removed;
  }
  await putModelManifest({
    tier: modelId.includes("gemma-4") ? "deep-look" : "field-id",
    modelId,
    dtype: "unknown",
    device: "unknown",
    downloadedAt: 0,
    bytes: 0,
    status: "absent",
  });
  return removed;
}
