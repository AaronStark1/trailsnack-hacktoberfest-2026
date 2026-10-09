import type { FloraDB } from "./types.ts";

let cached: FloraDB | null = null;

export async function loadDatabase(fetchImpl: typeof fetch = fetch): Promise<FloraDB> {
  if (cached) return cached;
  const res = await fetchImpl("/data/flora_safety_db.json");
  if (!res.ok) throw new Error(`Database fetch failed: ${res.status}`);
  cached = (await res.json()) as FloraDB;
  return cached;
}

export function getCachedDatabase(): FloraDB | null {
  return cached;
}

export function setCachedDatabase(db: FloraDB): void {
  cached = db;
}

export function speciesById(db: FloraDB, id: string): FloraDB["species"][number] | undefined {
  return db.species.find((s) => s.id === id);
}
