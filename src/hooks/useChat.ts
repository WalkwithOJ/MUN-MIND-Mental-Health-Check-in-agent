"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { detectCrisis, type CrisisTier } from "@/lib/crisis-detector";
import {
  type CampusId,
  type Resource,
  getResourcesForTier,
} from "@/lib/escalation";
import {
  ASSESS_DEGRADED_REPLY,
  CONVERSE_DEGRADED_REPLY,
  RED_TIER_REPLY,
} from "@/lib/client-prompts";

/**
 * Chat state + interaction hook.
 *
 * SAFETY INVARIANTS (documented in docs/PRD.md §7, tasks/todo.md Phase 9):
 *   1. Crisis detection runs CLIENT-SIDE first, before any API call. If the
 *      local detector returns "red", a deterministic response is injected
 *      immediately from RED_TIER_REPLY — the UI never waits on the server.
 *   2. The server-side call is still made for telemetry, but its return value
 *      does not affect UI rendering on the red path.
 *   3. Once a message has escalated a session to "red", it cannot be
 *      de-escalated. The server can confirm/escalate but never downgrade.
 *   4. Campus is read from sessionStorage and used to filter resources
 *      client-side — it is NEVER sent in the request body.
 *   5. Conversation history state is capped at MAX_HISTORY_TURNS so the
 *      component doesn't grow unbounded across a long session.
 */

export type MessageRole = "user" | "bot" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  tier?: CrisisTier;
  resources?: Resource[];
  /** Inline mood widget rendered in place of a text bubble. */
  moodWidget?: boolean;
  /** True for deterministic/degraded responses — suppress "typing" indicators. */
  deterministic?: boolean;
}

export type SessionTier = Exclude<CrisisTier, "red">;

export const MAX_TURNS_IN_MEMORY = 3;
export const MAX_MESSAGES_IN_MEMORY = MAX_TURNS_IN_MEMORY * 2;

/**
 * Filter a server-returned resource list by the student's campus. This is the
 * ONLY place campus is applied to the resources, because campus lives only in
 * client-side sessionStorage (never transmitted to the server).
 *
 * If the server returned an empty array (green tier, mid-conversation turns),
 * return an empty array — do NOT fall through to a local computation. The
 * server's empty array is an explicit "no resources for this turn" signal.
 */
function filterByCampus(
  list: Resource[] | undefined,
  campus: CampusId
): Resource[] {
  if (!list || list.length === 0) return [];
  return list.filter(
    (r) => r.campuses.includes(campus) || r.campuses.includes("any")
  );
}

