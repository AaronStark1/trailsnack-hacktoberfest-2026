import { create } from "zustand";
import type { Device } from "../workers/protocol.ts";
import type { TierState } from "../ai/gemmaClient.ts";

interface ModelStore {
  fieldId: TierState;
  deepLook: TierState;
  setTier: (tier: "field-id" | "deep-look", patch: Partial<TierState>) => void;
  resetTier: (tier: "field-id" | "deep-look") => void;
}

const idle: TierState = { status: "idle", progressPct: 0, currentFile: "", device: null, error: null };

export const useModelStore = create<ModelStore>((set) => ({
  fieldId: { ...idle },
  deepLook: { ...idle },
  setTier: (tier, patch) =>
    set((s) => ({
      ...(tier === "field-id"
        ? { fieldId: { ...s.fieldId, ...patch } }
        : { deepLook: { ...s.deepLook, ...patch } }),
    })),
  resetTier: (tier) =>
    set(() => (tier === "field-id" ? { fieldId: { ...idle } } : { deepLook: { ...idle } })),
}));

export type { Device };
export type { TierState };
