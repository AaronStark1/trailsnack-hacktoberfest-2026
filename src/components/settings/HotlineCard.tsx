import { Info, Phone, Siren } from "lucide-react";
import type { FloraDB } from "../../engine/types.ts";
import { callEntries } from "../assess/hotline.ts";
import Notice from "../ui/Notice.tsx";
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

const callBase =
  "flex min-h-14 w-full items-center gap-3 rounded-full px-5 py-2 leading-tight font-semibold no-underline select-none press";

// on-danger is the ink-on-crimson token, so the solid bar keeps ≥ 4.5:1 in every mode.
const callTones = {
  solid: "border border-danger-ink/40 bg-danger text-on-danger hover:brightness-110",
  outline: "border border-danger/60 bg-danger-bg text-danger-ink hover:border-danger-ink",
} as const;

function CallGroup({ label, raw, tone }: { label: string; raw: string; tone: keyof typeof callTones }) {
  return (
    <>
      {callEntries(raw).map((entry) =>
        entry.href ? (
          <a key={entry.text} href={entry.href} className={`${callBase} ${callTones[tone]}`}>
            <Phone size={20} aria-hidden className="shrink-0" />
            <span className="min-w-0 break-words">
              {label}: {entry.text}
            </span>
          </a>
        ) : (
          // No dialable number on file for this entry: plain text, never a link.
          <p key={entry.text} className="well flex min-h-14 items-center gap-3 rounded-field px-4 py-2 text-ink">
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
 * Offline emergency hotline: the region's poison-control and emergency
 * numbers as one-touch tap-to-call controls, drawn only from the bundled
 * safety database so they work with zero bars. Nothing is dialable unless the
 * database carries a real number for it.
 */
export default function HotlineCard({ db, failed, region }: Props) {
  const regional =
    db?.emergency.regions.find((r) => r.id === region) ??
    db?.emergency.regions.find((r) => r.id === "global") ??
    null;
  const universal = db?.emergency.universal.slice(0, 2) ?? [];

  return (
    <section aria-labelledby="hotline-h" className="plate overflow-hidden border-danger/50">
      <div aria-hidden className="thorn-edge text-danger" />
      <div className="p-5 sm:p-6">
        <SectionHeader
          id="hotline-h"
          tone="danger"
          eyebrow="Offline emergency hotline"
          title={regional?.label ?? "Emergency"}
          right={
            <Pill tone="danger" icon={<Siren />}>
              Stored offline
            </Pill>
          }
        />

        {regional ? (
          <div className="mt-5 grid gap-2.5">
            <CallGroup label="Poison control" raw={regional.poison_control} tone="solid" />
            <CallGroup label="Emergency" raw={regional.emergency} tone="outline" />
            {regional.note && <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-muted">{regional.note}</p>}
          </div>
        ) : failed ? (
          <Notice tone="warn" role="note" className="mt-5">
            Hotline numbers load with the safety database.
          </Notice>
        ) : db ? (
          <Notice tone="warn" role="note" className="mt-5">
            No regional hotline on file for this region — dial your local emergency number.
          </Notice>
        ) : (
          <p role="status" className="mono-label mt-5 flex min-h-12 items-center gap-2.5 text-ink-muted">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber animate-pulse-soft" />
            Loading safety database…
          </p>
        )}

        {universal.length > 0 && (
          <ul className="mt-5 grid gap-2.5 border-t border-line pt-4">
            {universal.map((u, i) => (
              <li key={i} className="flex items-start gap-3 text-[0.9375rem] leading-snug text-ink">
                <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-danger" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
