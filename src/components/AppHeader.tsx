"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

interface NavLink {
  label: string;
  href: string;
  matchPaths?: string[];
}

// Nav links mirror the Stitch landing_page_desktop design.
// Active state is determined by pathname so the underline follows the user.
const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/", matchPaths: ["/"] },
  { label: "Our Mission", href: "/about", matchPaths: ["/about"] },
  { label: "Resources", href: "/resources", matchPaths: ["/resources"] },
];

/**
 * Persistent top chrome.
 * - Logo: `spa` icon in a primary rounded square + "MUN MIND" wordmark
 * - Nav: Home / Our Mission / Resources (active link has a primary underline)
 * - Get Help: always-visible crisis CTA (44px touch target)
 */
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-[rgba(250,249,244,0.8)] backdrop-blur-xl sticky top-0 z-40 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 min-h-[44px]"
          aria-label="MUN MIND home"
        >
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-[8px] bg-[var(--color-primary)] flex items-center justify-center text-white"
          >
            <Icon name="spa" filled className="text-[20px]" />
          </span>
          <span className="font-heading font-bold text-[20px] tracking-tight text-[var(--color-primary)]">
            MUN MIND
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              link.matchPaths?.some((p) =>
                p === "/" ? pathname === "/" : pathname.startsWith(p)
              ) ?? false;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center min-h-[44px] font-heading text-[16px]",
                  "transition-colors duration-200",
                  isActive
                    ? "font-semibold text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                    : "font-normal text-[var(--color-secondary)] hover:text-[var(--color-primary-container)]"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/resources"
          className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[8px] bg-[var(--color-primary)] text-white text-[14px] font-semibold shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-container)] transition-colors"
        >
          <Icon name="emergency" className="text-[18px]" />
          Get Help
        </Link>
      </div>
    </header>
  );
}
