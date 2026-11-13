import { Clock, Database, MapPin } from "lucide-react";
import { formatDateTime } from "../../lib/format.ts";
import { gpsStamp, type GpsFix } from "./gps.ts";

interface Props {
  photoUrl: string | null;
  capturedAt: number;
  gps: GpsFix | undefined;
  dbVersion: string;
}

const tick =
  "pointer-events-none absolute size-5 border-hud [filter:drop-shadow(0_0_1.5px_rgba(0,0,0,0.7))]";

/** Saved specimen photo on an etched plate with viewfinder corner ticks and a mono caption strip. */
export default function SpecimenPlate({ photoUrl, capturedAt, gps, dbVersion }: Props) {
  return (
    <figure className="tac-card overflow-hidden p-0">
      <div className="relative aspect-square w-full bg-surface-3">
        {photoUrl ? (
          <img src={photoUrl} alt="Saved specimen photo" className="size-full object-cover" />
        ) : (
          <div aria-hidden className="size-full grid-paper animate-breathe" />
        )}
        <span aria-hidden className={`${tick} left-2.5 top-2.5 rounded-tl-sm border-l-2 border-t-2`} />
        <span aria-hidden className={`${tick} right-2.5 top-2.5 rounded-tr-sm border-r-2 border-t-2`} />
        <span aria-hidden className={`${tick} bottom-2.5 left-2.5 rounded-bl-sm border-b-2 border-l-2`} />
        <span aria-hidden className={`${tick} bottom-2.5 right-2.5 rounded-br-sm border-b-2 border-r-2`} />
        <span
          aria-hidden
          className="mono-label absolute left-4 top-4 rounded-tac-sm border border-line px-2 py-1.5 text-ink frosted"
        >
          SPECIMEN PLATE
        </span>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 px-3 py-2.5">
        <span className="mono-label inline-flex items-center gap-1.5 text-ink-muted">
          <Clock size={13} aria-hidden />
          {formatDateTime(capturedAt)}
        </span>
        <span className="mono-label inline-flex items-center gap-1.5 text-ink-muted">
          <MapPin size={13} aria-hidden />
          {gpsStamp(gps, { accuracy: true })}
        </span>
        <span className="mono-label inline-flex items-center gap-1.5 text-ink-muted">
          <Database size={13} aria-hidden />
          DB {dbVersion}
        </span>
      </figcaption>
    </figure>
  );
}
