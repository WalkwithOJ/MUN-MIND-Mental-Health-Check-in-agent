"use client";

import campusesJson from "@/config/campuses.json";
import copyJson from "@/config/copy.json";
import { cn } from "@/lib/cn";
import type { CampusId } from "@/lib/onboarding-storage";

interface Campus {
  id: CampusId;
  name: string;
  location: string | null;
  description: string;
}

interface CopyFile {
  campusSelector: {
    heading: string;
    subheading: string;
    optionDefault: string;
  };
}

const campuses = (campusesJson as unknown as { campuses: Campus[] }).campuses;
const copy = (copyJson as unknown as CopyFile).campusSelector;

// Split the 3 real campuses from the "I'd rather not say" option so they can
// be rendered differently (large tap-friendly cards vs a secondary link).
const realCampuses = campuses.filter((c) => c.id !== "any");
const anyCampus = campuses.find((c) => c.id === "any");

interface CampusSelectorProps {
  onSelect: (campus: CampusId) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}

/**
 * Campus selector — the ONLY quasi-identifier collected, and it stays client-side
 * in sessionStorage. See src/lib/onboarding-storage.ts and docs/research-brief.md §4.3.
 */
export function CampusSelector({ onSelect, headingRef }: CampusSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[960px] mx-auto px-6">
      <div className="text-center max-w-[560px]">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[36px] leading-[40px] font-bold text-[var(--color-primary)] tracking-tight mb-3 outline-none"
        >
          {copy.heading}
        </h1>
        <p className="text-[16px] leading-6 text-[var(--color-text-body)]">
          {copy.subheading}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {realCampuses.map((campus) => (
          <CampusCard
            key={campus.id}
            campus={campus}
            onClick={() => onSelect(campus.id)}
          />
        ))}
      </div>

      {anyCampus ? (
        <button
          type="button"
          onClick={() => onSelect(anyCampus.id)}
          className={cn(
            "text-[14px] font-semibold text-[var(--color-secondary)] underline",
            "min-h-[44px] px-4 hover:text-[var(--color-primary)]"
          )}
        >
          {copy.optionDefault}
        </button>
      ) : null}
    </div>
  );
}

function CampusCard({
  campus,
  onClick,
}: {
  campus: Campus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-[var(--color-surface-card)] border border-[var(--color-border-strong)]",
        "rounded-[16px] p-6 text-left",
        "flex flex-col gap-2 min-h-[140px]",
        "transition-colors duration-200",
        "hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-alt)]"
      )}
    >
      {/* Not an <h2> — a heading inside a <button> is invalid HTML. */}
      <p className="text-[18px] leading-7 font-semibold text-[var(--color-primary)]">
        {campus.name}
      </p>
      {campus.location ? (
        <p className="text-[12px] leading-4 font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {campus.location}
        </p>
      ) : null}
      <p className="text-[14px] leading-5 text-[var(--color-text-body)] mt-1">
        {campus.description}
      </p>
    </button>
  );
}
