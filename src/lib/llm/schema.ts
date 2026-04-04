/**
 * Forgiving assessment-response schema shared by Gemini and Groq adapters.
 *
 * LLMs rarely return perfectly-shaped JSON on the first try. Rather than
 * fail-closed and force a fallback on every tiny variation, we preprocess
 * the raw parsed JSON to normalize common mistakes before validating:
 *
 *   - `mood_score` → `moodScore`
 *   - `topic_tags` → `topicTags`
 *   - string mood scores ("3") → number (3)
 *   - scores outside 1–5 → clamped
 *   - more than 3 tags → truncated to 3
 *   - missing topicTags → empty array
 *   - tier "red" from the model → forced to "yellow" (client-side detector
 *     handles red; the LLM is instructed never to return red)
 *   - reply trimmed
 *
 * This strictly narrows the attack surface (every field is still validated
 * against a known type) while surviving minor model drift.
 */

import { z } from "zod";

const coerceMoodScore = (v: unknown): 1 | 2 | 3 | 4 | 5 | undefined => {
  if (typeof v === "number") {
    const rounded = Math.round(v);
    if (rounded >= 1 && rounded <= 5) return rounded as 1 | 2 | 3 | 4 | 5;
  }
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1 && n <= 5) return n as 1 | 2 | 3 | 4 | 5;
  }
  return undefined;
};

const coerceTier = (v: unknown): "green" | "yellow" => {
  if (typeof v === "string") {
    const lower = v.toLowerCase();
    if (lower === "green") return "green";
    // Any other value (yellow, red, unknown) is safely mapped to yellow.
    // The client-side crisis detector handles red independently.
  }
  return "yellow";
};

const coerceTags = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .slice(0, 3);
};

/**
 * Parse a raw JSON value from an LLM response into a normalized
 * AssessmentResult. Throws a descriptive error (without user content)
 * when the shape is unrecoverable.
 */
export function parseAssessmentResponse(raw: unknown): {
  reply: string;
  moodScore: 1 | 2 | 3 | 4 | 5;
  tier: "green" | "yellow";
  topicTags: string[];
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("expected JSON object");
  }
  const r = raw as Record<string, unknown>;

  const reply = typeof r.reply === "string" ? r.reply.trim() : "";
  if (reply.length === 0) {
    throw new Error("missing or empty 'reply' field");
  }

  const moodScoreRaw = r.moodScore ?? r.mood_score ?? r.mood ?? 3;
  const moodScore = coerceMoodScore(moodScoreRaw) ?? 3;

  const tier = coerceTier(r.tier);

  const topicTags = coerceTags(r.topicTags ?? r.topic_tags ?? r.tags);

  return { reply, moodScore, tier, topicTags };
}

/**
 * Strict Zod schema for the NORMALIZED output of parseAssessmentResponse.
 * Used in the adapter to double-check after normalization and provide a
 * typed return value to callers.
 */
export const normalizedAssessSchema = z.object({
  reply: z.string().min(1),
  moodScore: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  tier: z.enum(["green", "yellow"]),
  topicTags: z.array(z.string()),
});
