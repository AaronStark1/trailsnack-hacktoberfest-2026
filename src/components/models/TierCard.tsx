import type { ReactNode } from "react";
import { Cpu } from "lucide-react";
import Card from "../ui/Card.tsx";

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
    <Card>
      <div className="flex items-center gap-2">
        <Cpu size={24} aria-hidden />
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <p className="mt-1 font-mono text-base break-all">{modelId}</p>
      <p className="text-base opacity-80">{meta}</p>
      <div className="mt-2">{status}</div>
      {children && <div className="mt-2">{children}</div>}
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </Card>
  );
}
