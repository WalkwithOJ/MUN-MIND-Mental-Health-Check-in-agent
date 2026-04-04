import Link from "next/link";

/**
 * Persistent top chrome. The "Crisis? Get help now" link must be visible on
 * every screen per docs/PRD.md §7 — no navigation state should ever hide it.
 * Touch target meets 44px minimum per PRD §4.5.
 */
export function AppHeader() {
  return (
    <header className="w-full border-b border-[var(--color-border-strong)] bg-[rgba(250,249,244,0.9)] backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="font-heading font-semibold text-[20px] tracking-tight text-[var(--color-primary)] min-h-[44px] inline-flex items-center"
        >
          MUN MIND
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6">
          <Link
            href="/resources"
            className="inline-flex items-center min-h-[44px] px-3 text-[14px] font-semibold text-[var(--color-crisis)] hover:underline"
          >
            Crisis? Get help now →
          </Link>
        </nav>
      </div>
    </header>
  );
}
