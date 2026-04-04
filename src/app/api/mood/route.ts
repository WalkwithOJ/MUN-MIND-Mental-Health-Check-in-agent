/**
 * POST /api/mood
 *
 * Records a manual mood entry from the inline mood widget (separate from
 * the LLM-derived score in /checkin). The request must carry a sessionId
 * obtained from an earlier /checkin response.
 *
 * Returns 204 No Content on success — no body to leak.
 */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { insertMoodEntry } from "@/lib/supabase";
import { jsonError, logApiEvent, parseJsonBody } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Campus is NEVER accepted here — it's a quasi-identifier and stays client-side.
const requestSchema = z.object({
  sessionId: z.string().uuid(),
  moodScore: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;
  const { sessionId, moodScore } = parsed.data;

  try {
    await insertMoodEntry(sessionId, moodScore);
  } catch {
    logApiEvent({
      route: "mood",
      status: 503,
      event: "error",
      errorCode: "db_mood_insert_failed",
    });
    return jsonError(503, "Could not record mood");
  }

  logApiEvent({
    route: "mood",
    status: 204,
    event: "ok",
  });
  return new NextResponse(null, { status: 204 });
}
