import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
import Emblem from "../components/ui/Emblem.tsx";

export default function NotFound() {
  return (
    <section aria-labelledby="nf-h" className="pt-4 animate-rise-in">
      <div className="tac-card relative overflow-hidden p-5 sm:p-6">
        <Emblem
          size={180}
          className="pointer-events-none absolute -top-8 -right-10 text-trail opacity-[0.08]"
        />
        <div className="relative">
          <p className="mono-label text-ink-faint">Err 404 · No trail here</p>
          <h1 id="nf-h" className="display-caps mt-2 text-4xl text-ink">
            Not found
          </h1>
          <p className="mt-3 text-ink-muted">That trail does not exist.</p>
          <Link
            to="/scan"
            className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-tac border border-trail-dark/60 bg-trail px-5 text-lg font-bold tracking-tight text-on-trail select-none bevel tac-press hover:bg-trail-dark sm:w-auto"
          >
            <ScanLine size={22} aria-hidden />
            Back to Scan
          </Link>
        </div>
      </div>
    </section>
  );
}
