import { NavLink } from "react-router-dom";
import { Cpu, Microscope, NotebookPen, ScanLine, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useScanStore } from "../../stores/scanStore.ts";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const CELL =
  "relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full select-none press";
const ACTIVE = `${CELL} bg-amber/12 text-amber shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-amber)_45%,transparent),0_0_18px_-6px_var(--color-amber)] hc:bg-transparent`;
const INACTIVE = `${CELL} text-ink-muted hover:bg-surface-3/70 hover:text-ink`;
const LABEL = "max-w-full truncate px-1 text-[0.6875rem] leading-[1.3] font-semibold tracking-wide";

/**
 * Floating pill dock. Assess joins the four fixed destinations and points at
 * the specimen currently in memory; until one has been captured it is shown
 * disabled rather than leading to a dead end.
 */
export default function TabBar() {
  const draftId = useScanStore((s) => s.draft?.id ?? null);

  const tabs: (Tab & { disabled?: boolean })[] = [
    { to: "/scan", label: "Scan", icon: ScanLine },
    draftId
      ? { to: `/assess/${draftId}`, label: "Assess", icon: Microscope }
      : { to: "/assess", label: "Assess", icon: Microscope, disabled: true },
    { to: "/log", label: "Field Log", icon: NotebookPen },
    { to: "/models", label: "Models", icon: Cpu },
    { to: "/settings", label: "Settings", icon: SlidersHorizontal },
  ];

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass pointer-events-auto mx-auto flex max-w-md items-center gap-0.5 rounded-full border border-line-strong p-1.5 shadow-float">
        {tabs.map((t) =>
          t.disabled ? (
            <span
              key={t.label}
              role="link"
              aria-disabled="true"
              aria-label={`${t.label} (capture a specimen first)`}
              title="Capture a specimen first"
              className={`${CELL} cursor-not-allowed text-ink-faint opacity-45`}
            >
              <t.icon size={22} strokeWidth={1.8} aria-hidden />
              <span className={LABEL}>{t.label}</span>
            </span>
          ) : (
            <NavLink
              key={t.label}
              to={t.to}
              aria-label={t.label}
              className={({ isActive }) => (isActive ? ACTIVE : INACTIVE)}
            >
              {({ isActive }) => (
                <>
                  <t.icon size={22} strokeWidth={isActive ? 2.1 : 1.8} aria-hidden />
                  <span className={LABEL}>{t.label}</span>
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
}
