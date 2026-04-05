"use client";

import { useId } from "react";

import copyJson from "@/config/copy.json";
import { Modal } from "@/components/ui/Modal";
import { ResourceCard } from "@/components/chat/ResourceCard";
import { cn } from "@/lib/cn";
import type { SessionSummaryData } from "@/hooks/useChat";

interface SessionCopy {
  summaryHeading: string;
  summaryClosingMessage: string;
  summaryNotSavedNote: string;
  summaryButtonClose: string;
  summaryButtonContinue: string;
}

const copy = (copyJson as unknown as { session: SessionCopy }).session;

interface Props {
  open: boolean;
  summary: SessionSummaryData;
  onContinue: () => void;
  onClose: () => void;
}

/**
 * In-memory session wrap-up. Nothing rendered here is persisted — closing the
 * tab wipes it. The "not saved" note is explicit so students never wonder
 * whether we're silently keeping a record of their reflection.
 */
export function SessionSummaryModal({
  open,
  summary,
  onContinue,
  onClose,
}: Props) {
  const headingId = useId();
  const { moodLabel, topicTags, resourcesShared } = summary;

  return (
    <Modal open={open} onClose={onContinue} labelledBy={headingId}>
      <h2
        id={headingId}
        className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-2"
      >
        {copy.summaryHeading}
      </h2>
      <p className="text-[15px] leading-6 text-[var(--color-text-body)] mb-6">
        {copy.summaryClosingMessage}
      </p>

      <div className="space-y-5 mb-6">
        {moodLabel && (
          <SummaryRow label="How you felt">
            <span className="inline-flex items-center px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-secondary-container)] text-[13px] font-semibold text-[var(--color-primary)]">
              {moodLabel}
            </span>
          </SummaryRow>
        )}

        {topicTags.length > 0 && (
          <SummaryRow label="What came up">
            <div className="flex flex-wrap gap-2">
              {topicTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface-body)] border border-[var(--color-border-strong)] text-[12px] font-medium text-[var(--color-text-body)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </SummaryRow>
        )}

        {resourcesShared.length > 0 && (
          <SummaryRow label="Resources shared with you">
            <div className="space-y-3">
              {resourcesShared.slice(0, 3).map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </SummaryRow>
        )}

        {!moodLabel && topicTags.length === 0 && resourcesShared.length === 0 && (
          <p className="text-[14px] leading-5 text-[var(--color-text-muted)] italic">
            A short check-in. That counts too.
          </p>
        )}
      </div>

      <p className="text-[12px] leading-4 text-[var(--color-text-muted)] mb-6 italic">
        {copy.summaryNotSavedNote}
      </p>

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onContinue}
          className={cn(
            "h-11 px-5 rounded-[8px] font-medium",
            "text-[var(--color-primary)] bg-transparent",
            "hover:bg-[var(--color-surface-body)] transition-colors"
          )}
        >
          {copy.summaryButtonContinue}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "h-11 px-5 rounded-[8px] font-semibold",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-container)] transition-colors",
            "shadow-[var(--shadow-sm)]"
          )}
        >
          {copy.summaryButtonClose}
        </button>
      </div>
    </Modal>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}
