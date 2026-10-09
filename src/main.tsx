import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import ErrorBoundary from "./components/layout/ErrorBoundary.tsx";
import { SW_UPDATE_EVENT } from "./components/layout/UpdatePrompt.tsx";
import { useSettingsStore } from "./stores/settingsStore.ts";
import { __setTestHook } from "./ai/gemmaClient.ts";
import "./index.css";

type UpdateFn = (reloadPage?: boolean) => Promise<void>;

declare global {
  interface Window {
    __trailsnackUpdateSW?: UpdateFn;
  }
}

// Keep the updater: with skipWaiting false the waiting service worker only
// activates through updateSW(true); a bare reload would keep serving the old
// bundle. UpdatePrompt calls this; tests may stub window.__trailsnackUpdateSW.
window.__trailsnackUpdateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
  },
});

// Deterministic E2E hook: lets Playwright script Tier 1 scores without weights.
// Harmless in production; only activates when explicitly enabled by the caller.
(window as unknown as { __trailsnack?: unknown }).__trailsnack = {
  setMockScores(scores: { speciesId: string; similarity: number }[]) {
    __setTestHook({ enabled: true, identifyScores: scores });
  },
  clearMock() {
    __setTestHook({ enabled: false, identifyScores: undefined });
  },
};

function Boot() {
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const darkMode = useSettingsStore((s) => s.darkMode);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.body.classList.toggle("hc", highContrast);
    document.body.classList.toggle("dark", darkMode);
  }, [highContrast, darkMode]);

  if (!loaded) return <p role="status" className="p-6 text-lg">Loading TrailSnack…</p>;
  return <App />;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Boot />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
