/**
 * Gemini 2.5 Pro adapter (primary for `assess`).
 *
 * NO LOGGING RULE: Never log `input`, `reply`, or response body. Only log:
 * provider name, HTTP status, error code, tier, timestamp.
 *
 * Uses Google AI Studio's generateContent endpoint. Structured JSON responses
 * are requested via `responseMimeType: "application/json"` — the system prompt
 * instructs the model on the schema.
 */

import "server-only";

import { z } from "zod";

import { promptsConfig } from "@/lib/config";

import { LLMError } from "./errors";
import { classifyHttpError, LLM_TIMEOUT_MS, stripJsonFences } from "./http";
import {
  type AssessmentResult,
  type ConversationResult,
  type LLMProvider,
  type Message,
  type MoodScore,
} from "./types";
import { MAX_HISTORY_MESSAGES } from "./history";

const GEMINI_MODEL = "gemini-2.5-pro";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Structured response schema — validated at runtime so a misbehaving model
// can't inject unexpected shapes into the rest of the app.
const assessResponseSchema = z.object({
  reply: z.string().min(1),
  moodScore: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  tier: z.enum(["green", "yellow"]),
  topicTags: z.array(z.string()).max(3),
});

export class GeminiAdapter implements LLMProvider {
  readonly name = "gemini";
  private readonly apiKey: string;

  constructor(apiKey: string | undefined = process.env.GOOGLE_AI_STUDIO_API_KEY) {
    if (!apiKey) {
      throw new LLMError(
        "gemini",
        "auth",
        "GOOGLE_AI_STUDIO_API_KEY is not set"
      );
    }
    this.apiKey = apiKey;
  }

  async assess(input: string): Promise<AssessmentResult> {
    const body = {
      systemInstruction: {
        parts: [{ text: promptsConfig.assess_system_prompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    };

    const response = await this.post(body);
    const text = extractText(response);
    const parsed = safeParseJson(text);
    const validated = assessResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new LLMError(
        "gemini",
        "parse",
        "Gemini returned an assessment response that did not match the expected schema"
      );
    }
    return {
      reply: validated.data.reply,
      moodScore: validated.data.moodScore as MoodScore,
      tier: validated.data.tier,
      topicTags: validated.data.topicTags,
      degraded: false,
    };
  }

  async converse(
    history: Message[],
    input: string
  ): Promise<ConversationResult> {
    // Defense-in-depth: router caps history before calling, but we also enforce
    // here so a direct adapter call (bypassing the router) can't exceed the cap.
    const capped = history.slice(-MAX_HISTORY_MESSAGES);
    // Map our Message shape to Gemini's role naming.
    const contents = [
      ...capped.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: input }] },
    ];

    const body = {
      systemInstruction: {
        parts: [{ text: promptsConfig.converse_system_prompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
      },
    };

    const response = await this.post(body);
    const reply = extractText(response).trim();
    if (!reply) {
      throw new LLMError("gemini", "parse", "Gemini returned an empty reply");
    }
    return { reply, degraded: false };
  }

  private async post(body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw classifyHttpError("gemini", res.status);
      }
      return await res.json();
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if ((err as Error)?.name === "AbortError") {
        throw new LLMError("gemini", "network", "Gemini request timed out");
      }
      throw new LLMError("gemini", "network", "Gemini network error");
    } finally {
      clearTimeout(timeout);
    }
  }
}

// --- helpers ---

function extractText(response: unknown): string {
  // Defensive: response shape from Gemini is
  // { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  const r = response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = r?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new LLMError("gemini", "parse", "Gemini response missing text");
  }
  return text;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    throw new LLMError("gemini", "parse", "Gemini returned invalid JSON");
  }
}
