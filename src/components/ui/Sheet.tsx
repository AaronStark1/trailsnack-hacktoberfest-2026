import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "./Button.tsx";
import { useDialogFocus } from "./useDialogFocus.ts";

export default function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, onClose);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="plate max-h-[88dvh] w-full max-w-lg overflow-auto rounded-b-none px-5 pt-3 pb-safe shadow-float animate-sheet-in outline-none sm:rounded-b-plate"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line-strong" />
        <h2 className="display text-display-md">{title}</h2>
        <div className="mt-3">{children}</div>
        <Button variant="secondary" onClick={onClose} className="mt-5 mb-5 w-full">
          Close
        </Button>
      </div>
    </div>,
    document.body,
  );
}
