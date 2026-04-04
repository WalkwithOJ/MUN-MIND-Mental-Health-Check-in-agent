/**
 * Shared helpers for API routes.
 *
 * NO-LOGGING RULE: API route code must NEVER log `req.body.message`,
 * `req.body.history`, or any LLM response content. Only log: route name,
 * tier, error code, timestamp. This helper centralizes the safe log event
 * format so routes don't have to re-invent it.
 */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getResourcesForTier } from "@/lib/escalation";
import type { CrisisTier } from "@/lib/crisis-detector";

/**
 * Parse and validate a JSON request body against a Zod schema. On failure,
 * returns a 400 Response — no body content is echoed back (to avoid reflecting
 * potentially sensitive user input into server responses).
 */
export async function parseJsonBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: jsonError(400, "Invalid JSON body"),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(400, "Invalid request shape"),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Build an error response that includes fallback crisis resources, so the
 * UI can always show help lines even when the backend fails.
 *
 * Campus filtering happens client-side (sessionStorage only) — the server
 * never sees the student's campus selection, per docs/research-brief.md §4.3.
 */
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      fallbackResources: getResourcesForTier("red"),
    },
    { status }
  );
}

/**
 * Safe server-side log for API events. Only logs the typed event struct;
 * never message content. See docs/PRD.md §6 and tasks/todo.md Phase 6.
 */
export function logApiEvent(event: {
  route: string;
  tier?: CrisisTier;
  status: number;
  event: "ok" | "crisis_detected" | "error" | "degraded";
  errorCode?: string;
}) {
  console.info("[api]", JSON.stringify(event));
}

// Campus is never accepted in API request bodies. It is a quasi-identifier
// (see docs/research-brief.md §4.3) and stays in client-side sessionStorage
// only. Clients filter resource lists locally before rendering.
