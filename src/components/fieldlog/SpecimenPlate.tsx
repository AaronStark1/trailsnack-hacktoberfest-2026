import type { ReactNode } from "react";
import { Clock, Database, MapPin } from "lucide-react";
import { formatDateTime } from "../../lib/format.ts";
import { gpsStamp, type GpsFix } from "./gps.ts";

interface Props {
  photoUrl: string | null;
  capturedAt: number;
  gps: GpsFix | undefined;
  dbVersion: string;
}

const tick = "pointer-events-none absolute size-4 border-hud/80 [filter:drop-shadow(0_0_2px_rgb(0_0_0/0.8))]";

function Datum({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="mono-label inline-flex shrink-0 items-center gap-2 text-ink-faint">
        <span aria-hidden className="translate-y-0.5 [&>svg]:size-3.5">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mono-value min-w-0 text-right text-sm break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * Saved specimen as a herbarium plate: the untouched square photo inside fine
 * viewfinder ticks, with its capture label underneath. The label only shows
 * what was stored with the entry — no fix reads "NO FIX".
 */
export default function SpecimenPlate({ photoUrl, capturedAt, gps, dbVersion }: Props) {
  return (
    <figure className="plate overflow-hidden">
      <div className="relative aspect-square w-full bg-surface-2">
        {photoUrl ? (
          <img src={photoUrl} alt="Saved specimen photo" className="size-full object-cover" />
        ) : (
          <div aria-hidden className="skeleton size-full rounded-none" />
        )}
        <span aria-hidden className={`${tick} top-3 left-3 border-t border-l`} />
        <span aria-hidden className={`${tick} top-3 right-3 border-t border-r`} />
        <span aria-hidden className={`${tick} bottom-3 left-3 border-b border-l`} />
        <span aria-hidden className={`${tick} right-3 bottom-3 border-r border-b`} />
      </div>
      <figcaption className="border-t border-line px-5 py-2">
        <dl className="divide-y divide-line">
          <Datum icon={<Clock />} label="Captured">
            {formatDateTime(capturedAt)}
          </Datum>
          <Datum icon={<MapPin />} label="Location">
            {gpsStamp(gps, { accuracy: true })}
          </Datum>
          <Datum icon={<Database />} label="Safety DB">
            {dbVersion}
          </Datum>
        </dl>
      </figcaption>
    </figure>
  );
}
