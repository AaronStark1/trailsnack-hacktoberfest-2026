import { NavLink } from "react-router-dom";
import { MemoryStick, NotebookPen, ScanLine, SlidersHorizontal } from "lucide-react";

const tabs = [
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/log", label: "Field Log", icon: NotebookPen },
  { to: "/models", label: "Models", icon: MemoryStick },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
];

const CELL =
  "relative flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-tac select-none tac-press";
const ACTIVE = `${CELL} well text-trail`;
const INACTIVE = `${CELL} border border-transparent text-ink-muted hover:bg-surface/70 hover:text-ink`;

/** Floating tactile dock: frosted, etched, with an embossed well + haptic glow on the active tab. */
export default function TabBar() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe">
      <div className="mx-auto mb-3 max-w-3xl rounded-tac-lg frosted etched shadow-dock">
        <div className="grid grid-cols-4 gap-1 p-1.5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              aria-label={t.label}
              className={({ isActive }) => (isActive ? ACTIVE : INACTIVE)}
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={
                      isActive
                        ? "absolute top-1.5 size-1.5 rounded-full bg-trail-glow shadow-glow"
                        : "absolute top-1.5 size-1.5 rounded-full bg-transparent"
                    }
                  />
                  <t.icon size={26} strokeWidth={isActive ? 2.25 : 1.9} aria-hidden />
                  <span className="mono-label whitespace-nowrap tracking-[0.08em]">{t.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
