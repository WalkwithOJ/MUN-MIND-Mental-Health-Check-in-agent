"use client";

import type { Resource } from "@/lib/escalation";
import { cn } from "@/lib/cn";

interface ResourceCardProps {
  resource: Resource;
  onClick?: () => void;
}

/**
 * Inline resource card rendered inside the chat. Tapping a phone number
 * on mobile dials directly. Reports the click to /api/resource-click for
 * anonymized aggregate telemetry.
 */
export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const telHref = resource.phone ? `tel:${resource.phone.replace(/[^\d+]/g, "")}` : null;
  const borderColor = getCategoryBorder(resource.category);

  return (
    <div
      className={cn(
        "bg-[var(--color-surface-card)] rounded-[8px] p-4 shadow-[var(--shadow-sm)]",
        "border-l-4",
        "flex flex-col gap-2"
      )}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] leading-5 font-semibold text-[var(--color-primary)]">
          {resource.name}
        </h3>
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.08em] shrink-0">
          {resource.hours}
        </span>
      </div>
      <p className="text-[12px] leading-4 text-[var(--color-text-body)]">
        {resource.description}
      </p>
      <div className="flex flex-wrap gap-2 mt-1">
        {telHref && (
          <a
            href={telHref}
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px]",
              "bg-[var(--color-secondary-container)] rounded-[8px]",
              "text-[12px] font-semibold text-[var(--color-primary)]",
              "hover:bg-[var(--color-accent)]"
            )}
          >
            Call {resource.phone}
          </a>
        )}
        {resource.text && (
          <span className="inline-flex items-center px-3 py-2 min-h-[44px] text-[12px] font-semibold text-[var(--color-text-muted)]">
            Text {resource.text}
          </span>
        )}
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px]",
              "text-[12px] font-semibold text-[var(--color-primary)] underline"
            )}
          >
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}

function getCategoryBorder(category: string): string {
  // Map each category to a left-border accent color so visually different
  // resource types are distinguishable at a glance. Stays within the palette.
  switch (category) {
    case "crisis_line":
    case "crisis_text":
    case "emergency":
    case "campus_emergency":
    case "hospital":
      return "var(--color-crisis)";
    case "student_helpline":
    case "counselling":
      return "var(--color-primary)";
    case "peer_support":
      return "var(--color-secondary)";
    case "self_help":
      return "var(--color-accent)";
    default:
      return "var(--color-border-strong)";
  }
}
