/**
 * Conversation history constants and the `capHistory` helper.
 * Kept in its own file so both the router and the adapters can depend on it
 * without creating a circular import.
 */

import type { Message } from "./types";

/** Max conversation turns sent to the LLM. One turn = user + assistant message = 2 messages. */
export const MAX_HISTORY_TURNS = 3;
export const MAX_HISTORY_MESSAGES = MAX_HISTORY_TURNS * 2;

/**
 * Cap conversation history to the last MAX_HISTORY_MESSAGES entries.
 * Preserves the most recent messages (tail of the array).
 */
export function capHistory(history: Message[]): Message[] {
  if (history.length <= MAX_HISTORY_MESSAGES) return history;
  return history.slice(-MAX_HISTORY_MESSAGES);
}
