"use client";

import { Icon } from "@/components/ui";
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

const realCampuses = campuses.filter((c) => c.id !== "any");
const anyCampus = campuses.find((c) => c.id === "any");

interface CampusSelectorProps {
  onSelect: (campus: CampusId) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}

/**
 * Campus selector — matches the Stitch campus_selector_desktop design.
 * Three large cards with a location_on icon that reveals on hover.
 * Campus is stored in client-side sessionStorage only; never sent to the server.
 */
export function CampusSelector({ onSelect, headingRef }: CampusSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-12 w-full max-w-5xl mx-auto px-6">
      <div className="text-center max-w-xl">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[40px] leading-[48px] md:text-[56px] md:leading-[64px] font-bold font-heading text-[var(--color-primary)] tracking-tight mb-4 outline-none"
        >
          {copy.heading}
        </h1>
        <p className="text-[18px] leading-7 text-[var(--color-secondary)]">
          {copy.subheading}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {realCampuses.map((campus) => (
          <CampusCard
            key={campus.id}
            campus={campus}
            onClick={() => onSelect(campus.id)}
          />
        ))}
      </div>

      {anyCampus ? (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onSelect(anyCampus.id)}
            className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2 text-[16px] font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            {copy.optionDefault}
            <Icon name="arrow_forward" className="text-[18px]" />
          </button>
          <p className="text-[12px] italic text-[var(--color-text-muted)]">
            You&apos;ll be shown general NL mental health resources.
          </p>
        </div>
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
        "group bg-[var(--color-surface-high)] rounded-[16px] p-8",
        "flex flex-col items-start text-left gap-3 min-h-[220px]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-xl"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-card)] flex items-center justify-center text-[var(--color-primary)]">
        <Icon name="location_on" className="text-[24px]" />
      </div>
      <p className="text-[20px] leading-7 font-bold font-heading text-[var(--color-primary)]">
        {campus.name}
      </p>
      <p className="text-[14px] leading-5 text-[var(--color-secondary)]">
        {campus.description}
      </p>
      <span className="mt-auto text-[12px] font-semibold text-[var(--color-secondary)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        Select
        <Icon name="arrow_forward" className="text-[14px]" />
      </span>
    </button>
  );
}