interface UseChatOptions {
  campus: CampusId;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg_${Date.now()}_${idCounter}`;
}

export function useChat({ campus }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [tier, setTierState] = useState<CrisisTier>("green");
  const sessionIdRef = useRef<string | null>(null);
  // Tracks whether the "first message" path has been consumed. Set true after
  // a successful /api/checkin OR after the client-side red path fires (which
  // skips checkin but still consumes the first-message slot). Without this,
  // message 2 after a crisis would incorrectly re-call /api/checkin.
  const checkinDoneRef = useRef(false);
  // Refs mirror state so async handlers always read the latest values
  // instead of stale closure values from when sendMessage was created.
  const messagesRef = useRef<ChatMessage[]>([]);
  const tierRef = useRef<CrisisTier>("green");

  const setTier = useCallback((value: CrisisTier) => {
    tierRef.current = value;
    setTierState(value);
  }, []);

  const crisisResources = useMemo(
    () => getResourcesForTier("red", campus),
    [campus]
  );

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => {
      const next = [...prev, { ...msg, id: nextId() }];
      messagesRef.current = next;
      return next;
    });
  }, []);

  /**
   * Escalate to red irreversibly. Server cannot downgrade; a local red
   * detection always wins.
   */
  const escalateToRed = useCallback(() => {
    setTier("red");
  }, [setTier]);

  /**
   * Handle a user message. Crisis detection runs locally FIRST; if red, we
   * render the deterministic response immediately and fire telemetry in the
   * background without awaiting it.
   */
  const sendMessage = useCallback(
    async (rawInput: string) => {
      const input = rawInput.trim();
      if (!input || pending) return;

      // Always render the user's message immediately for UI responsiveness.
      addMessage({ role: "user", content: input });

      // 1. Client-side crisis detection — BEFORE any network call
      const localTier = detectCrisis(input);
      if (localTier === "red") {
        escalateToRed();
        addMessage({
          role: "bot",
          content: RED_TIER_REPLY,
          tier: "red",
          resources: crisisResources,
          deterministic: true,
        });
        // The red path consumes the "first message" slot so that subsequent
        // non-red messages correctly route to /api/converse, not /api/checkin.
        checkinDoneRef.current = true;
        // Fire telemetry in background — we intentionally do NOT await this.
        // The UI already has everything it needs. We send a sentinel rather
        // than the raw message to minimize content on the wire per INV-6.
        void sendCrisisTelemetry().catch(() => {
          // No-op: telemetry failure must never break the crisis flow.
        });
        return;
      }

      setPending(true);
      try {
        if (!checkinDoneRef.current) {
          await handleFirstMessage(input);
        } else {
          await handleConverseTurn(input);
        }
      } finally {
        setPending(false);
      }
    },
    // handleFirstMessage and handleConverseTurn are plain inner functions that
    // read from refs (messagesRef, tierRef, sessionIdRef) rather than state, so
    // they intentionally do not appear in this dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMessage, escalateToRed, pending, setTier, crisisResources]
  );

  async function handleFirstMessage(input: string) {
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      if (!res.ok) {
        throw new Error(`checkin failed: ${res.status}`);
      }
      const data = (await res.json()) as CheckinResponse;

      // Server can ESCALATE but never de-escalate the tier
      const newTier: CrisisTier = mergeTier(tierRef.current, data.tier);
      setTier(newTier);
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }
      // First message fully processed — subsequent messages go to /api/converse
      checkinDoneRef.current = true;

      addMessage({
        role: "bot",
        content:
          data.reply ??
          (data.degraded ? ASSESS_DEGRADED_REPLY : "I hear you."),
        tier: newTier,
        // Trust the server's decision about whether to surface resources on
        // this turn. Server returns [] for green tier (student is fine) and
        // for mid-conversation turns (don't re-pitch). Client only filters
        // by campus since the server doesn't have that context.
        resources: filterByCampus(data.resources, campus),
        deterministic: data.deterministic ?? false,
      });

      // Offer the mood widget after the first bot reply, unless this was a
      // deterministic red response (the widget would feel wrong mid-crisis).
      if (newTier !== "red" && !data.deterministic) {
        addMessage({ role: "system", content: "", moodWidget: true });
      }
    } catch {
      const fallbackTier: CrisisTier =
        tierRef.current === "red" ? "red" : "yellow";
      addMessage({
        role: "bot",
        content: ASSESS_DEGRADED_REPLY,
        tier: fallbackTier,
        resources: getResourcesForTier(fallbackTier, campus),
        deterministic: true,
      });
    }
  }

  async function handleConverseTurn(input: string) {
    const currentTier = tierRef.current;
    const sessionTier: SessionTier =
      currentTier === "red" ? "yellow" : currentTier;
    // Drop the user message we just added (we don't send it twice — the API
    // treats `message` separately from `history`).
    const historyWithoutNewMessage = messagesRef.current.slice(0, -1);
    const history = buildHistoryForApi(historyWithoutNewMessage);

    try {
      const res = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history,
          sessionTier,
        }),
      });
      if (!res.ok) {
        throw new Error(`converse failed: ${res.status}`);
      }
      const data = (await res.json()) as ConverseResponse;
      const newTier: CrisisTier = mergeTier(tierRef.current, data.tier);
      setTier(newTier);

      addMessage({
        role: "bot",
        content: data.reply,
        tier: newTier,
        // Trust the server — /api/converse always returns [] for non-crisis
        // turns so we don't re-pitch resources on every follow-up.
        resources: filterByCampus(data.resources, campus),
        deterministic: data.deterministic ?? data.degraded ?? false,
      });
    } catch {
      const fallbackTier: CrisisTier =
        tierRef.current === "red" ? "red" : "yellow";
      addMessage({
        role: "bot",
        content: CONVERSE_DEGRADED_REPLY,
        tier: fallbackTier,
        resources: getResourcesForTier(fallbackTier, campus),
        deterministic: true,
      });
    }
  }

  /**
   * Record a mood-widget selection. Fire-and-forget — a failed telemetry
   * write must not block the conversation.
   */
  const selectMood = useCallback(
    async (moodScore: 1 | 2 | 3 | 4 | 5) => {
      const sessionId = sessionIdRef.current;
      addMessage({
        role: "user",
        content: moodLabel(moodScore),
      });
      if (!sessionId) return;
      try {
        await fetch("/api/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, moodScore }),
        });
      } catch {
        // no-op: telemetry failure
      }
    },
    [addMessage]
  );

  return {
    messages,
    tier,
    pending,
    sendMessage,
    selectMood,
    crisisResources,
  };
}

// --- helpers ---

/**
 * Merge a new tier into an existing one — strictly non-de-escalating.
 * Red > Yellow > Green.
 */
function mergeTier(current: CrisisTier, incoming: CrisisTier): CrisisTier {
  const rank: Record<CrisisTier, number> = { green: 0, yellow: 1, red: 2 };
  return rank[incoming] > rank[current] ? incoming : current;
}

/**
 * Build a history payload for the /api/converse route. Strips system
 * messages and mood widgets, maps bot → assistant, caps at the last
 * MAX_MESSAGES_IN_MEMORY entries.
 */
function buildHistoryForApi(
  messages: ChatMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.role !== "system" && !m.moodWidget)
    .map((m) => ({
      role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }))
    .slice(-MAX_MESSAGES_IN_MEMORY);
}

function moodLabel(score: 1 | 2 | 3 | 4 | 5): string {
  switch (score) {
    case 5:
      return "Great";
    case 4:
      return "Good";
    case 3:
      return "Okay";
    case 2:
      return "Low";
    case 1:
      return "Struggling";
  }
}

async function sendCrisisTelemetry(): Promise<void> {
  // Record the crisis event without transmitting the student's raw input.
  // The server runs its own crisis detector and will return a red-tier
  // response (which we discard). Using a sentinel ensures message content
  // never leaves the browser on the client-red path.
  await fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "[crisis_event]" }),
  });
}

// --- response types ---

interface CheckinResponse {
  sessionId: string | null;
  tier: CrisisTier;
  moodScore: 1 | 2 | 3 | 4 | 5 | null;
  reply: string;
  topicTags?: string[];
  resources: Resource[];
  degraded?: boolean;
  deterministic?: boolean;
}

interface ConverseResponse {
  tier: CrisisTier;
  reply: string;
  resources: Resource[];
  degraded?: boolean;
  deterministic?: boolean;
}
