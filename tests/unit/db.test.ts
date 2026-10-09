import { beforeEach, afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { closeDB, getDB } from "../../src/db/index.ts";
import {
  addFieldLogEntry,
  deleteFieldLogEntry,
  getFieldLogEntry,
  listFieldLogEntries,
} from "../../src/db/fieldLog.ts";
import {
  getSpeciesEmbeddings,
  makeCacheKey,
  putSpeciesEmbeddings,
} from "../../src/db/embeddingsCache.ts";
import { DEFAULT_SETTINGS, getAllSettings, getSetting, setSetting } from "../../src/db/settings.ts";

beforeEach(async () => {
  await closeDB();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("trailsnack");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

afterEach(async () => {
  await closeDB();
});

describe("field log store", () => {
  it("creates, reads, lists newest-first, and deletes entries", async () => {
    const base = {
      imageBlob: new Blob(["img"], { type: "image/jpeg" }),
      thumbnailBlob: new Blob(["thumb"], { type: "image/jpeg" }),
      tier1: { scores: [] },
      verdict: { badge: "UNKNOWN" },
      dbVersion: "2026.10.1",
      appVersion: "0.1.0",
    };
    await addFieldLogEntry({ ...base, id: "a", createdAt: 100 });
    await addFieldLogEntry({ ...base, id: "b", createdAt: 300 });
    await addFieldLogEntry({ ...base, id: "c", createdAt: 200 });

    expect((await getFieldLogEntry("b"))?.createdAt).toBe(300);
    expect((await listFieldLogEntries()).map((e) => e.id)).toEqual(["b", "c", "a"]);

    await deleteFieldLogEntry("b");
    expect(await getFieldLogEntry("b")).toBeUndefined();
    expect((await listFieldLogEntries()).map((e) => e.id)).toEqual(["c", "a"]);
  });

  it("indexes field log entries by verdict badge", async () => {
    const base = {
      imageBlob: new Blob(["img"], { type: "image/jpeg" }),
      thumbnailBlob: new Blob(["thumb"], { type: "image/jpeg" }),
      tier1: { scores: [] },
      dbVersion: "2026.10.2",
      appVersion: "0.1.0",
    };
    await addFieldLogEntry({ ...base, id: "t1", createdAt: 100, verdict: { badge: "TOXIC" } });
    await addFieldLogEntry({ ...base, id: "u1", createdAt: 200, verdict: { badge: "UNKNOWN" } });
    const db = await getDB();
    const toxic = await db.getAllFromIndex("fieldLog", "verdict", "TOXIC");
    expect(toxic.map((e) => e.id)).toEqual(["t1"]);
  });
});

describe("species embeddings cache", () => {
  it("round-trips Float32 matrix values exactly", async () => {
    const key = makeCacheKey("onnx-community/embeddinggemma-2-ONNX", "q4", "abc123");
    const original = new Float32Array([0.1, -0.5, 0.999, 0, 1, -1]);
    // Store a copy of the buffer; structured clone preserves bytes.
    await putSpeciesEmbeddings({
      cacheKey: key,
      dims: 3,
      speciesIds: ["sp-a", "sp-b"],
      promptOffsets: [0, 1],
      matrix: original.buffer as ArrayBuffer,
      createdAt: Date.now(),
    });
    const back = await getSpeciesEmbeddings(key);
    expect(back?.dims).toBe(3);
    expect(back?.speciesIds).toEqual(["sp-a", "sp-b"]);
    const restored = new Float32Array(back?.matrix ?? new ArrayBuffer(0));
    expect([...restored]).toEqual([...original]);
  });
});

describe("settings store", () => {
  it("returns defaults before anything is written", async () => {
    expect(await getSetting("region")).toBe(DEFAULT_SETTINGS.region);
    expect(await getSetting("gpsEnabled")).toBe(false);
    const all = await getAllSettings();
    expect(all).toEqual(DEFAULT_SETTINGS);
  });

  it("persists and reads back values", async () => {
    await setSetting("region", "europe");
    await setSetting("highContrast", true);
    expect(await getSetting("region")).toBe("europe");
    expect((await getAllSettings()).highContrast).toBe(true);
  });
});
