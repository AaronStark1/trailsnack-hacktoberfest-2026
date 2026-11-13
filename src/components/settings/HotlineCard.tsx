import { Info, Phone, Siren } from "lucide-react";
import type { FloraDB } from "../../engine/types.ts";
import Pill from "../ui/Pill.tsx";
import SectionHeader from "../ui/SectionHeader.tsx";

interface Props {
  /** Loaded safety database, or null while loading / after failure. */
  db: FloraDB | null;
  /** True once loadDatabase() rejected. */
  failed: boolean;
  /** Settings region id, e.g. "north-america". */
  region: string;
}

interface CallEntry {
  text: string;
  /** tel: href, or null when the entry carries no dialable digits ("varies by country"). */
  href: string | null;
}

/**
 * Regional strings bundle several numbers ("999 / 112", "NHS 111 (UK) / 01 809
 * 2166 (IE)"). Each slash-separated entry becomes its own tap-to-call control
 * so a tap never dials the concatenation; digits are sanitised exactly like
 * EmergencyCard. Entries without a real number render as plain text.
 */
function callEntries(raw: string): CallEntry[] {
  return raw
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const digits = part.replace(/[^+\d]/g, "");
      return { text: part, href: digits.length >= 3 ? `tel:${digits}` : null };
    });
}

const callBase =
  "flex min-h-14 w-full items-center gap-3 rounded-tac px-4 text-lg font-bold tracking-tight no-underline select-none tac-press";

// on-trail is the ink-on-saturated-fill token: near-white in daylight, near-black
// in Night Camp Mode, so the solid crimson bar keeps ≥ 4.5:1 in every mode.
const callTones = {
  solid: "bevel border border-hazard-black/20 bg-danger text-on-trail",
  outline: "bevel-light border-2 border-danger bg-surface text-danger hover:bg-danger-bg",
} as const;

function CallGroup({ label, raw, tone }: { label: string; raw: string; tone: keyof typeof callTones }) {
  return (
    <>
      {callEntries(raw).map((entry) =>
        entry.href ? (
          <a key={entry.text} href={entry.href} className={`${callBase} ${callTones[tone]}`}>
            <Phone size={22} aria-hidden className="shrink-0" />
            <span className="min-w-0 break-words">
              {label}: {entry.text}
            </span>
          </a>
        ) : (
          <p key={entry.text} className="well flex min-h-14 items-center gap-3 rounded-tac px-4 text-base font-semibold text-ink">
            <Info size={22} aria-hidden className="shrink-0 text-ink-muted" />
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
 * Offline emergency hotline: the region's poison-control and emergency
 * numbers as 56px tap-to-call controls, drawn from the bundled database so
 * they work with zero bars.
 */
export default function HotlineCard({ db, failed, region }: Props) {
  const regional =
    db?.emergency.regions.find((r) => r.id === region) ??
    db?.emergency.regions.find((r) => r.id === "global") ??
    null;
  const universal = db?.emergency.universal.slice(0, 2) ?? [];

  return (
    <section aria-labelledby="hotline-h" className="tac-card overflow-hidden p-0">
      <div aria-hidden className="hazard-stripes-red h-2" />
      <div className="p-4">
        <SectionHeader
          id="hotline-h"
          tone="danger"
          eyebrow="OFFLINE EMERGENCY HOTLINE"
          title={regional?.label ?? "Emergency"}
          right={
            <Pill tone="danger" icon={<Siren />}>
              0 BARS OK
            </Pill>
          }
        />

        {regional ? (
          <div className="mt-4 grid gap-2">
            <CallGroup label="Poison control" raw={regional.poison_control} tone="solid" />
            <CallGroup label="Emergency" raw={regional.emergency} tone="outline" />
            {regional.note && <p className="mono-label mt-1 leading-relaxed text-ink-muted">{regional.note}</p>}
          </div>
        ) : failed ? (
          <p role="note" className="mt-4 rounded-tac border border-caution/50 bg-caution-bg p-3 text-base font-semibold text-caution">
            Hotline numbers load with the safety database.
          </p>
        ) : db ? (
          <p role="note" className="mt-4 rounded-tac border border-caution/50 bg-caution-bg p-3 text-base font-semibold text-caution">
            No regional hotline on file for this region — dial your local emergency number.
          </p>
        ) : (
          <p className="mono-label mt-4 flex min-h-12 items-center gap-2 text-ink-muted">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-trail-glow shadow-glow animate-breathe" />
            Loading safety database…
          </p>
        )}

        {universal.length > 0 && (
          <ul className="mt-4 grid gap-2 border-t border-line pt-3">
            {universal.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-base leading-snug">
                <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-danger" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
