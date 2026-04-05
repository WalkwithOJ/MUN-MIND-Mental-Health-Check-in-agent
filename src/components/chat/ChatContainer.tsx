"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useChat } from "@/hooks/useChat";
import { useIdleTimer } from "@/hooks/useIdleTimer";

import copyJson from "@/config/copy.json";
import {
  type CampusId,
  getCampus,
  hasAcknowledgedPrivacy,
} from "@/lib/onboarding-storage";

import { ChatInput } from "./ChatInput";
import { CrisisBanner } from "./CrisisBanner";
import { MessageList } from "./MessageList";
import { SessionSummaryModal } from "./SessionSummaryModal";
import { SessionTimeoutModal } from "./SessionTimeoutModal";

// 30 minutes — gentle nudge for students who walked away mid-conversation.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface CopyFile {
  chat: {
    greeting: string;
    disclaimer: string;
    endSession: string;
  };
}

const copy = (copyJson as unknown as CopyFile).chat;

/**
 * Top-level chat orchestrator.
 *
 * Guards:
 *   - Redirects to / if privacy not acknowledged or campus not selected.
 *     These conditions should only happen if a student opens /chat directly
 *     (deep link) without going through onboarding.
 *   - Reads campus from sessionStorage and passes it to useChat for
 *     client-side resource filtering.
 *
 * Renders:
 *   - Crisis banner at top when tier === red
 *   - Message list (scrolling)
 *   - Chat input (sticky bottom)
 */
const subscribeNoop = () => () => {};

/**
 * useSyncExternalStore requires getSnapshot to return a STABLE reference when
 * the underlying value hasn't changed — otherwise React detects a new object
 * on every render and fires an infinite loop ("The result of getSnapshot
 * should be cached to avoid an infinite loop").
 *
 * We cache the last snapshot in module-scope closures per instance. Because
 * the onboarding state is a process-wide singleton (sessionStorage), we can
 * safely memoize at module level.
 */
interface OnboardingSnapshot {
  ok: boolean;
  campus: CampusId | null;
}

const serverSnapshot: OnboardingSnapshot = { ok: false, campus: null };
let cachedClientSnapshot: OnboardingSnapshot = { ok: false, campus: null };

function getClientSnapshot(): OnboardingSnapshot {
  const acked = hasAcknowledgedPrivacy();
  const campus = getCampus() ?? null;
  const ok = acked && !!campus;
  if (
    cachedClientSnapshot.ok === ok &&
    cachedClientSnapshot.campus === campus
  ) {
    return cachedClientSnapshot;
  }
  cachedClientSnapshot = { ok, campus };
  return cachedClientSnapshot;
}

function getServerSnapshot(): OnboardingSnapshot {
  return serverSnapshot;
}

function useOnboardingState(): OnboardingSnapshot {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
}

export function ChatContainer() {
  const router = useRouter();
  const { ok, campus } = useOnboardingState();

  // If the student lands on /chat without completing onboarding, bounce them
  // back to the landing page. This only fires client-side after hydration.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasAcknowledgedPrivacy() || !getCampus()) {
      router.replace("/");
    }
  }, [router]);

  if (!ok || !campus) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px] text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return <ChatUI campus={campus} />;
}

function ChatUI({ campus }: { campus: CampusId }) {
  const router = useRouter();
  const {
    messages,
    tier,
    pending,
    sendMessage,
    selectMood,
    crisisResources,
    sessionSummary,
  } = useChat({ campus });
  const [showSummary, setShowSummary] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);

  // Idle nudge — pause while a modal is open so the nudge doesn't fire
  // while the student is reading the summary they just opened.
  useIdleTimer({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: () => setShowTimeout(true),
    paused: showSummary || showTimeout,
  });

  function handleEndSession() {
    setShowSummary(true);
  }

  function handleCloseSession() {
    // Navigate home. In-memory chat state is discarded by unmount; onboarding
    // state stays in sessionStorage so a follow-up check-in in the same tab
    // skips the privacy + campus gates.
    setShowSummary(false);
    router.push("/");
  }

  function handleContinueSession() {
    setShowSummary(false);
  }

  return (
    <div className="flex-1 flex flex-col">
      {tier === "red" && <CrisisBanner resources={crisisResources} />}

      {/* Chat header row — back link + end session */}
      <div className="max-w-[720px] w-full mx-auto px-4 pt-4 flex items-center justify-between">
        <p className="text-[11px] leading-4 text-[var(--color-text-muted)]">
          {copy.disclaimer}
        </p>
        <button
          type="button"
          onClick={handleEndSession}
          className="text-[12px] font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-primary-container)] transition-colors min-h-[32px] px-2"
        >
          {copy.endSession}
        </button>
      </div>

      {/* Bot greeting card (always visible above the message list) */}
      {messages.length === 0 && (
        <div className="max-w-[720px] w-full mx-auto px-4 pt-6">
          <div className="bg-[var(--color-secondary-container)] rounded-[16px] p-5">
            <p className="text-[14px] leading-5 text-[var(--color-text-body)]">
              {copy.greeting}
            </p>
          </div>
        </div>
      )}

      <MessageList
        messages={messages}
        pending={pending}
        onMoodSelect={selectMood}
      />

      <div className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border-strong)]">
        <div className="max-w-[720px] mx-auto px-4 py-4">
          <ChatInput onSend={sendMessage} disabled={pending} />
        </div>
      </div>

      <SessionTimeoutModal
        open={showTimeout}
        onContinue={() => setShowTimeout(false)}
      />
      <SessionSummaryModal
        open={showSummary}
        summary={sessionSummary}
        onContinue={handleContinueSession}
        onClose={handleCloseSession}
      />
    </div>
  );
}
