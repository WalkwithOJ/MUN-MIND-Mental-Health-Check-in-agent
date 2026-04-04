/**
 * POST /api/converse
 *
 * Handles an ongoing conversation turn. Same safety ordering as /checkin:
 *   1. Validate input (Zod)
 *   2. Run crisis detector FIRST, always
 *   3. If RED → deterministic red-tier response, no LLM call
 *   4. Else → routeConverse (Groq primary, Gemini fallback)
 *   5. Return { tier, reply, resources }
 *
 * History depth: the client sends up to MAX_HISTORY_MESSAGES turns, and the
 * router re-enforces the cap defensively. We validate a reasonable upper
 * bound here too so a malicious caller can't send a 10 MB history.
 */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { promptsConfig } from "@/lib/config";
import { detectCrisis } from "@/lib/crisis-detector";
import { getResourcesForTier } from "@/lib/escalation";
import { routeConverse, MAX_HISTORY_MESSAGES } from "@/lib/llm";
import {
  campusIdSchema,
  jsonError,
  logApiEvent,
  parseJsonBody,
} from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LEN = 4000;
const MAX_HISTORY_LEN_TRANSPORT = 20; // upper bound for transport; router caps to MAX_HISTORY_MESSAGES

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_LEN),
});

const requestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LEN),
  history: z.array(messageSchema).max(MAX_HISTORY_LEN_TRANSPORT),
  campus: campusIdSchema,
  /**
   * Current session tier from the client. The converse turn doesn't re-assess
   * — it echoes the session's existing tier back so the client keeps the
   * right resources visible. Red is always handled deterministically above,
   * so this field only matters for green/yellow. Defaults to yellow if the
   * client omits it.
   */
  sessionTier: z.enum(["green", "yellow"]).optional().default("yellow"),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;
  const { message, history, campus, sessionTier } = parsed.data;

  // 1. Crisis detection BEFORE any LLM call
  const detectedTier = detectCrisis(message);
  if (detectedTier === "red") {
    logApiEvent({
      route: "converse",
      tier: "red",
      status: 200,
      event: "crisis_detected",
    });
    return NextResponse.json({
      tier: "red" as const,
      reply: promptsConfig.red_tier_response.reply,
      resources: getResourcesForTier("red", campus),
      deterministic: true,
    });
  }

  // 2. Non-red: call the router. History is defensively capped inside the
  //    router and the adapters; we don't rely on the client to cap it.
  const capped = history.slice(-MAX_HISTORY_MESSAGES);
  let result: Awaited<ReturnType<typeof routeConverse>>;
  try {
    result = await routeConverse(capped, message);
  } catch {
    logApiEvent({
      route: "converse",
      status: 503,
      event: "error",
      errorCode: "llm_unexpected_throw",
    });
    return jsonError(503, "Service unavailable", { campus });
  }

  logApiEvent({
    route: "converse",
    tier: sessionTier,
    status: 200,
    event: result.degraded ? "degraded" : "ok",
  });

  return NextResponse.json({
    tier: sessionTier,
    reply: result.reply,
    resources: getResourcesForTier(sessionTier, campus),
    degraded: result.degraded,
  });
}
