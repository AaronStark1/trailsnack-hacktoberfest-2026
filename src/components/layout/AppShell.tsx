import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import ForestBackdrop from "../atmosphere/ForestBackdrop.tsx";
import Emblem from "../ui/Emblem.tsx";
import TelemetryRack from "./TelemetryRack.tsx";
import UpdatePrompt from "./UpdatePrompt.tsx";
import InstallBanner from "./InstallBanner.tsx";
import TabBar from "./TabBar.tsx";
import { useModelStore } from "../../stores/modelStore.ts";
import { useSettingsStore } from "../../stores/settingsStore.ts";

/** Screens that get the wide, dual-column canvas on desktop. */
const WIDE_ROUTE = /^\/(assess|log)\/./;
/** Screens where the camera or on-device inference needs the device: the forest holds still. */
const INSTRUMENT_ROUTE = /^\/(scan|assess)(\/|$)/;

export default function AppShell() {
  const { pathname } = useLocation();
  const accepted = useSettingsStore((s) => s.disclaimerAcceptedAt !== null);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const modelBusy = useModelStore((s) => s.fieldId.status === "loading" || s.deepLook.status === "loading");

  // Every screen opens at its top: a new route never inherits the last one's scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const wide = WIDE_ROUTE.test(pathname);
  const calm = modelBusy || INSTRUMENT_ROUTE.test(pathname);

  return (
    <div className="relative isolate min-h-dvh text-ink">
      {!highContrast && <ForestBackdrop calm={calm} mode={darkMode ? "night-camp" : "forest"} />}

      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:flex focus-visible:items-center focus-visible:rounded-full focus-visible:bg-amber focus-visible:px-5 focus-visible:font-semibold focus-visible:text-on-amber"
      >
        Skip to content
      </a>

      <header className="glass sticky top-0 z-40 border-b border-line pt-safe">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link
            to="/scan"
            aria-label="TrailSnack — go to Scan"
            className="flex shrink-0 items-center gap-2.5 rounded-full pr-2 text-ink no-underline press"
          >
            <Emblem size={32} className="text-ink" />
            <span className="flex flex-col">
              <span className="display text-[1.625rem] leading-none tracking-[0.04em] uppercase">TrailSnack</span>
              <span className="mono-label mt-1 hidden text-ink-faint md:block">
                Offline Wild Foraging Companion
              </span>
            </span>
          </Link>
          <TelemetryRack />
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={`relative mx-auto w-full px-4 pt-6 pb-36 outline-none sm:px-6 sm:pt-8 ${wide ? "max-w-5xl" : "max-w-3xl"}`}
      >
        <div className="mb-6 grid gap-3 empty:hidden">
          <InstallBanner />
          <UpdatePrompt />
        </div>
        <Outlet />
      </main>

      {/* The dock appears once the Safety Covenant is accepted: before that every
          destination would only bounce back to the covenant. */}
      {accepted && <TabBar />}
    </div>
  );
}
