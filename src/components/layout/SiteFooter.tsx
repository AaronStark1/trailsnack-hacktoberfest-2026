import { Link } from "react-router-dom";
import Emblem from "../ui/Emblem.tsx";
import HomeLink from "./HomeLink.tsx";
import { NAV_LINK, SHELL } from "./shell.ts";

const DESTINATIONS = [
  { to: "/scan", label: "Scan" },
  { to: "/log", label: "Field Log" },
  { to: "/models", label: "Models" },
  { to: "/settings", label: "Settings" },
];

/**
 * App footer: the same layout, container and type as the home page footer
 * (index.html), so the two documents end the same way. App destinations appear
 * once the Safety Covenant is accepted — before that they would only bounce
 * back to it. The bottom padding clears the floating dock.
 */
export default function SiteFooter({ accepted }: { accepted: boolean }) {
  return (
    <footer
      className={`glass relative border-t border-line text-ink-muted ${
        accepted ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))]" : "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      }`}
    >
      <div className={`${SHELL} grid gap-6 pt-8 min-[821px]:grid-cols-[minmax(0,1fr)_auto] min-[821px]:items-start`}>
        <div>
          <HomeLink
            aria-label="TrailSnack home page"
            className="inline-flex min-h-12 items-center gap-2.5 text-ink no-underline press"
          >
            <Emblem size={32} className="text-ink" />
            <span className="display text-[1.625rem] leading-none tracking-[0.04em] uppercase">TrailSnack</span>
          </HomeLink>
          <p className="mt-3 max-w-[30em] text-[0.84375rem] leading-normal">
            TrailSnack is an educational reference. It never clears anything for eating.
          </p>
        </div>
        <nav aria-label="Footer" className="-mx-3.5 flex flex-wrap min-[821px]:mx-0 min-[821px]:justify-end">
          <HomeLink className={NAV_LINK}>Home</HomeLink>
          {accepted &&
            DESTINATIONS.map((d) => (
              <Link key={d.to} to={d.to} className={NAV_LINK}>
                {d.label}
              </Link>
            ))}
        </nav>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line pt-4 min-[821px]:col-span-2">
          <span className="mono-label">Wild, not reckless.</span>
          <span className="mono-label">Offline-first · On-device Gemma</span>
        </div>
      </div>
    </footer>
  );
}
