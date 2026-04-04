"use client";

import { useId, useState } from "react";

import { Button, Modal } from "@/components/ui";
import copyJson from "@/config/copy.json";

interface CopyFile {
  privacy: {
    modalHeading: string;
    bodyText: string;
    points: string[];
    ackCheckbox: string;
    ackButton: string;
    cancelButton: string;
  };
}

const copy = (copyJson as unknown as CopyFile).privacy;

interface PrivacyNoticeModalProps {
  open: boolean;
  onAcknowledge: () => void;
  onCancel: () => void;
}

/**
 * First-visit privacy modal.
 *
 * Trust foundation of the product — the student reads this once before they
 * can start a check-in. The "I understand this is not counselling or therapy"
 * checkbox is a required acknowledgment, not a legal dark pattern.
 *
 * Copy lives in copy.json so a staff member can update wording without
 * touching code.
 */
export function PrivacyNoticeModal({
  open,
  onAcknowledge,
  onCancel,
}: PrivacyNoticeModalProps) {
  const headingId = useId();
  const [acknowledged, setAcknowledged] = useState(false);

  function handleAcknowledge() {
    if (!acknowledged) return;
    onAcknowledge();
  }

  return (
    <Modal open={open} onClose={onCancel} labelledBy={headingId}>
      <div className="flex items-center gap-3 mb-3">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-[var(--color-secondary-container)] flex items-center justify-center"
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
            className="text-[var(--color-primary)]"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2
          id={headingId}
          className="text-[24px] leading-8 font-semibold text-[var(--color-primary)]"
        >
          {copy.modalHeading}
        </h2>
      </div>

      <p className="text-[14px] leading-5 text-[var(--color-text-body)] mb-6">
        {copy.bodyText}
      </p>

      <ul className="bg-[var(--color-surface-alt)] rounded-[8px] p-5 flex flex-col gap-4 mb-6">
        {copy.points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-[var(--color-secondary-container)] flex items-center justify-center text-[var(--color-primary)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-[14px] leading-5 text-[var(--color-text-body)]">
              {point}
            </span>
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-3 mb-6 cursor-pointer min-h-[44px] py-2">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="w-5 h-5 accent-[var(--color-primary)]"
        />
        <span className="text-[14px] leading-5 text-[var(--color-text-body)]">
          {copy.ackCheckbox}
        </span>
      </label>

      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {copy.cancelButton}
        </Button>
        <Button
          type="button"
          onClick={handleAcknowledge}
          disabled={!acknowledged}
        >
          {copy.ackButton}
        </Button>
      </div>
    </Modal>
  );
}
