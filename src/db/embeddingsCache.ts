import { getDB, type SpeciesEmbeddingsRecord } from "./index.ts";

export type { SpeciesEmbeddingsRecord };

export function makeCacheKey(modelId: string, dtype: string, dbHash: string): string {
  return `${modelId}|${dtype}|${dbHash}`;
}

export async function putSpeciesEmbeddings(
  record: SpeciesEmbeddingsRecord,
): Promise<void> {
  const db = await getDB();
  await db.put("speciesEmbeddings", record);
}

export async function getSpeciesEmbeddings(
  cacheKey: string,
): Promise<SpeciesEmbeddingsRecord | undefined> {
  const db = await getDB();
  return db.get("speciesEmbeddings", cacheKey);
}

export async function deleteSpeciesEmbeddings(cacheKey: string): Promise<void> {
  const db = await getDB();
  await db.delete("speciesEmbeddings", cacheKey);
}
