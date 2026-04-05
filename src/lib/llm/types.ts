/**
 * LLM provider interface and shared types.
 *
 * Both Gemini and Groq implement `LLMProvider` so the router can swap them
 * with one env-var change. This is documented in docs/PRD.md §6.
 *
 * NO LOGGING RULE (safety-critical):
 *   Every file in src/lib/llm/ must NEVER log `input`, `history`, `reply`,
 *   or any message content. Only log: provider name, HTTP status, error code,
 *   tier, timestamp. See docs/tasks/todo.md Phase 4.
 */

import type { CrisisTier } from "@/lib/crisis-detector";

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

/** Non-red tier — the crisis detector runs before any LLM call and handles red. */
export type AssessTier = Exclude<CrisisTier, "red">;

export interface AssessmentResult {
  tier: AssessTier;
  /**
   * Mood score on a 1–5 scale, or null when the response is a degraded
   * fallback (both LLM providers failed). Callers (Phase 6 API route) MUST
   * check for null and skip the Supabase mood_entries insert.
   */
  moodScore: MoodScore | null;
  reply: string;
  topicTags: string[];
  /**
   * True when the response is a deterministic fallback from prompts.json
   * (both providers failed). Lets callers branch without relying on
   * `moodScore === null` as an implicit discriminant.
   */
  degraded: boolean;
}

export interface ConversationResult {
  reply: string;
  degraded: boolean;
}

/**
 * Incremental token events emitted by a streaming conversation call.
 * Providers yield `{type: "token", text}` for each chunk, then a final
 * `{type: "end"}` sentinel. `{type: "error"}` terminates the stream early —
 * callers MUST treat this as a signal to fall back to the non-streaming
 * degraded reply (the router handles this automatically).
 */
export type ConversationStreamEvent =
  | { type: "token"; text: string }
  | { type: "end" }
  | { type: "error"; errorType: string };

export interface LLMProvider {
  name: string;
  assess(input: string): Promise<AssessmentResult>;
  converse(history: Message[], input: string): Promise<ConversationResult>;
  /**
   * Optional streaming variant of `converse`. Providers that don't implement
   * this get a non-streaming fallback at the router layer. Gemini's streaming
   * is not exposed here — Groq is the only primary converse path, so only
   * Groq implements this method.
   */
  converseStream?(
    history: Message[],
    input: string
  ): AsyncIterable<ConversationStreamEvent>;
}

// Re-export error types from the client-safe errors module
export { LLMError } from "./errors";
export type { LLMErrorType } from "./errors";
