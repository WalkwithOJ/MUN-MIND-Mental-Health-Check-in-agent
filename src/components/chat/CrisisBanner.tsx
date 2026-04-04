import type { Resource } from "@/lib/escalation";
import copyJson from "@/config/copy.json";

import { ResourceCard } from "./ResourceCard";

interface CopyFile {
  crisis: {
    bannerHeading: string;
    bannerBody: string;
  };
}

const copy = (copyJson as unknown as CopyFile).crisis;

interface CrisisBannerProps {
  resources: Resource[];
}

/**
 * Pinned crisis banner shown when the current session tier is "red".
 *
 * Never auto-dismisses — per PRD §7, once a crisis is detected the resources
 * stay visible for the remainder of the session even if the student continues
 * typing. The copy is deterministic and read from copy.json.
 */
export function CrisisBanner({ resources }: CrisisBannerProps) {
  // Only the top-priority crisis resources are pinned — 988 + NL Crisis + 911.
  // A student who wants the full list can still open the chat's "Crisis
  // resources" link in the header.
  const top = resources.slice(0, 3);

  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-label="Crisis resources — please reach out now"
      className="bg-[var(--color-crisis)] text-white"
    >
      <div className="max-w-[720px] mx-auto px-6 py-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 shrink-0 rounded-full bg-white/15 flex items-center justify-center"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[18px] leading-6 font-semibold">
              {copy.bannerHeading}
            </h2>
            <p className="text-[14px] leading-5 opacity-90 mt-1">
              {copy.bannerBody}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {top.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      </div>
    </section>
  );
}
