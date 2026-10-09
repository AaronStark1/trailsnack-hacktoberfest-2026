import type { ReactNode } from "react";

export default function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
