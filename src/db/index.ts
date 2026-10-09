import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface FieldLogRecord {
  id: string;
  createdAt: number;
  imageBlob: Blob;
  thumbnailBlob: Blob;
  tier1: unknown;
  tier2?: unknown;
  verdict: unknown;
  gps?: {
    lat: number;
    lon: number;
    accuracyM: number;
    altitudeM?: number;
    capturedAt: number;
  };
  userNotes?: string;
  dbVersion: string;
  appVersion: string;
}

export interface SpeciesEmbeddingsRecord {
  cacheKey: string;
  dims: number;
  speciesIds: string[];
  promptOffsets: number[];
  matrix: ArrayBuffer;
  createdAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface ModelManifestRecord {
  tier: string;
  modelId: string;
  dtype: string;
  device: string;
  downloadedAt: number;
  bytes: number;
  status: "absent" | "downloading" | "ready" | "failed";
  lastError?: string;
}

interface TrailSnackDB extends DBSchema {
  fieldLog: {
    key: string;
    value: FieldLogRecord;
    indexes: { createdAt: number; verdict: string };
  };
  speciesEmbeddings: {
    key: string;
    value: SpeciesEmbeddingsRecord;
  };
  settings: {
    key: string;
    value: SettingRecord;
  };
  modelManifest: {
    key: string;
    value: ModelManifestRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<TrailSnackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TrailSnackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TrailSnackDB>("trailsnack", 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const log = db.createObjectStore("fieldLog", { keyPath: "id" });
          log.createIndex("createdAt", "createdAt");
          log.createIndex("verdict", "verdict.badge");
          db.createObjectStore("speciesEmbeddings", { keyPath: "cacheKey" });
          db.createObjectStore("settings", { keyPath: "key" });
          db.createObjectStore("modelManifest", { keyPath: "tier" });
        }
        if (oldVersion >= 1) {
          // v1 keyed the verdict index on the whole verdict object, so
          // IndexedDB silently omitted every record from it. Re-key on badge.
          const store = tx.objectStore("fieldLog");
          if (store.indexNames.contains("verdict")) store.deleteIndex("verdict");
          store.createIndex("verdict", "verdict.badge");
        }
      },
    });
  }
  return dbPromise;
}

export function resetDBForTests(): void {
  dbPromise = null;
}

export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    db?.close();
  }
  dbPromise = null;
}
