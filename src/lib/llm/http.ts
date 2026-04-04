/**
 * Shared HTTP utilities for LLM adapters.
 * Kept in its own file so neither adapter imports from the other.
 */

import { LLMError } from "./errors";

/** Shared timeout for all LLM HTTP calls. */
export const LLM_TIMEOUT_MS = 15_000;

/**
 * Map an HTTP status code from an LLM provider to a typed LLMError.
 *
 * - 400 → `parse` (malformed request — a programming error, not transient)
 * - 401/403 → `auth`
 * - 429 → `rate_limit`
 * - 5xx → `server`
 * - everything else → `unknown`
 */
export function classifyHttpError(provider: string, status: number): LLMError {
  if (status === 400) {
    return new LLMError(provider, "parse", `${provider} bad request (400)`, status);
  }
  if (status === 401 || status === 403) {
    return new LLMError(provider, "auth", `${provider} auth failed`, status);
  }
  if (status === 429) {
    return new LLMError(provider, "rate_limit", `${provider} rate limited`, status);
  }
  if (status >= 500) {
    return new LLMError(provider, "server", `${provider} server error`, status);
  }
  return new LLMError(provider, "unknown", `${provider} HTTP ${status}`, status);
}

/**
 * Strip markdown code fences from a text that should be JSON.
 * Gemini/Groq occasionally wrap structured output in ```json ... ``` despite
 * `responseMimeType: "application/json"` / `response_format: { type: "json_object" }`.
 */
export function stripJsonFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}
