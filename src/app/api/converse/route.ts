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
import {
  routeConverse,
  routeConverseStream,
  MAX_HISTORY_MESSAGES,
} from "@/lib/llm";
import { jsonError, logApiEvent, parseJsonBody } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LEN = 4000;
const MAX_HISTORY_LEN_TRANSPORT = 20; // upper bound for transport; router caps to MAX_HISTORY_MESSAGES

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_LEN),
});

// Campus is NEVER accepted here — it's a quasi-identifier and stays client-side.
const requestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LEN),
  history: z.array(messageSchema).max(MAX_HISTORY_LEN_TRANSPORT),
  /**
   * Current session tier from the client. The converse turn doesn't re-assess
   * — it echoes the session's existing tier back so the client keeps the
   * right resources visible. Red is always handled deterministically above,
   * so this field only matters for green/yellow. Defaults to yellow if the
   * client omits it.
   */
  sessionTier: z.enum(["green", "yellow"]).optional().default("yellow"),
  /**
   * When true, the response is a streaming NDJSON body (one JSON object per
   * line) instead of a single JSON response. The client opts in per-request
   * so the mood-select path can still use the non-streaming variant.
   */
  stream: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;
  const { message, history, sessionTier, stream } = parsed.data;

  // 1. Crisis detection BEFORE any LLM call — same for both streaming and
  //    non-streaming. Streaming does NOT bypass the safety layer.
  const detectedTier = detectCrisis(message);
  if (detectedTier === "red") {
    logApiEvent({
      route: "converse",
      tier: "red",
      status: 200,
      event: "crisis_detected",
    });
    // Red responses are always returned as a single JSON response, never
    // streamed — they are deterministic and the UI renders them atomically.
    return NextResponse.json({
      tier: "red" as const,
      reply: promptsConfig.red_tier_response.reply,
      resources: getResourcesForTier("red"),
      deterministic: true,
    });
  }

  const capped = history.slice(-MAX_HISTORY_MESSAGES);

  // 2a. Streaming branch — return NDJSON so the client can paint tokens live.
  if (stream) {
    return streamingResponse(capped, message, sessionTier);
  }

  // 2b. Non-streaming branch (used by the mood-select path and any client
  //     that opts out).
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
    return jsonError(503, "Service unavailable");
  }

  logApiEvent({
    route: "converse",
    tier: sessionTier,
    status: 200,
    event: result.degraded ? "degraded" : "ok",
  });

  // Don't re-pitch resources on every conversation turn. The /checkin response
  // already surfaced them once when the student entered a yellow state;
  // re-rendering them on every reply nags the student and erodes trust.
  // Crisis (red) is handled deterministically above and DOES always attach
  // resources; only the green/yellow converse path returns an empty list.
  return NextResponse.json({
    tier: sessionTier,
    reply: result.reply,
    resources: [],
    degraded: result.degraded,
  });
}

/**
 * Build an NDJSON streaming response. Each line is a complete JSON object:
 *
 *   {"type":"token","text":"Hello"}
 *   {"type":"token","text":" there"}
 *   {"type":"end","tier":"yellow","resources":[],"degraded":false}
 *
 * On any Groq error, emits a single degraded frame followed by the `end`
 * sentinel — the client renders the deterministic converse_degraded_response.
 */
function streamingResponse(
  history: Parameters<typeof routeConverseStream>[0],
  message: string,
  sessionTier: "green" | "yellow"
): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      let degraded = false;
      try {
        for await (const evt of routeConverseStream(history, message)) {
          if (evt.type === "degraded") {
            degraded = true;
            // Emit the deterministic fallback as one big token chunk so the
            // client's rendering path is identical to a normal stream.
            write({
              type: "token",
              text: promptsConfig.converse_degraded_response.reply,
            });
            continue;
          }
          if (evt.type === "token") {
            write(evt);
          }
          // "end" events from the router are terminal — we write our own
          // end frame below with the tier + resources sentinel.
        }
      } catch {
        // Unexpected error inside the stream iteration — emit degraded text
        // so the client always sees SOMETHING.
        degraded = true;
        write({
          type: "token",
          text: promptsConfig.converse_degraded_response.reply,
        });
      }

      logApiEvent({
        route: "converse",
        tier: sessionTier,
        status: 200,
        event: degraded ? "degraded" : "ok",
      });

      write({
        type: "end",
        tier: sessionTier,
        resources: [],
        degraded,
      });
      controller.close();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no", // disable nginx/proxy buffering if present
    },
  });
}
