import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  getAllSettings,
  setSetting,
  type AppSettings,
} from "../db/settings.ts";

interface SettingsStore extends AppSettings {
  loaded: boolean;
  load: () => Promise<void>;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const all = await getAllSettings();
    set({ ...all, loaded: true });
  },
  update: async (key, value) => {
    await setSetting(key, value);
    set({ [key]: value } as Partial<SettingsStore>);
  },
}));
