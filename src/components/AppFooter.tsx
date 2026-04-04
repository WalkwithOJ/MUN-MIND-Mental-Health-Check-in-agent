import Link from "next/link";

import resourcesJson from "@/config/resources.json";

interface Resource {
  id: string;
  name: string;
  phone: string | null;
}

const resources = (resourcesJson as { resources: Resource[] }).resources;

function formatPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Persistent footer — matches the Stitch landing design.
 * Crisis numbers come from src/config/resources.json (never hardcoded).
 */
export function AppFooter() {
  const line988 = resources.find((r) => r.id === "helpline_988");

  return (
    <footer className="w-full bg-[var(--color-surface-alt)] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[13px] leading-5 text-[var(--color-secondary)] text-center md:text-left order-2 md:order-1">
          © {new Date().getFullYear()} MUN MIND. For immediate support, please
          use the Crisis Link.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 order-1 md:order-2">
          <Link
            href="/resources"
            className="text-[13px] font-bold underline text-[var(--color-crisis)] hover:text-[var(--color-primary)] transition-colors"
          >
            Crisis Help Now
          </Link>
          {line988?.phone && (
            <a
              href={formatPhoneHref(line988.phone)}
              className="text-[13px] font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
            >
              Call {line988.phone}
            </a>
          )}
          <Link
            href="/resources"
            className="text-[13px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            Resources
          </Link>
        </div>
      </div>
    </footer>
  );
}
