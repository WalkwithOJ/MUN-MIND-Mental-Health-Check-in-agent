"use client";

import { useEffect, useId, useRef, useState } from "react";

import copyJson from "@/config/copy.json";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  hasAcknowledgedVoice,
  setVoiceAcknowledged,
} from "@/lib/voice-storage";

interface VoiceCopy {
  startLabel: string;
  stopLabel: string;
  disclosureHeading: string;
  disclosureBody: string;
  disclosureAgree: string;
  disclosureDecline: string;
}

const voiceCopy = (
  copyJson as unknown as { chat: { voice: VoiceCopy } }
).chat.voice;

interface VoiceButtonProps {
  /** Called with an interim or final transcript whenever it updates. */
  onTranscript: (text: string) => void;
  /** Called with the final transcript when a recording session ends. */
  onFinalTranscript: (text: string) => void;
  /** Disable the button while a send is in flight. */
  disabled?: boolean;
}

/**
 * Microphone button for voice input. Unsupported browsers (Firefox, older
 * embeds) render nothing so the text input is unaffected.
 *
 * Privacy: first use shows a disclosure modal explaining that the browser
 * vendor processes the audio. Acknowledgment is stored in sessionStorage
 * (cleared when the tab closes — matches the rest of the privacy model).
 */
export function VoiceButton({
  onTranscript,
  onFinalTranscript,
  disabled = false,
}: VoiceButtonProps) {
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [ackNonce, setAckNonce] = useState(0);
  const headingId = useId();

  // Keep callback refs fresh without re-running the transcript effect on
  // every parent re-render (the parent recreates these when `value` changes).
  const onTranscriptRef = useRef(onTranscript);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onTranscript, onFinalTranscript]);

  const { supported, listening, transcript, error, start, stop } =
    useSpeechRecognition({
      onFinalResult: (text) => onFinalTranscriptRef.current(text),
    });

  // Stream interim transcripts to the parent so the textarea updates live
  useEffect(() => {
    if (listening && transcript) {
      onTranscriptRef.current(transcript);
    }
  }, [listening, transcript]);

  if (!supported) return null;

  function handleClick() {
    if (listening) {
      stop();
      return;
    }
    if (!hasAcknowledgedVoice()) {
      setShowDisclosure(true);
      return;
    }
    start();
  }

  function handleAgree() {
    setVoiceAcknowledged();
    setShowDisclosure(false);
    setAckNonce((n) => n + 1);
    // Start on the next tick so the modal's focus-restore doesn't race us
    setTimeout(() => start(), 0);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={listening ? voiceCopy.stopLabel : voiceCopy.startLabel}
        aria-pressed={listening}
        title={listening ? voiceCopy.stopLabel : voiceCopy.startLabel}
        className={cn(
          "shrink-0 w-11 h-11 rounded-[8px] flex items-center justify-center",
          "transition-[background-color,transform,box-shadow] duration-150",
          "active:scale-[0.95]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
          listening
            ? "bg-[var(--color-crisis)] text-white animate-pulse shadow-[var(--shadow-sm)]"
            : "bg-[var(--color-surface-body)] text-[var(--color-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-card)]"
        )}
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: 22 }}
        >
          {listening ? "stop_circle" : "mic"}
        </span>
      </button>

      {error && (
        <span
          role="status"
          className="sr-only"
          // Re-announce if ack changes so repeat errors still fire
          key={ackNonce}
        >
          {error}
        </span>
      )}

      <Modal
        open={showDisclosure}
        onClose={() => setShowDisclosure(false)}
        labelledBy={headingId}
      >
        <h2
          id={headingId}
          className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-3"
        >
          {voiceCopy.disclosureHeading}
        </h2>
        <p className="text-[15px] leading-6 text-[var(--color-text-body)] mb-6">
          {voiceCopy.disclosureBody}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => setShowDisclosure(false)}
            className={cn(
              "h-11 px-5 rounded-[8px] font-medium",
              "text-[var(--color-primary)] bg-transparent",
              "hover:bg-[var(--color-surface-body)] transition-colors"
            )}
          >
            {voiceCopy.disclosureDecline}
          </button>
          <button
            type="button"
            onClick={handleAgree}
            className={cn(
              "h-11 px-5 rounded-[8px] font-semibold",
              "bg-[var(--color-primary)] text-white",
              "hover:bg-[var(--color-primary-container)] transition-colors",
              "shadow-[var(--shadow-sm)]"
            )}
          >
            {voiceCopy.disclosureAgree}
          </button>
        </div>
      </Modal>
    </>
  );
}
