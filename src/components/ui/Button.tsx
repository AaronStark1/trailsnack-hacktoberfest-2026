import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

export default function Button({ variant = "primary", children, className = "", ...rest }: Props) {
  const base =
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 disabled:opacity-50";
  const styles: Record<string, string> = {
    primary: "bg-(--color-trail) text-white hover:bg-(--color-trail-dark)",
    secondary: "border-2 border-(--color-trail) text-(--color-trail)",
    danger: "bg-(--color-danger) text-white",
    ghost: "text-(--color-ink) underline",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
