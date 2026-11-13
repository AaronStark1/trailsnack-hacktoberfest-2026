import { Outlet } from "react-router-dom";
import Emblem from "../ui/Emblem.tsx";
import TelemetryRack from "./TelemetryRack.tsx";
import UpdatePrompt from "./UpdatePrompt.tsx";
import InstallBanner from "./InstallBanner.tsx";
import TabBar from "./TabBar.tsx";

export default function AppShell() {
  return (
    <div className="topo min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-40 frosted border-b border-line">
        <div className="mx-auto flex min-h-[60px] w-full max-w-3xl items-center gap-3 px-4 py-2">
          <div className="flex shrink-0 items-center gap-2.5">
            <Emblem size={30} className="text-trail" />
            <div className="flex flex-col gap-1">
              <span className="display-caps text-xl tracking-wide text-ink" aria-label="TrailSnack home">
                TrailSnack
              </span>
              <span className="mono-label hidden text-ink-faint sm:block">Field unit · Offline-first</span>
            </div>
          </div>
          <TelemetryRack />
        </div>
        <div aria-hidden className="h-0.5 w-full bg-linear-to-r from-trail via-trail-glow/70 to-transparent" />
      </header>
      <main className="relative mx-auto w-full max-w-3xl px-4 pt-4 pb-36">
        <div className="grid gap-3 empty:hidden">
          <InstallBanner />
          <UpdatePrompt />
        </div>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
