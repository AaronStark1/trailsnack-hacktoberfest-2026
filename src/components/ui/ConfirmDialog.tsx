import { TriangleAlert } from "lucide-react";
import Button from "./Button.tsx";

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
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="tac-card w-full max-w-md overflow-hidden p-0 animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="hazard-stripes h-2.5" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tac bg-danger-bg text-danger">
              <TriangleAlert size={26} aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold">{title}</h2>
              <p className="mt-2 text-ink-muted">{body}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
