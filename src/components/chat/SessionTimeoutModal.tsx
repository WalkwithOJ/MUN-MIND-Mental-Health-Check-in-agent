"use client";

import { useId } from "react";

import copyJson from "@/config/copy.json";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

interface SessionCopy {
  timeoutHeading: string;
  timeoutBody: string;
  timeoutButton: string;
}

const copy = (copyJson as unknown as { session: SessionCopy }).session;

interface Props {
  open: boolean;
  onContinue: () => void;
}

/**
 * Shown after a long idle. Deliberately gentle — no countdown, no pressure,
 * no "we'll log you out" language (there's no login to begin with). Tapping
 * the button simply resumes the conversation.
 */
export function SessionTimeoutModal({ open, onContinue }: Props) {
  const headingId = useId();

  return (
    <Modal open={open} onClose={onContinue} labelledBy={headingId}>
      <h2
        id={headingId}
        className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-2"
      >
        {copy.timeoutHeading}
      </h2>
      <p className="text-[15px] leading-6 text-[var(--color-text-body)] mb-6">
        {copy.timeoutBody}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className={cn(
            "h-11 px-6 rounded-[8px] font-semibold",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-container)] transition-colors",
            "shadow-[var(--shadow-sm)]"
          )}
        >
          {copy.timeoutButton}
        </button>
      </div>
    </Modal>
  );
}
