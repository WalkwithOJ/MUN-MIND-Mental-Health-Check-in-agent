import { cn } from "@/lib/cn";

interface IconProps {
  /** Material Symbols Outlined icon name — e.g. "spa", "visibility_off", "verified_user". */
  name: string;
  /** Render the filled variant instead of outlined. */
  filled?: boolean;
  /** Tailwind text size class (e.g. "text-lg", "text-xl"). Defaults to inherit. */
  className?: string;
  /** Mark as decorative for screen readers. Defaults to true. */
  decorative?: boolean;
}

/**
 * Wrapper for Material Symbols Outlined icons from the Stitch design system.
 *
 * Loaded via the Google Fonts CSS link in `src/app/layout.tsx`. CSP is
 * configured in `next.config.ts` to allow `fonts.googleapis.com` and
 * `fonts.gstatic.com`.
 */
export function Icon({
  name,
  filled = false,
  className,
  decorative = true,
}: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined leading-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden={decorative ? "true" : undefined}
    >
      {name}
    </span>
  );
}
