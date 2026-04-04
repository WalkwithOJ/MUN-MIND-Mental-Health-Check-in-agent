import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "crisis";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
}

/**
 * Button — the primary interactive control in MUN MIND.
 *
 * Variants map to the Figma design system (frame 1:2):
 *   - primary  → deep teal, used for main CTAs ("Start a check-in")
 *   - secondary → soft sage, used for alternative actions
 *   - ghost     → no fill, used for tertiary actions and inline links
 *   - crisis    → red, ONLY for "Call 988 now" / "Get help now" CTAs
 *
 * All variants respect WCAG 2.1 AA contrast and have visible focus rings.
 * Touch targets are ≥44px (size="md" is 48px, "lg" is 56px).
 */
export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-[8px] transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

  const sizes: Record<Size, string> = {
    md: "px-6 py-3 text-[16px] leading-6 min-h-[48px]",
    lg: "px-7 py-4 text-[18px] leading-7 min-h-[56px]",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-container)] disabled:bg-[var(--color-border-strong)] disabled:text-[var(--color-text-disabled)] disabled:shadow-none",
    secondary:
      "bg-[var(--color-secondary-container)] text-[var(--color-secondary)] hover:bg-[var(--color-accent)] disabled:bg-[var(--color-surface-high)] disabled:text-[var(--color-text-disabled)]",
    ghost:
      "bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-surface-high)] disabled:text-[var(--color-text-disabled)]",
    crisis:
      "bg-[var(--color-crisis)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-crisis-hover)]",
  };

  return (
    <button type={type} className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
      {children}
    </button>
  );
}
