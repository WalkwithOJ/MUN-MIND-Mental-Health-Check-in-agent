"use client";

import { useEffect, useRef } from "react";

const AUTO_SCROLL_THRESHOLD = 120;

import { ChatBubble } from "@/components/ui";

import type { ChatMessage } from "@/hooks/useChat";
import { MoodWidget } from "./MoodWidget";
import { ResourceCard } from "./ResourceCard";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  onMoodSelect: (score: 1 | 2 | 3 | 4 | 5) => void;
}

/**
 * Renders the scrolling conversation surface.
 *
 * aria-live="polite" announces new bot messages to screen readers as they
 * arrive. We use "polite" (not "assertive") so crisis resources aren't
 * interrupted by routine responses.
 */
export function MessageList({
  messages,
  pending,
  onMoodSelect,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll only when the user is already near the bottom. If they've
  // scrolled up to re-read a message or resource, don't yank them back down.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < AUTO_SCROLL_THRESHOLD) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, pending]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6"
      role="log"
      aria-live="polite"
      aria-label="Conversation with MUN MIND"
    >
      <div className="max-w-[720px] mx-auto flex flex-col gap-4">
        {messages.map((msg) => {
          if (msg.moodWidget) {
            return (
              <div key={msg.id} className="flex justify-start">
                <MoodWidget onSelect={onMoodSelect} />
              </div>
            );
          }
          if (msg.role === "user") {
            return (
              <ChatBubble key={msg.id} role="user">
                {msg.content}
              </ChatBubble>
            );
          }
          if (msg.role === "system") {
            return (
              <p
                key={msg.id}
                className="text-[12px] leading-4 text-[var(--color-text-muted)] text-center px-4"
              >
                {msg.content}
              </p>
            );
          }
          return (
            <div key={msg.id} className="flex flex-col gap-3">
              <ChatBubble role="bot">{msg.content}</ChatBubble>
              {msg.resources && msg.resources.length > 0 && (
                <div className="flex flex-col gap-2 ml-2">
                  {/* Red tier: top 3 crisis lines. Yellow/Green: show up to 5
                      so campus-specific resources (MUN Wellness Centre, Grenfell
                      Student Wellness, etc.) aren't hidden behind generic lines. */}
                  {msg.resources
                    .slice(0, msg.tier === "red" ? 3 : 5)
                    .map((r) => (
                      <ResourceCard key={r.id} resource={r} />
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {pending && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>
    </div>
  );
}
