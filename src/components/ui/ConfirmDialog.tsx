import { useRef } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import Button from "./Button.tsx";
import { useDialogFocus } from "./useDialogFocus.ts";

/**
 * Destructive-action confirmation. Focus lands on Cancel (the safe choice),
 * Tab stays inside, Escape or the scrim cancels. Portalled to <body> so no
 * frosted or animated ancestor can capture its fixed positioning.
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, onCancel);
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in sm:items-center"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="plate w-full max-w-md overflow-hidden border-danger/50 shadow-float animate-sheet-in outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="thorn-edge text-danger" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-danger/50 bg-danger-bg text-danger-ink">
              <TriangleAlert size={24} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="display text-display-md">{title}</h2>
              <p className="mt-2.5 text-ink-muted">{body}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
