import { getDB, type FieldLogRecord } from "./index.ts";

export type { FieldLogRecord };

export async function addFieldLogEntry(
  entry: FieldLogRecord,
): Promise<string> {
  const db = await getDB();
  await db.put("fieldLog", entry);
  return entry.id;
}

export async function getFieldLogEntry(id: string): Promise<FieldLogRecord | undefined> {
  const db = await getDB();
  return db.get("fieldLog", id);
}

export async function listFieldLogEntries(): Promise<FieldLogRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("fieldLog", "createdAt");
  return all.reverse();
}

export async function deleteFieldLogEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("fieldLog", id);
}

export async function clearFieldLog(): Promise<void> {
  const db = await getDB();
  await db.clear("fieldLog");
}

export function makeFieldLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
