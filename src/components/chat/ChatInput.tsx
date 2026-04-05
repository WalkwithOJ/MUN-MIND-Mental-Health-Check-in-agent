"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import copyJson from "@/config/copy.json";
import { VoiceButton } from "@/components/chat/VoiceButton";

interface CopyFile {
  chat: {
    inputPlaceholder: string;
  };
}

const copy = (copyJson as unknown as CopyFile).chat;

interface ChatInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
}

/**
 * Chat input — auto-grows up to a cap, Enter to send, Shift+Enter for newline.
 * Disabled while a send is in flight.
 *
 * Voice input: the mic button streams interim transcripts into the textarea
 * so the student can review/edit before sending. Nothing is auto-sent.
 */
export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Base text already in the textarea when voice started — interim results
  // are appended to this so manual typing before a dictation isn't clobbered.
  const voiceBaseRef = useRef<string>("");
  const voiceActiveRef = useRef<boolean>(false);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    voiceBaseRef.current = "";
    voiceActiveRef.current = false;
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const handleVoiceTranscript = useCallback((text: string) => {
    if (!voiceActiveRef.current) {
      voiceBaseRef.current = value;
      voiceActiveRef.current = true;
    }
    const base = voiceBaseRef.current;
    const next = base ? `${base} ${text}`.trimStart() : text;
    setValue(next);
    // Resize on the next tick after state commits
    requestAnimationFrame(resizeTextarea);
  }, [value]);

  const handleVoiceFinal = useCallback((text: string) => {
    const base = voiceBaseRef.current;
    const next = base ? `${base} ${text}`.trimStart() : text;
    setValue(next);
    voiceActiveRef.current = false;
    requestAnimationFrame(resizeTextarea);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={cn(
        "flex items-end gap-3 p-3 bg-[var(--color-surface-card)] rounded-[16px]",
        "border border-[var(--color-border-strong)]",
        "focus-within:border-[var(--color-primary)] transition-colors"
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder={copy.inputPlaceholder}
        aria-label="Chat message"
        className={cn(
          "flex-1 resize-none bg-transparent border-0 outline-none",
          "text-[16px] leading-6 text-[var(--color-text-body)]",
          "placeholder:text-[var(--color-text-placeholder)]",
          "min-h-[44px] max-h-[160px] py-2"
        )}
      />
      <VoiceButton
        onTranscript={handleVoiceTranscript}
        onFinalTranscript={handleVoiceFinal}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={cn(
          "shrink-0 w-11 h-11 rounded-[8px] flex items-center justify-center",
          "bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]",
          "transition-[background-color,transform] duration-150",
          "hover:bg-[var(--color-primary-container)] active:scale-[0.95]",
          "disabled:bg-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:active:scale-100"
        )}
        aria-label="Send message"
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
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}
