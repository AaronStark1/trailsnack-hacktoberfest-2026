import type { ReactNode } from "react";
import Button from "./Button.tsx";

export default function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-(--color-bg) p-5 sm:rounded-3xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="mt-3">{children}</div>
        <Button variant="secondary" onClick={onClose} className="mt-4 w-full">
          Close
        </Button>
      </div>
    </div>
  );
}
