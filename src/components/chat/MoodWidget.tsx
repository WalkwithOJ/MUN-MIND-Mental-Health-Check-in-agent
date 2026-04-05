"use client";

import { useState } from "react";

import copyJson from "@/config/copy.json";
import { cn } from "@/lib/cn";

interface MoodOption {
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  id: string;
}

interface CopyFile {
  chat: {
    moodWidgetHeading: string;
    moodOptions: MoodOption[];
  };
}

const copy = (copyJson as unknown as CopyFile).chat;

interface MoodWidgetProps {
  onSelect: (score: 1 | 2 | 3 | 4 | 5) => void;
}

/**
 * Inline mood selector rendered as a bot message. One-shot — once the user
 * picks a mood, the widget disables to prevent double submission.
 */
export function MoodWidget({ onSelect }: MoodWidgetProps) {
  const [chosen, setChosen] = useState<number | null>(null);

  function handlePick(score: 1 | 2 | 3 | 4 | 5) {
    if (chosen !== null) return;
    setChosen(score);
    onSelect(score);
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-[520px]">
      <p className="text-[14px] leading-5 text-[var(--color-text-muted)] px-1">
        {copy.moodWidgetHeading}
      </p>
      <div className="grid grid-cols-5 gap-2">
        {copy.moodOptions.map((option) => {
          const isSelected = chosen === option.score;
          const isLocked = chosen !== null && !isSelected;
          return (
            <button
              key={option.id}
              type="button"
              disabled={chosen !== null}
              onClick={() => handlePick(option.score)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 min-h-[72px]",
                "bg-[var(--color-surface-card)] rounded-[8px]",
                "border border-[var(--color-border-strong)]",
                "transition-[background-color,border-color,opacity,transform] duration-200 ease-out",
                "hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-alt)]",
                "active:scale-[0.98]",
                isSelected &&
                  "border-[var(--color-primary)] bg-[var(--color-secondary-container)]",
                isLocked && "opacity-50 cursor-default"
              )}
              aria-label={`${option.label} (${option.score} of 5)`}
            >
              <MoodIcon score={option.score} />
              <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoodIcon({ score }: { score: 1 | 2 | 3 | 4 | 5 }) {
  // Abstract shapes, not emoji. Each mood has a subtly different glyph
  // but within the same visual language per anti-vibe-code.md.
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-[var(--color-primary)]",
    "aria-hidden": true,
  };
  if (score >= 4) {
    return (
      <svg {...common}>
        <path d="M5 14s2 3 7 3 7-3 7-3" />
        <circle cx="9" cy="9" r="1" />
        <circle cx="15" cy="9" r="1" />
      </svg>
    );
  }
  if (score === 3) {
    return (
      <svg {...common}>
        <path d="M8 14h8" />
        <circle cx="9" cy="9" r="1" />
        <circle cx="15" cy="9" r="1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 16s2-3 7-3 7 3 7 3" />
      <circle cx="9" cy="9" r="1" />
      <circle cx="15" cy="9" r="1" />
    </svg>
  );
}
