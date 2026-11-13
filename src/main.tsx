import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import ErrorBoundary from "./components/layout/ErrorBoundary.tsx";
import Emblem from "./components/ui/Emblem.tsx";
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
    // Mode classes go on <html> too so the overscroll/background outside <body>
    // and the browser UI (theme-color) follow Night Camp / high-contrast mode.
    for (const el of [document.documentElement, document.body]) {
      el.classList.toggle("hc", highContrast);
      el.classList.toggle("dark", darkMode);
    }
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = highContrast ? "#000000" : darkMode ? "#0a0806" : "#070d09";
  }, [highContrast, darkMode]);

  if (!loaded)
    return (
      <div className="forest-floor flex min-h-dvh flex-col items-center justify-center gap-5 p-6">
        <Emblem size={56} className="text-ink animate-pulse-soft" />
        <p role="status" className="mono-label text-ink-muted">
          Booting TrailSnack…
        </p>
      </div>
    );
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
