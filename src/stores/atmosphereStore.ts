import { useEffect } from "react";
import { create } from "zustand";

/**
 * Presentation-only signals for the living backdrop. Nothing here is
 * application data: it only tells the decorative thicket when to step back.
 */
interface AtmosphereStore {
  /** True while the camera viewfinder is really showing live frames. */
  cameraLive: boolean;
  /** Number of screens currently asking the thicket to freeze (on-device inference). */
  holds: number;
  setCameraLive: (live: boolean) => void;
  hold: () => void;
  release: () => void;
}

export const useAtmosphereStore = create<AtmosphereStore>((set) => ({
  cameraLive: false,
  holds: 0,
  setCameraLive: (cameraLive) => set({ cameraLive }),
  hold: () => set((s) => ({ holds: s.holds + 1 })),
  release: () => set((s) => ({ holds: Math.max(0, s.holds - 1) })),
}));

/** Freezes the thicket for as long as `active` is true, so the GPU belongs to inference. */
export function useThicketHold(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const { hold, release } = useAtmosphereStore.getState();
    hold();
    return release;
  }, [active]);
}
