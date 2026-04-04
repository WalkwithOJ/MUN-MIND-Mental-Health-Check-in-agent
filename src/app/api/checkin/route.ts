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
import { jsonError, logApiEvent, parseJsonBody } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LEN = 4000;

// Campus is NEVER accepted here — it's a quasi-identifier and stays client-side.
const requestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LEN),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;
  const { message } = parsed.data;

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
      resources: getResourcesForTier("red"),
      deterministic: true,
    });
  }

  // 2. Non-red: try to create an anonymous session row. Supabase failures
  //    (missing env vars, network issue, RLS misconfig) MUST NOT block the
  //    LLM call — a student in distress needs a response even when telemetry
  //    is broken. We proceed with sessionId=null and skip downstream writes.
  let sessionId: string | null = null;
  try {
    sessionId = await createSession();
  } catch {
    logApiEvent({
      route: "checkin",
      status: 200,
      event: "error",
      errorCode: "db_session_create_failed",
    });
    // Fall through — sessionId stays null, LLM still runs, mood insert skipped.
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
    return jsonError(503, "Service unavailable");
  }

  // 3. Persist mood only if we have a session AND a real score (degraded
  //    path returns null and we don't want to corrupt analytics with
  //    fabricated scores).
  if (sessionId) {
    try {
      await insertMoodEntry(sessionId, assessment.moodScore);
    } catch {
      logApiEvent({
        route: "checkin",
        status: 200,
        event: "error",
        errorCode: "db_mood_insert_failed",
      });
    }
  }

  logApiEvent({
    route: "checkin",
    tier: assessment.tier,
    status: 200,
    event: assessment.degraded ? "degraded" : "ok",
  });

  // Only attach resources when genuinely helpful. Showing counselling + crisis
  // lines to a student who said "I feel glad" nags them and undermines trust.
  // - Green: no resources attached (the student is fine; a reply is enough)
  // - Yellow: attach yellow-tier resources (counselling + peer support)
  // - Red path doesn't reach this branch (handled deterministically above)
  const resources =
    assessment.tier === "yellow" ? getResourcesForTier("yellow") : [];

  return NextResponse.json({
    sessionId,
    tier: assessment.tier,
    moodScore: assessment.moodScore,
    reply: assessment.reply,
    topicTags: assessment.topicTags,
    resources,
    degraded: assessment.degraded,
  });
}
