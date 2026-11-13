import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "violet";
export type ButtonSize = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** sm = 48px, md = 56px (default), lg = 64px for the single most important action. */
  size?: ButtonSize;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  // Cloudberry: the one warm, lit action on a screen.
  primary:
    "bg-amber text-on-amber shadow-cta hover:bg-amber-bright border border-amber-bright/60 hc:border-amber",
  // Etched cream outline on bramble.
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-ink/50 hover:bg-surface-3",
  danger: "bg-danger text-on-danger border border-danger-ink/40 hover:brightness-110",
  // Tertiary: quiet text action.
  ghost: "bg-transparent text-ink-muted border border-transparent hover:bg-surface-3 hover:text-ink",
  // Elderberry: Deep Look / Tier 2 only.
  violet: "bg-violet text-on-violet border border-violet-ink/40 hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-12 px-4 text-[0.9375rem]",
  md: "min-h-14 px-6 text-base",
  lg: "min-h-16 px-7 text-lg",
};

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-full text-center font-semibold leading-tight " +
  "no-underline select-none press " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none aria-disabled:opacity-40";

/** Class string for anything that must look like a Button (router links, labels). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest}>
      {children}
    </button>
  );
}
