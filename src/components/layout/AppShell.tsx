import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Camera, HardDrive, Settings } from "lucide-react";
import OnlineBadge from "./OnlineBadge.tsx";
import CacheStatusPill from "./CacheStatusPill.tsx";
import UpdatePrompt from "./UpdatePrompt.tsx";
import InstallBanner from "./InstallBanner.tsx";

const tabs = [
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/log", label: "Log", icon: BookOpen },
  { to: "/models", label: "Models", icon: HardDrive },
  { to: "/settings", label: "Settings", icon: Settings },
];

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
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-(--color-bg)" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              aria-label={t.label}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-base font-semibold ${
                  isActive ? "text-(--color-trail)" : "text-(--color-ink)/70"
                }`
              }
            >
              <t.icon size={26} aria-hidden />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
