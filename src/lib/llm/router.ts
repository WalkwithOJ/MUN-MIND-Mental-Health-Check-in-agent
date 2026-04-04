/**
 * LLM router — routes requests to Gemini (primary) and Groq (fallback), and
 * enforces the project's hard safety invariants at the boundary:
 *
 *   1. Crisis detection ALWAYS runs before any LLM call. The router does NOT
 *      run detection itself (the API routes do that) — but the router is
 *      explicitly invoked only AFTER the detector returns non-red.
 *   2. Conversation history sent to LLMs is capped at the last MAX_HISTORY_TURNS
 *      turns (each "turn" = one user message + one assistant message).
 *   3. On double-failure (Gemini + Groq both fail), the router returns a
 *      deterministic degraded response from prompts.json — never an error
 *      bubble. A student never sees "something went wrong."
 *   4. NO LOGGING of input, history, reply, or any message content. Only log
 *      provider name, error type, HTTP status, and tier.
 */

import "server-only";

import { promptsConfig } from "@/lib/config";

import { LLMError } from "./errors";
import { GeminiAdapter } from "./gemini";
import { GroqAdapter } from "./groq";
import { capHistory, MAX_HISTORY_MESSAGES, MAX_HISTORY_TURNS } from "./history";
import {
  type AssessmentResult,
  type ConversationResult,
  type LLMProvider,
  type Message,
} from "./types";

export { capHistory, MAX_HISTORY_MESSAGES, MAX_HISTORY_TURNS };

/**
 * A safety-observability logger. Logs ONLY provider name, error type, HTTP
 * status, and tier. Never logs message content. This is the only place in the
 * llm/ tree where anything is logged to console.
 */
function logSafeEvent(event: {
  phase: "assess" | "converse" | "init";
  provider: string;
  outcome: "ok" | "fallback" | "degraded" | "missing";
  errorType?: string;
  status?: number;
}) {
  console.info("[llm]", JSON.stringify(event));
}

/**
 * Assess the initial check-in message. Tries Gemini first, falls back to Groq,
 * then to a deterministic response.
 *
 * This function NEVER throws. It always returns an AssessmentResult. The
 * degraded response has moodScore=null so the caller knows not to persist it.
 */
export async function routeAssess(
  input: string,
  providers?: { gemini?: LLMProvider; groq?: LLMProvider }
): Promise<AssessmentResult> {
  const gemini = providers?.gemini ?? tryCreate(() => new GeminiAdapter());
  const groq = providers?.groq ?? tryCreate(() => new GroqAdapter());

  // 1. Try Gemini
  if (gemini) {
    try {
      const result = await gemini.assess(input);
      logSafeEvent({
        phase: "assess",
        provider: "gemini",
        outcome: "ok",
      });
      return result;
    } catch (err) {
      const le = asLLMError(err, "gemini");
      logSafeEvent({
        phase: "assess",
        provider: "gemini",
        outcome: "fallback",
        errorType: le.type,
        status: le.status,
      });
      // Fall through to Groq
    }
  }

  // 2. Try Groq as fallback
  if (groq) {
    try {
      const result = await groq.assess(input);
      logSafeEvent({
        phase: "assess",
        provider: "groq",
        outcome: "ok",
      });
      return result;
    } catch (err) {
      const le = asLLMError(err, "groq");
      logSafeEvent({
        phase: "assess",
        provider: "groq",
        outcome: "degraded",
        errorType: le.type,
        status: le.status,
      });
    }
  }

  // 3. Deterministic degraded response — never throws to the caller.
  // moodScore is null here; callers (Phase 6 API route) MUST check for null
  // and skip the Supabase mood_entries insert. See INV on null discriminant.
  const degraded = promptsConfig.assess_degraded_response;
  return {
    reply: degraded.reply,
    moodScore: degraded.moodScore,
    tier: degraded.tier,
    topicTags: degraded.topicTags,
    degraded: true,
  };
}

/**
 * Route a conversation turn. Primary: Groq. Fallback: Gemini.
 * Enforces the MAX_HISTORY_TURNS cap before dispatching.
 *
 * NEVER throws. On total failure, returns a deterministic degraded reply.
 */
export async function routeConverse(
  history: Message[],
  input: string,
  providers?: { gemini?: LLMProvider; groq?: LLMProvider }
): Promise<ConversationResult> {
  const cappedHistory = capHistory(history);
  const groq = providers?.groq ?? tryCreate(() => new GroqAdapter());
  const gemini = providers?.gemini ?? tryCreate(() => new GeminiAdapter());

  // 1. Try Groq (primary for conversation — generous free tier)
  if (groq) {
    try {
      const result = await groq.converse(cappedHistory, input);
      logSafeEvent({
        phase: "converse",
        provider: "groq",
        outcome: "ok",
      });
      return result;
    } catch (err) {
      const le = asLLMError(err, "groq");
      logSafeEvent({
        phase: "converse",
        provider: "groq",
        outcome: "fallback",
        errorType: le.type,
        status: le.status,
      });
    }
  }

  // 2. Fall back to Gemini
  if (gemini) {
    try {
      const result = await gemini.converse(cappedHistory, input);
      logSafeEvent({
        phase: "converse",
        provider: "gemini",
        outcome: "ok",
      });
      return result;
    } catch (err) {
      const le = asLLMError(err, "gemini");
      logSafeEvent({
        phase: "converse",
        provider: "gemini",
        outcome: "degraded",
        errorType: le.type,
        status: le.status,
      });
    }
  }

  // 3. Deterministic degraded reply. Uses the dedicated converse_degraded_response
  // so mid-conversation tone stays coherent (not the assess-initial-message degraded copy).
  return {
    reply: promptsConfig.converse_degraded_response.reply,
    degraded: true,
  };
}

// --- helpers ---

function tryCreate<T>(factory: () => T): T | undefined {
  try {
    return factory();
  } catch (err) {
    // Missing API key or other construction failure — fall through to next provider.
    // Log the failure so a missing env var doesn't silently degrade every request.
    const type = err instanceof LLMError ? err.type : "unknown";
    const provider = err instanceof LLMError ? err.provider : "unknown";
    logSafeEvent({
      phase: "init",
      provider,
      outcome: "missing",
      errorType: type,
    });
    return undefined;
  }
}

function asLLMError(err: unknown, provider: string): LLMError {
  if (err instanceof LLMError) return err;
  return new LLMError(provider, "unknown", "Unknown LLM error");
}
