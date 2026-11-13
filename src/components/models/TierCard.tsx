import type { ReactNode } from "react";
import { MemoryStick } from "lucide-react";

/**
 * Model tier housing: a header strip with the memory-module glyph, then a
 * body holding the model id, meta line, a recessed status well, optional
 * gate content and the action rack.
 */
export default function TierCard({
  title,
  modelId,
  meta,
  status,
  actions,
  children,
}: {
  title: string;
  modelId: string;
  meta: string;
  status: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="tac-card overflow-hidden p-0">
      <header className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
        <span className="well flex size-11 shrink-0 items-center justify-center rounded-tac text-trail">
          <MemoryStick size={22} aria-hidden />
        </span>
        <h3 className="min-w-0 text-xl font-extrabold leading-tight">{title}</h3>
      </header>
      <div className="p-4">
        <p className="mono-label text-ink-faint">Model ID</p>
        <p className="mt-1 font-mono text-sm break-all text-ink-muted">{modelId}</p>
        <p className="mt-3 text-base">{meta}</p>
        <div className="well mt-3 rounded-tac p-3">{status}</div>
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
      </div>
    </article>
  );
}
