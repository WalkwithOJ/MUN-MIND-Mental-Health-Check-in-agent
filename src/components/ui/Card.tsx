import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Radius = "sm" | "md";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `sm` = 8px (functional elements), `md` = 16px (containment elements). Only two values allowed. */
  radius?: Radius;
  elevated?: boolean;
}

/**
 * Card — primary content container. Two radii only (8px / 16px), per the
 * Figma design system and anti-vibe-code.md.
 */
export function Card({
  radius = "md",
  elevated = true,
  className,
  children,
  ...rest
}: CardProps) {
  const radii: Record<Radius, string> = {
    sm: "rounded-[8px]",
    md: "rounded-[16px]",
  };

  return (
    <div
      className={cn(
        "bg-[var(--color-surface-card)] p-6",
        radii[radius],
        elevated && "shadow-[var(--shadow-sm)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
