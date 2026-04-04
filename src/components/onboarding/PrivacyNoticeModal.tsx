"use client";

import { useId, useState } from "react";

import { Button, Icon, Modal } from "@/components/ui";
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

// Material Symbols Outlined icons for each privacy bullet, mapped by bullet index.
// The last bullet (crisis resources) gets an error-container styling.
const POINT_ICONS = [
  "no_accounts",
  "history_toggle_off",
  "visibility_off",
  "shield_person",
  "shield_person",
  "emergency",
];

interface PrivacyNoticeModalProps {
  open: boolean;
  onAcknowledge: () => void;
  onCancel: () => void;
}

/**
 * First-visit privacy modal — matches the Stitch design:
 *   - verified_user header icon
 *   - editorial-shadow container
 *   - filled Material Symbols for each bullet on a secondary-container chip
 *   - final crisis bullet on an error-container chip
 *   - gradient primary button + ghost Cancel
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
    <Modal
      open={open}
      onClose={onCancel}
      labelledBy={headingId}
      className="max-w-2xl p-0 editorial-shadow border border-[var(--color-border-strong)]/15"
    >
      <div className="px-8 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-4 text-[var(--color-primary)]">
          <Icon name="verified_user" className="text-[28px]" />
          <h2
            id={headingId}
            className="text-[28px] leading-9 font-heading font-bold tracking-tight"
          >
            {copy.modalHeading}
          </h2>
        </div>
        <p className="text-[15px] leading-6 text-[var(--color-secondary)]">
          {copy.bodyText}
        </p>
      </div>

      <div className="px-8 pb-6">
        <div className="bg-[var(--color-surface-alt)] p-6 rounded-[16px] flex flex-col gap-5">
          {copy.points.map((point, i) => {
            const iconName = POINT_ICONS[i] ?? "check_circle";
            const isCrisis = i === copy.points.length - 1;
            return (
              <div key={point} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCrisis
                      ? "bg-[#ffdad6] text-[#93000a]"
                      : "bg-[var(--color-secondary-container)] text-[var(--color-primary)]"
                  }`}
                >
                  <Icon name={iconName} filled className="text-[16px]" />
                </span>
                <p
                  className={`text-[14px] leading-5 text-[var(--color-text-body)] ${
                    isCrisis ? "font-semibold" : ""
                  }`}
                >
                  {point}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-8 pb-10 flex flex-col gap-6">
        <label className="flex items-center gap-4 cursor-pointer min-h-[44px] group">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="peer appearance-none w-6 h-6 rounded-[4px] border-2 border-[var(--color-border-strong)] bg-[var(--color-surface-card)] cursor-pointer checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] transition-colors"
            />
            <Icon
              name="check"
              className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 text-[16px] pointer-events-none"
            />
          </span>
          <span className="text-[14px] leading-5 text-[var(--color-text-body)] select-none">
            {copy.ackCheckbox}
          </span>
        </label>

        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {copy.cancelButton}
          </Button>
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={!acknowledged}
            className="group relative w-full md:w-auto inline-flex items-center justify-center px-8 py-3 rounded-[8px] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] text-white font-heading font-semibold shadow-[var(--shadow-sm)] min-h-[48px] transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {copy.ackButton}
          </button>
        </div>
      </div>
    </Modal>
  );
}
