import { Link } from "react-router-dom";
import { Info, Phone, Siren } from "lucide-react";
import SectionHeader from "../ui/SectionHeader.tsx";
import { callEntries } from "./hotline.ts";

const CALL =
  "flex min-h-14 w-full items-center gap-3 rounded-full px-5 py-2 leading-tight font-semibold no-underline select-none press";
const CALL_SOLID = `${CALL} border border-danger-ink/40 bg-danger text-on-danger hover:brightness-110`;
const CALL_OUTLINE = `${CALL} border border-danger/70 bg-bg/40 text-danger-ink hover:border-danger-ink`;

/**
 * One group of tap-to-call targets. A database string may hold several numbers
 * or none at all ("varies by country"): each real number gets its own dial
 * link, and text without a number stays text — never a link to nowhere.
 */
function CallGroup({ label, raw, solid, icon }: { label: string; raw: string; solid: boolean; icon: React.ReactNode }) {
  return (
    <>
      {callEntries(raw).map((entry) =>
        entry.href ? (
          <a key={entry.text} href={entry.href} className={solid ? CALL_SOLID : CALL_OUTLINE}>
            <span aria-hidden className="shrink-0">
              {icon}
            </span>
            <span className="min-w-0 break-words">
              {label}: {entry.text}
            </span>
          </a>
        ) : (
          <p
            key={entry.text}
            className="flex min-h-14 items-center gap-3 rounded-field border border-line-strong bg-bg/40 px-4 py-2 leading-snug text-ink"
          >
            <Info size={20} aria-hidden className="shrink-0 text-ink-muted" />
            <span className="min-w-0 break-words">
              {label}: {entry.text}
            </span>
          </p>
        ),
      )}
    </>
  );
}

/**
 * Offline emergency card. Numbers come only from the bundled safety database
 * for the user's selected region; when none is supplied the card says so
 * plainly and offers no dial action.
 */
export default function EmergencyCard({
  universal,
  regional,
}: {
  universal: string[];
  regional: { label: string; poison_control: string; emergency: string; note?: string } | null;
}) {
  return (
    <section
      aria-labelledby="emergency-h"
      className="overflow-hidden rounded-plate border border-danger/60 bg-danger-bg shadow-plate"
    >
      <div aria-hidden className="thorn-edge text-danger" />
      <div className="p-5 sm:p-6">
        <SectionHeader
          id="emergency-h"
          tone="danger"
          eyebrow={regional ? `Works offline · ${regional.label}` : "Works offline"}
          title="Emergency"
        />

        {regional ? (
          <div className="mt-5 grid gap-2.5">
            <CallGroup
              label="Poison control"
              raw={regional.poison_control}
              solid
              icon={<Phone size={20} strokeWidth={2.2} />}
            />
            <CallGroup label="Emergency" raw={regional.emergency} solid={false} icon={<Siren size={20} strokeWidth={2.2} />} />
            {regional.note && <p className="mt-1 text-[0.875rem] leading-snug text-ink-muted">{regional.note}</p>}
          </div>
        ) : (
          <p
            role="note"
            className="mt-5 flex items-start gap-3 rounded-field border border-line-strong bg-bg/40 p-4 leading-snug text-ink"
          >
            <Info size={20} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            <span>
              No regional hotline number is available here, so there is nothing to dial from this card. Call your
              local emergency number — regional numbers are listed in{" "}
              <Link to="/settings" className="font-semibold text-danger-ink underline underline-offset-4">
                Settings
              </Link>
              .
            </span>
          </p>
        )}

        <p className="mono-label mt-6 border-t border-danger/30 pt-4 text-danger-ink">If something was eaten</p>
        <ul className="mt-3 grid gap-2.5">
          {universal.map((u, i) => (
            <li key={i} className="flex gap-3 leading-snug text-ink">
              <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-danger" />
              <span>{u}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
