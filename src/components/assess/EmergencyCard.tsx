import { Phone, Siren } from "lucide-react";
import SectionHeader from "../ui/SectionHeader.tsx";

const TEL_BUTTON =
  "flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-tac border-2 border-danger bg-surface px-4 py-2 text-center font-bold text-danger tac-press bevel-light";

function telHref(number: string): string {
  return `tel:${number.replace(/[^+\d]/g, "")}`;
}

export default function EmergencyCard({
  universal,
  regional,
}: {
  universal: string[];
  regional: { label: string; poison_control: string; emergency: string; note?: string } | null;
}) {
  return (
    <section aria-labelledby="emergency-h" className="grid gap-3">
      <SectionHeader id="emergency-h" tone="danger" eyebrow="OFFLINE HOTLINE" title="Emergency" />
      <div className="tac-card overflow-hidden p-0">
        <div aria-hidden className="hazard-stripes-red h-2" />
        <div className="p-4">
          {regional && (
            <div className="grid gap-2 sm:grid-cols-2">
              <a className={TEL_BUTTON} href={telHref(regional.poison_control)}>
                <Phone size={20} strokeWidth={2.5} aria-hidden className="shrink-0" />
                <span>Poison control: {regional.poison_control}</span>
              </a>
              <a className={TEL_BUTTON} href={telHref(regional.emergency)}>
                <Siren size={20} strokeWidth={2.5} aria-hidden className="shrink-0" />
                <span>Emergency: {regional.emergency}</span>
              </a>
              <p className="text-base leading-relaxed text-ink-muted sm:col-span-2">
                <span className="mono-label text-ink">{regional.label}</span>
                {regional.note ? ` — ${regional.note}` : ""}
              </p>
            </div>
          )}
          <p className={`mono-label text-ink-muted ${regional ? "mt-4 border-t border-line pt-3" : ""}`}>
            Universal rules
          </p>
          <ul className="mt-2 grid gap-2">
            {universal.map((u, i) => (
              <li key={i} className="flex gap-3 text-base leading-snug text-ink">
                <Siren size={20} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0 text-danger" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
