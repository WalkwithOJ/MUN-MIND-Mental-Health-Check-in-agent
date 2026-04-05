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

import { promptsConfig } from "@/lib/config";

import { LLMError } from "./errors";
import { MAX_HISTORY_MESSAGES } from "./history";
import { classifyHttpError, LLM_TIMEOUT_MS, stripJsonFences } from "./http";
import { parseAssessmentResponse } from "./schema";
import {
  type AssessmentResult,
  type ConversationResult,
  type ConversationStreamEvent,
  type LLMProvider,
  type Message,
} from "./types";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

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
    try {
      const normalized = parseAssessmentResponse(parsed);
      return { ...normalized, degraded: false };
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown";
      throw new LLMError(
        "groq",
        "parse",
        `Groq response shape mismatch: ${detail}`
      );
    }
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

  /**
   * Streaming variant of `converse`. Uses Groq's OpenAI-compatible SSE
   * streaming format (`data: {json}\n\n` frames, terminated by
   * `data: [DONE]`). Yields token events as they arrive, then a single
   * `end` event.
   *
   * If an error occurs mid-stream, yields an `error` event and terminates.
   * The router will fall back to the non-streaming degraded response.
   *
   * NO LOGGING RULE: never log tokens or assembled text. Only errors with
   * provider + status.
   */
  async *converseStream(
    history: Message[],
    input: string
  ): AsyncIterable<ConversationStreamEvent> {
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
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error)?.name === "AbortError") {
        yield { type: "error", errorType: "network" };
      } else {
        yield { type: "error", errorType: "network" };
      }
      return;
    }

    if (!res.ok) {
      clearTimeout(timeout);
      const classified = classifyHttpError("groq", res.status);
      yield { type: "error", errorType: classified.type };
      return;
    }

    const body_stream = res.body;
    if (!body_stream) {
      clearTimeout(timeout);
      yield { type: "error", errorType: "parse" };
      return;
    }

    const reader = body_stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotAnyToken = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double newlines. Parse complete frames
        // and keep any partial trailing frame in the buffer.
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          // Each frame has one or more lines starting with "data: ". For
          // chat completions there's always just one data line per frame.
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              // Terminator — break out and emit `end` below
              yield { type: "end" };
              return;
            }
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const text = parsed.choices?.[0]?.delta?.content;
              if (typeof text === "string" && text.length > 0) {
                gotAnyToken = true;
                yield { type: "token", text };
              }
            } catch {
              // Ignore un-parseable frames (Groq occasionally emits keep-alives)
            }
          }
        }
      }
      // Stream ended without a [DONE] marker — treat as complete if we got
      // any tokens, else as a parse error.
      if (gotAnyToken) {
        yield { type: "end" };
      } else {
        yield { type: "error", errorType: "parse" };
      }
    } catch {
      yield { type: "error", errorType: "network" };
    } finally {
      clearTimeout(timeout);
      reader.releaseLock();
    }
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
