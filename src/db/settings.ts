import { getDB } from "./index.ts";

export interface AppSettings {
  region: string;
  units: "metric" | "imperial";
  gpsEnabled: boolean;
  highContrast: boolean;
  darkMode: boolean;
  tier2Enabled: boolean;
  disclaimerAcceptedAt: number | null;
  preferredDevice: "auto" | "webgpu" | "wasm";
  storagePersisted: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  region: "north-america",
  units: "metric",
  gpsEnabled: false,
  highContrast: false,
  darkMode: false,
  tier2Enabled: false,
  disclaimerAcceptedAt: null,
  preferredDevice: "auto",
  storagePersisted: false,
};

export async function getSetting<K extends keyof AppSettings>(
  key: K,
): Promise<AppSettings[K]> {
  const db = await getDB();
  const rec = await db.get("settings", key);
  if (!rec) return DEFAULT_SETTINGS[key];
  return rec.value as AppSettings[K];
}

export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key, value });
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDB();
  const all = await db.getAll("settings");
  const out: AppSettings = { ...DEFAULT_SETTINGS };
  for (const rec of all) {
    (out as unknown as Record<string, unknown>)[rec.key] = rec.value;
  }
  return out;
}
