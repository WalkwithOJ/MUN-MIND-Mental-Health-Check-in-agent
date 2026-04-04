/**
 * GET /api/diag/llm — development diagnostic for the LLM adapter layer.
 *
 * Tests both Gemini and Groq with a benign input and returns a structured
 * report showing which provider succeeded, failed, or is missing a key.
 *
 * NEVER returns user message content. NEVER exposes API keys. Designed to
 * surface "why are both providers failing" without leaking anything.
 *
 * Development only — in production it 404s so attackers can't fingerprint
 * the provider configuration.
 */

import "server-only";

import { NextResponse } from "next/server";

import { LLMError } from "@/lib/llm/errors";
import { GeminiAdapter } from "@/lib/llm/gemini";
import { GroqAdapter } from "@/lib/llm/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProviderReport {
  provider: string;
  status:
    | "ok"
    | "missing_key"
    | "auth"
    | "rate_limit"
    | "network"
    | "parse"
    | "server"
    | "unknown";
  httpStatus?: number;
  errorMessage?: string;
}

const BENIGN_INPUT = "I had a good day today.";

async function testGemini(): Promise<ProviderReport> {
  try {
    const adapter = new GeminiAdapter();
    const result = await adapter.assess(BENIGN_INPUT);
    return {
      provider: "gemini",
      status: result.reply ? "ok" : "parse",
    };
  } catch (err) {
    return reportError("gemini", err);
  }
}

async function testGroq(): Promise<ProviderReport> {
  try {
    const adapter = new GroqAdapter();
    const result = await adapter.assess(BENIGN_INPUT);
    return {
      provider: "groq",
      status: result.reply ? "ok" : "parse",
    };
  } catch (err) {
    return reportError("groq", err);
  }
}

function reportError(provider: string, err: unknown): ProviderReport {
  if (err instanceof LLMError) {
    return {
      provider,
      status:
        err.type === "auth" && err.message.includes("not set")
          ? "missing_key"
          : err.type,
      httpStatus: err.status,
      errorMessage: err.message,
    };
  }
  return {
    provider,
    status: "unknown",
    errorMessage: err instanceof Error ? err.message : "unknown error",
  };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const envCheck = {
    GOOGLE_AI_STUDIO_API_KEY: Boolean(process.env.GOOGLE_AI_STUDIO_API_KEY),
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
  };

  const [gemini, groq] = await Promise.all([testGemini(), testGroq()]);

  return NextResponse.json({
    envPresent: envCheck,
    providers: { gemini, groq },
    bothUp: gemini.status === "ok" && groq.status === "ok",
    note: "Development-only diagnostic. Never exposes keys or user content.",
  });
}
