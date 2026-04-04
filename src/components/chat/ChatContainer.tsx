"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useChat } from "@/hooks/useChat";

import copyJson from "@/config/copy.json";
import {
  type CampusId,
  getCampus,
  hasAcknowledgedPrivacy,
} from "@/lib/onboarding-storage";

import { ChatInput } from "./ChatInput";
import { CrisisBanner } from "./CrisisBanner";
import { MessageList } from "./MessageList";

interface CopyFile {
  chat: {
    greeting: string;
    disclaimer: string;
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
 * Read onboarding state synchronously via useSyncExternalStore. Returns null
 * server-side (first render always shows "Loading…") and the real values after
 * hydration. This avoids the set-state-in-effect pattern.
 */
function useOnboardingState(): {
  ok: boolean;
  campus: CampusId | null;
} {
  return useSyncExternalStore(
    subscribeNoop,
    () => {
      const acked = hasAcknowledgedPrivacy();
      const campus = getCampus();
      return { ok: acked && !!campus, campus: campus ?? null };
    },
    () => ({ ok: false, campus: null })
  );
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
  const { messages, tier, pending, sendMessage, selectMood, crisisResources } =
    useChat({ campus });

  return (
    <div className="flex-1 flex flex-col">
      {tier === "red" && <CrisisBanner resources={crisisResources} />}

      {/* Persistent micro-disclaimer above the chat */}
      <div className="max-w-[720px] w-full mx-auto px-4 pt-4">
        <p className="text-[11px] leading-4 text-[var(--color-text-muted)] text-center">
          {copy.disclaimer}
        </p>
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
    </div>
  );
}
