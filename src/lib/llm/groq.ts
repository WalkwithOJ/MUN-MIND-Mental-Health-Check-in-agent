/**
 * Groq Llama 3.3 70B adapter.
 *
 * Primary provider for `converse()` (ongoing conversation turns).
 * Fallback provider for `assess()` when Gemini is rate-limited or unavailable —
 * uses a simplified prompt from prompts.json so the model can handle it within
 * a single-shot call.
 *
 * Uses Groq's OpenAI-compatible chat completions endpoint.
 *
 * NO LOGGING RULE: Never log input, history, reply, or response body.
 */

import "server-only";

import { z } from "zod";

import { promptsConfig } from "@/lib/config";

import { LLMError } from "./errors";
import { MAX_HISTORY_MESSAGES } from "./history";
import { classifyHttpError, LLM_TIMEOUT_MS, stripJsonFences } from "./http";
import {
  type AssessmentResult,
  type ConversationResult,
  type LLMProvider,
  type Message,
  type MoodScore,
} from "./types";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

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

export class GroqAdapter implements LLMProvider {
  readonly name = "groq";
  private readonly apiKey: string;

  constructor(apiKey: string | undefined = process.env.GROQ_API_KEY) {
    if (!apiKey) {
      throw new LLMError("groq", "auth", "GROQ_API_KEY is not set");
    }
    this.apiKey = apiKey;
  }

  /**
   * Used as a fallback when Gemini is unavailable. Uses the simplified
   * assess_fallback_prompt (shorter, more reliable for a smaller context).
   */
  async assess(input: string): Promise<AssessmentResult> {
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: promptsConfig.assess_fallback_prompt },
        { role: "user", content: input },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 512,
    };

    const response = await this.post(body);
    const text = extractText(response);
    const parsed = safeParseJson(text);
    const validated = assessResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new LLMError(
        "groq",
        "parse",
        "Groq returned an assessment response that did not match the expected schema"
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
    const messages = [
      { role: "system" as const, content: promptsConfig.converse_system_prompt },
      ...capped.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input },
    ];

    const body = {
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
    };

    const response = await this.post(body);
    const reply = extractText(response).trim();
    if (!reply) {
      throw new LLMError("groq", "parse", "Groq returned an empty reply");
    }
    return { reply, degraded: false };
  }

  private async post(body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw classifyHttpError("groq", res.status);
      }
      return await res.json();
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if ((err as Error)?.name === "AbortError") {
        throw new LLMError("groq", "network", "Groq request timed out");
      }
      throw new LLMError("groq", "network", "Groq network error");
    } finally {
      clearTimeout(timeout);
    }
  }
}

// --- helpers ---

function extractText(response: unknown): string {
  const r = response as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = r?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new LLMError("groq", "parse", "Groq response missing text");
  }
  return text;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    throw new LLMError("groq", "parse", "Groq returned invalid JSON");
  }
}
