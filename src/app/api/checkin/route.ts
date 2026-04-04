/**
 * POST /api/checkin
 *
 * Handles a student's first message in a session. The safety ordering is
 * non-negotiable and enforced here:
 *
 *   1. Validate input (Zod)
 *   2. Run crisis detector (deterministic, no LLM)
 *   3. If RED  → return deterministic red-tier response, never call the LLM
 *   4. If NOT RED → create anonymous session, call routeAssess (Gemini → Groq fallback)
 *   5. Persist mood entry only if moodScore is non-null (skip degraded path)
 *   6. Return { sessionId, tier, moodScore, reply, resources }
 *
 * NO LOGGING RULE: Never log req.body.message, the LLM response, or any
 * conversation content. Only log: route name, tier, error code.
 */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { promptsConfig } from "@/lib/config";
import { detectCrisis } from "@/lib/crisis-detector";
import { getResourcesForTier } from "@/lib/escalation";
import { routeAssess } from "@/lib/llm";
import { createSession, insertMoodEntry } from "@/lib/supabase";
import {
  campusIdSchema,
  jsonError,
  logApiEvent,
  parseJsonBody,
} from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LEN = 4000;

const requestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LEN),
  campus: campusIdSchema,
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;
  const { message, campus } = parsed.data;

  // 1. Crisis detection runs FIRST, always. No LLM call if Red.
  const detectedTier = detectCrisis(message);
  if (detectedTier === "red") {
    logApiEvent({
      route: "checkin",
      tier: "red",
      status: 200,
      event: "crisis_detected",
    });
    // Do NOT create a session row for the deterministic red path — we don't
    // want per-crisis-event rows accumulating if this becomes a common pattern,
    // and we don't need one (mood score is skipped). If the client continues
    // the conversation after Red, /converse will create a session lazily.
    return NextResponse.json({
      sessionId: null,
      tier: "red" as const,
      moodScore: null,
      reply: promptsConfig.red_tier_response.reply,
      resources: getResourcesForTier("red", campus),
      deterministic: true,
    });
  }

  // 2. Non-red: create an anonymous session row, then call the LLM router.
  let sessionId: string;
  try {
    sessionId = await createSession();
  } catch {
    logApiEvent({
      route: "checkin",
      status: 503,
      event: "error",
      errorCode: "db_session_create_failed",
    });
    return jsonError(503, "Could not start session", { campus });
  }

  let assessment: Awaited<ReturnType<typeof routeAssess>>;
  try {
    assessment = await routeAssess(message);
  } catch {
    // routeAssess is documented as "never throws" but we guard against
    // unexpected construction or import errors. Always return crisis resources.
    logApiEvent({
      route: "checkin",
      status: 503,
      event: "error",
      errorCode: "llm_unexpected_throw",
    });
    return jsonError(503, "Service unavailable", { campus });
  }

  // 3. Persist mood only if non-null (degraded path returns null and we
  //    don't want to corrupt analytics with fabricated scores).
  try {
    await insertMoodEntry(sessionId, assessment.moodScore);
  } catch {
    // Don't fail the whole request on a telemetry write — log and continue.
    logApiEvent({
      route: "checkin",
      status: 200,
      event: "error",
      errorCode: "db_mood_insert_failed",
    });
  }

  logApiEvent({
    route: "checkin",
    tier: assessment.tier,
    status: 200,
    event: assessment.degraded ? "degraded" : "ok",
  });

  return NextResponse.json({
    sessionId,
    tier: assessment.tier,
    moodScore: assessment.moodScore,
    reply: assessment.reply,
    topicTags: assessment.topicTags,
    resources: getResourcesForTier(assessment.tier, campus),
    degraded: assessment.degraded,
  });
}
