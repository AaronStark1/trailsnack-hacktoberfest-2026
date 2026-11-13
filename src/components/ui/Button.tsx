import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** md = 56px (default), lg = 64px for the single most important action. */
  size?: "md" | "lg";
  children: ReactNode;
}

const styles: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-trail text-on-trail bevel hover:bg-trail-dark border border-trail-dark/60",
  secondary:
    "bg-surface text-trail border-2 border-trail bevel-light hover:bg-surface-2 dark:border-trail",
  danger: "bg-danger text-on-trail bevel border border-black/20",
  ghost:
    "bg-transparent text-ink underline decoration-2 underline-offset-4 decoration-line-strong hover:bg-surface-2 hover:decoration-ink",
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  md: "min-h-14 px-5 text-lg",
  lg: "min-h-16 px-6 text-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-tac font-bold tracking-tight select-none tac-press " +
    "focus-visible:outline-3 focus-visible:outline-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:transform-none";
  return (
    <button type={type} className={`${base} ${sizes[size]} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
