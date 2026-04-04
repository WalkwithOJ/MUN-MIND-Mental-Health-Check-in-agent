import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ChatBubbleProps {
  role: "user" | "bot";
  children: ReactNode;
  className?: string;
}

/**
 * ChatBubble — the conversational surface, matched to Figma "Conversation Design".
 *
 * User bubbles use the accent color and are right-aligned with a cut on the
 * bottom-right. Bot bubbles use the secondary container and are left-aligned
 * with a cut on the bottom-left. Both cap at ~348px for readability on desktop.
 */
export function ChatBubble({ role, children, className }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("w-full flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] md:max-w-[348px] px-4 py-4 shadow-[var(--shadow-sm)]",
          "text-[14px] leading-5",
          // Bot text uses --color-text-body (not --color-secondary) for WCAG AA contrast.
          // See Phase 7 review CRIT-1.
          isUser
            ? "bg-[var(--color-accent)] text-[var(--color-text-primary)] rounded-tl-[16px] rounded-tr-[16px] rounded-bl-[16px] rounded-br-none"
            : "bg-[var(--color-secondary-container)] text-[var(--color-text-body)] rounded-tl-[16px] rounded-tr-[16px] rounded-bl-none rounded-br-[16px]",
          className
        )}
        role="group"
        aria-label={isUser ? "Your message" : "MUN MIND response"}
      >
        {children}
      </div>
    </div>
  );
}
