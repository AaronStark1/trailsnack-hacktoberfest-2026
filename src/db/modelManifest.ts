import { getDB, type ModelManifestRecord } from "./index.ts";

export type { ModelManifestRecord };

export async function getModelManifest(
  tier: string,
): Promise<ModelManifestRecord | undefined> {
  const db = await getDB();
  return db.get("modelManifest", tier);
}

export async function putModelManifest(record: ModelManifestRecord): Promise<void> {
  const db = await getDB();
  await db.put("modelManifest", record);
}

export async function listModelManifests(): Promise<ModelManifestRecord[]> {
  const db = await getDB();
  return db.getAll("modelManifest");
}
