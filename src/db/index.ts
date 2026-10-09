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
    dbPromise = openDB<TrailSnackDB>("trailsnack", 1, {
      upgrade(db) {
        const log = db.createObjectStore("fieldLog", { keyPath: "id" });
        log.createIndex("createdAt", "createdAt");
        log.createIndex("verdict", "verdict");
        db.createObjectStore("speciesEmbeddings", { keyPath: "cacheKey" });
        db.createObjectStore("settings", { keyPath: "key" });
        db.createObjectStore("modelManifest", { keyPath: "tier" });
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
