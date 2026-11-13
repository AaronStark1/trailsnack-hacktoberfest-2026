import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { buttonClass } from "../components/ui/Button.tsx";
import Emblem from "../components/ui/Emblem.tsx";

export default function NotFound() {
  return (
    <section aria-labelledby="nf-h" className="grid gap-8 animate-rise-in">
      <div className="plate relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
        <Emblem
          size={280}
          className="pointer-events-none absolute -right-16 -bottom-20 text-ink opacity-[0.06]"
        />
        <p
          aria-hidden
          className="display pointer-events-none absolute -top-2 right-4 text-display-xl text-line-strong select-none sm:right-8"
        >
          404
        </p>
        <div className="relative max-w-md">
          <p className="mono-label flex items-center gap-2 text-amber">
            <span aria-hidden className="h-px w-5 shrink-0 bg-current opacity-70" />
            Error 404 · No trail here
          </p>
          <h1 id="nf-h" className="display mt-3 text-display-lg text-ink">
            Not found
          </h1>
          <p className="mt-4 text-ink-muted">
            That trail does not exist. The path may have been mistyped, or it led to something that
            was never saved on this device.
          </p>
          <Link to="/scan" className={`${buttonClass("primary")} mt-8 w-full sm:w-auto`}>
            <ScanLine size={20} aria-hidden />
            Back to Scan
          </Link>
        </div>
      </div>
    </section>
  );
}
