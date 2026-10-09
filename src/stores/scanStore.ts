import { create } from "zustand";

export interface DraftFrame {
  id: string;
  blob: Blob;
  thumbnailBlob: Blob;
  width: number;
  height: number;
  createdAt: number;
}

interface ScanStore {
  draft: DraftFrame | null;
  setDraft: (d: DraftFrame | null) => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}));
