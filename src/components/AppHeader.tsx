import Link from "next/link";

import { Icon } from "@/components/ui";

/**
 * Persistent top chrome — matches the Stitch landing design.
 * Logo: spa icon in a primary rounded square + "MUN MIND" wordmark.
 * "Get Help" pill is always visible per PRD §7.
 */
export function AppHeader() {
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
