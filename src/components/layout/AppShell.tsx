import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ThicketBackground from "../atmosphere/ThicketBackground.tsx";
import Emblem from "../ui/Emblem.tsx";
import TelemetryRack from "./TelemetryRack.tsx";
import UpdatePrompt from "./UpdatePrompt.tsx";
import InstallBanner from "./InstallBanner.tsx";
import TabBar from "./TabBar.tsx";
import HomeLink from "./HomeLink.tsx";
import SiteFooter from "./SiteFooter.tsx";
import { NAV_LINK, SHELL } from "./shell.ts";
import { useSettingsStore } from "../../stores/settingsStore.ts";

/** Screens that get the wide, dual-column canvas on desktop. */
const WIDE_ROUTE = /^\/(assess|log)\/./;

export default function AppShell() {
  const { pathname } = useLocation();
  const accepted = useSettingsStore((s) => s.disclaimerAcceptedAt !== null);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const highContrast = useSettingsStore((s) => s.highContrast);

  // Every screen opens at its top: a new route never inherits the last one's scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const wide = WIDE_ROUTE.test(pathname);

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-ink">
      {/* The living thicket shared with the home page. High contrast removes it. */}
      {!highContrast && <ThicketBackground mode={darkMode ? "night-camp" : "forest"} />}
      {/* Reading veil: a light one. The thicket stays clearly present behind the
          frosted cards; text that sits directly on it carries its own soft shadow
          (see .on-thicket). */}
      {!highContrast && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-bg/20 md:bg-transparent md:bg-[linear-gradient(90deg,transparent,rgb(6_11_8/0.22)_24%,rgb(6_11_8/0.22)_76%,transparent)]"
        />
      )}

      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:flex focus-visible:items-center focus-visible:rounded-full focus-visible:bg-amber focus-visible:px-5 focus-visible:font-semibold focus-visible:text-on-amber"
      >
        Skip to content
      </a>

      {/* Header: the same metrics as the home page header (index.html) — 64px
          tall, 72px from 821px up; shell container; 32px emblem; 26px wordmark;
          one frosted-moss recipe. */}
      <header className="glass sticky top-0 z-40 border-b border-line pt-safe">
        <div className={`${SHELL} flex min-h-16 items-center gap-4 min-[821px]:min-h-[72px]`}>
          <HomeLink
            aria-label="TrailSnack home page"
            className="flex min-h-12 shrink-0 items-center gap-2.5 text-ink no-underline press"
          >
            <Emblem size={32} className="text-ink" />
            <span className="display text-[1.625rem] leading-none tracking-[0.04em] uppercase">TrailSnack</span>
          </HomeLink>
          <span className="mono-label hidden h-[26px] items-center gap-2 rounded-full border border-line-strong px-2.5 text-[0.625rem] tracking-[0.14em] whitespace-nowrap text-ink-muted xl:inline-flex">
            <span aria-hidden className="size-1.5 rounded-full bg-glow shadow-glow-ok" />
            Offline Wild Foraging Companion
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <nav aria-label="Site" className="hidden min-[821px]:block">
              <HomeLink className={NAV_LINK}>Home</HomeLink>
            </nav>
            <TelemetryRack />
          </div>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={`on-thicket relative mx-auto w-full flex-1 px-4 pt-6 pb-14 outline-none sm:px-6 sm:pt-8 ${wide ? "max-w-5xl" : "max-w-3xl"}`}
      >
        <div className="mb-6 grid gap-3 empty:hidden">
          <InstallBanner />
          <UpdatePrompt />
        </div>
        <Outlet />
      </main>

      <SiteFooter accepted={accepted} />

      {/* The dock appears once the Safety Covenant is accepted: before that every
          destination would only bounce back to the covenant. */}
      {accepted && <TabBar />}
    </div>
  );
}
