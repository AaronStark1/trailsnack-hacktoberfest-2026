import { NavLink } from "react-router-dom";
import { BookOpen, Camera, HardDrive, Settings } from "lucide-react";

const tabs = [
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/log", label: "Log", icon: BookOpen },
  { to: "/models", label: "Models", icon: HardDrive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function TabBar() {
  return (
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
  );
}
