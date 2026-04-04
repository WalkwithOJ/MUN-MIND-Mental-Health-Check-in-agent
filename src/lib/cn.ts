import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with proper conflict resolution.
 *
 * Uses clsx for conditional class composition and tailwind-merge to deduplicate
 * conflicting utilities so consumer `className` overrides work correctly.
 * Without this, `<Button className="bg-red-500">` would emit both backgrounds
 * and the effective one would depend on stylesheet order rather than the
 * caller's intent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
