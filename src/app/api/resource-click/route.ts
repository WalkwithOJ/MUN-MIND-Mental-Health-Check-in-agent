/**
 * POST /api/resource-click
 *
 * Records an anonymized resource click. The client sends the opaque
 * resource id (from resources.json) and the tier under which it was
 * surfaced. Used by the admin dashboard for aggregate click-through metrics.
 *
 * Returns 204 on success. Never reflects the resource_key back.
 */

import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getResourceById } from "@/lib/escalation";
import { insertResourceClick } from "@/lib/supabase";
import { jsonError, logApiEvent, parseJsonBody } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  resourceKey: z
    .string()
    .regex(/^[a-z0-9_-]{1,64}$/, "resourceKey must be snake_case, ≤64 chars"),
  tier: z.enum(["green", "yellow", "red"]),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;
  const { sessionId, resourceKey, tier } = parsed.data;

  // Reject unknown resource keys — prevents writing arbitrary strings to DB
  // even if they pass the regex.
  const resource = getResourceById(resourceKey);
  if (!resource) {
    logApiEvent({
      route: "resource-click",
      status: 400,
      event: "error",
      errorCode: "unknown_resource_key",
    });
    return jsonError(400, "Unknown resource");
  }

  // Cross-check: a resource can only be clicked under a tier it's tagged with.
  // Prevents analytics poisoning (e.g., recording a click on a self-help app
  // under the "red" tier to inflate crisis-escalation statistics).
  if (!resource.tiers.includes(tier)) {
    logApiEvent({
      route: "resource-click",
      status: 400,
      event: "error",
      errorCode: "tier_mismatch",
    });
    return jsonError(400, "Tier mismatch for resource");
  }

  try {
    await insertResourceClick(sessionId, resourceKey, tier);
  } catch {
    logApiEvent({
      route: "resource-click",
      status: 503,
      event: "error",
      errorCode: "db_click_insert_failed",
    });
    return jsonError(503, "Could not record click");
  }

  logApiEvent({
    route: "resource-click",
    tier,
    status: 204,
    event: "ok",
  });
  return new NextResponse(null, { status: 204 });
}
