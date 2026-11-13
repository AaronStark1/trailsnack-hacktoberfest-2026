import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** raised = bramble plate; inset = recessed well; flat = etched hairline only. */
  variant?: "raised" | "inset" | "flat";
}

const variants: Record<NonNullable<Props["variant"]>, string> = {
  raised: "plate",
  inset: "well rounded-plate",
  flat: "rounded-plate border border-line bg-transparent",
};

export default function Card({ children, className = "", variant = "raised" }: Props) {
  return <div className={`${variants[variant]} p-5 ${className}`}>{children}</div>;
}
