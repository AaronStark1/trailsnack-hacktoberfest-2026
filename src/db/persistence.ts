import { getSetting, setSetting } from "./settings.ts";

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) {
      return false;
    }
    const already = await navigator.storage.persisted?.();
    if (already) {
      await setSetting("storagePersisted", true);
      return true;
    }
    const granted = await navigator.storage.persist();
    await setSetting("storagePersisted", granted);
    return granted;
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persisted) {
      const p = await navigator.storage.persisted();
      if (p) return true;
    }
  } catch {
    // fall through to settings lookup
  }
  return getSetting("storagePersisted");
}

export interface StorageEstimate {
  usageBytes: number | null;
  quotaBytes: number | null;
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return { usageBytes: null, quotaBytes: null };
    }
    const est = await navigator.storage.estimate();
    return {
      usageBytes: typeof est.usage === "number" ? est.usage : null,
      quotaBytes: typeof est.quota === "number" ? est.quota : null,
    };
  } catch {
    return { usageBytes: null, quotaBytes: null };
  }
}
