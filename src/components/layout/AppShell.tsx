import { Outlet } from "react-router-dom";
import OnlineBadge from "./OnlineBadge.tsx";
import CacheStatusPill from "./CacheStatusPill.tsx";
import UpdatePrompt from "./UpdatePrompt.tsx";
import InstallBanner from "./InstallBanner.tsx";
import TabBar from "./TabBar.tsx";

export default function AppShell() {
  return (
    <div className="min-h-dvh bg-(--color-bg) text-(--color-ink)" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-(--color-bg)/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-4 py-2">
          <span className="text-xl font-extrabold tracking-tight" aria-label="TrailSnack home">
            TrailSnack
          </span>
          <span className="flex-1" />
          <CacheStatusPill />
          <OnlineBadge />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32">
        <div className="grid gap-3">
          <InstallBanner />
          <UpdatePrompt />
        </div>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
