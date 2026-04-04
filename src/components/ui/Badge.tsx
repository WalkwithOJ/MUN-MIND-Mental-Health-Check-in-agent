import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "neutral" | "accent" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

/**
 * Badge — pill-shaped tag used for category labels, signature-component
 * callouts, and quick-reply chips.
 */
export function Badge({
  variant = "neutral",
  className,
  children,
  ...rest
}: BadgeProps) {
  const variants: Record<Variant, string> = {
    neutral:
      "bg-[var(--color-surface-high)] text-[var(--color-text-primary)]",
    accent:
      "bg-[var(--color-secondary-container)] text-[var(--color-secondary)] uppercase tracking-[0.1em]",
    muted: "bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border-strong)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-4 py-2 rounded-full",
        "text-[12px] leading-4 font-semibold",
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
