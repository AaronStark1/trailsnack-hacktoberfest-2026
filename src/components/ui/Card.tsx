import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** raised = default card; inset = recessed well; flat = hairline only. */
  variant?: "raised" | "inset" | "flat";
}

const variants: Record<NonNullable<Props["variant"]>, string> = {
  raised: "tac-card",
  inset: "well rounded-tac-lg",
  flat: "rounded-tac-lg border border-line bg-transparent",
};

export default function Card({ children, className = "", variant = "raised" }: Props) {
  return <div className={`${variants[variant]} p-4 ${className}`}>{children}</div>;
}
