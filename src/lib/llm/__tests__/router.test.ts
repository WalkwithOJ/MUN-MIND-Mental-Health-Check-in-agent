/**
 * LLM router tests.
 *
 * These tests mock both providers to verify:
 *   - Happy path: Gemini success returns Gemini result for assess
 *   - Gemini 429 → Groq fallback
 *   - Both fail → deterministic degraded response (NEVER throws)
 *   - History is capped at MAX_HISTORY_MESSAGES before dispatch
 *   - Groq is primary for converse, Gemini is fallback
 *   - Safety-observability logs contain provider/status/tier only (no content)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  routeAssess,
  routeConverse,
  capHistory,
  MAX_HISTORY_MESSAGES,
} from "../router";
import { LLMError, type LLMProvider, type Message } from "../types";

// Spy on console.info so we can assert on log content (and absence of message content)
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});

function makeMock(name: string, behavior: Partial<LLMProvider>): LLMProvider {
  return {
    name,
    assess: vi.fn(behavior.assess ?? (() => Promise.reject(new Error("no assess")))),
    converse: vi.fn(
      behavior.converse ?? (() => Promise.reject(new Error("no converse")))
    ),
  };
}

describe("routeAssess — happy path", () => {
  it("returns Gemini result on success", async () => {
    const gemini = makeMock("gemini", {
      assess: () =>
        Promise.resolve({
          reply: "I hear you",
          moodScore: 3 as const,
          tier: "yellow" as const,
          topicTags: ["stress"],
          degraded: false,
        }),
    });
    const groq = makeMock("groq", {});

    const result = await routeAssess("I'm stressed", { gemini, groq });
    expect(result.reply).toBe("I hear you");
    expect(result.tier).toBe("yellow");
    expect(gemini.assess).toHaveBeenCalledOnce();
    expect(groq.assess).not.toHaveBeenCalled();
  });
});

describe("routeAssess — Gemini 429 fallback to Groq", () => {
  it("falls back to Groq when Gemini rate-limited", async () => {
    const gemini = makeMock("gemini", {
      assess: () =>
        Promise.reject(
          new LLMError("gemini", "rate_limit", "rate limited", 429)
        ),
    });
    const groq = makeMock("groq", {
      assess: () =>
        Promise.resolve({
          reply: "Groq response",
          moodScore: 4 as const,
          tier: "green" as const,
          topicTags: [],
          degraded: false,
        }),
    });

    const result = await routeAssess("hi", { gemini, groq });
    expect(result.reply).toBe("Groq response");
    expect(result.degraded).toBe(false);
    expect(groq.assess).toHaveBeenCalledOnce();
  });

  it("logs fallback event with error type and status but NO message content", async () => {
    const gemini = makeMock("gemini", {
      assess: () =>
        Promise.reject(
          new LLMError("gemini", "rate_limit", "rate limited", 429)
        ),
    });
    const groq = makeMock("groq", {
      assess: () =>
        Promise.resolve({
          reply: "Groq response",
          moodScore: 3 as const,
          tier: "green" as const,
          topicTags: [],
          degraded: false,
        }),
    });

    await routeAssess("this is a private user message", { gemini, groq });
    const allLogs = infoSpy.mock.calls.flat().join(" ");
    expect(allLogs).toContain("gemini");
    expect(allLogs).toContain("rate_limit");
    expect(allLogs).toContain("429");
    // Critical: user message content must never appear in logs
    expect(allLogs).not.toContain("this is a private user message");
    // Critical: LLM reply must never appear in logs
    expect(allLogs).not.toContain("Groq response");
  });
});

describe("routeAssess — both providers fail", () => {
  it("returns deterministic degraded response, never throws", async () => {
    const gemini = makeMock("gemini", {
      assess: () =>
        Promise.reject(new LLMError("gemini", "server", "500", 500)),
    });
    const groq = makeMock("groq", {
      assess: () =>
        Promise.reject(new LLMError("groq", "server", "503", 503)),
    });

    const result = await routeAssess("hi", { gemini, groq });
    expect(result.reply).toBeTruthy();
    // Degraded response has moodScore = null so the caller knows not to persist
    expect(result.moodScore).toBeNull();
    expect(result.tier).toBe("yellow");
    expect(result.degraded).toBe(true);
  });

  it("degraded reply mentions resources are available", async () => {
    const gemini = makeMock("gemini", {
      assess: () => Promise.reject(new LLMError("gemini", "network", "net")),
    });
    const groq = makeMock("groq", {
      assess: () => Promise.reject(new LLMError("groq", "network", "net")),
    });
    const result = await routeAssess("hi", { gemini, groq });
    expect(result.reply).toMatch(/resource|support|help|MUN/i);
  });
});

describe("routeConverse — Groq primary, Gemini fallback", () => {
  it("uses Groq on happy path", async () => {
    const groq = makeMock("groq", {
      converse: () =>
        Promise.resolve({ reply: "Groq conversation reply", degraded: false }),
    });
    const gemini = makeMock("gemini", {});

    const result = await routeConverse([], "hi", { gemini, groq });
    expect(result.reply).toBe("Groq conversation reply");
    expect(groq.converse).toHaveBeenCalledOnce();
    expect(gemini.converse).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when Groq 429", async () => {
    const groq = makeMock("groq", {
      converse: () =>
        Promise.reject(new LLMError("groq", "rate_limit", "429", 429)),
    });
    const gemini = makeMock("gemini", {
      converse: () =>
        Promise.resolve({ reply: "Gemini fallback reply", degraded: false }),
    });

    const result = await routeConverse([], "hi", { gemini, groq });
    expect(result.reply).toBe("Gemini fallback reply");
  });

  it("returns deterministic reply when both fail", async () => {
    const groq = makeMock("groq", {
      converse: () => Promise.reject(new LLMError("groq", "server", "500", 500)),
    });
    const gemini = makeMock("gemini", {
      converse: () =>
        Promise.reject(new LLMError("gemini", "server", "500", 500)),
    });
    const result = await routeConverse([], "hi", { gemini, groq });
    expect(result.reply).toBeTruthy();
  });
});

describe("capHistory", () => {
  it("passes through history shorter than cap", () => {
    const history: Message[] = [
      { role: "user", content: "1" },
      { role: "assistant", content: "2" },
    ];
    expect(capHistory(history)).toEqual(history);
  });

  it("caps long history to the last MAX_HISTORY_MESSAGES entries", () => {
    const history: Message[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `msg-${i}`,
    }));
    const capped = capHistory(history);
    expect(capped.length).toBe(MAX_HISTORY_MESSAGES);
    // Must keep the most recent messages, not the oldest
    expect(capped[capped.length - 1].content).toBe("msg-19");
  });
});

describe("routeConverse — history depth enforcement", () => {
  it("sends capped history to the provider, not the full transcript", async () => {
    const longHistory: Message[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `msg-${i}`,
    }));
    let receivedHistory: Message[] | undefined;
    const groq = makeMock("groq", {
      converse: (history: Message[]) => {
        receivedHistory = history;
        return Promise.resolve({ reply: "ok", degraded: false });
      },
    });
    const gemini = makeMock("gemini", {});

    await routeConverse(longHistory, "new message", { gemini, groq });
    expect(receivedHistory).toBeDefined();
    expect(receivedHistory!.length).toBe(MAX_HISTORY_MESSAGES);
    expect(receivedHistory![0].content).toBe("msg-14");
    expect(
      receivedHistory![MAX_HISTORY_MESSAGES - 1].content
    ).toBe("msg-19");
  });
});

describe("INV: LLM adapter files never log message content", () => {
  it("adapter files do not use console.log / console.debug", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));

    const files = ["../router.ts", "../gemini.ts", "../groq.ts"];
    for (const file of files) {
      const src = readFileSync(resolve(__dirname, file), "utf-8");
      expect(src).not.toMatch(/console\.log/);
      expect(src).not.toMatch(/console\.debug/);
    }
  });

  it("router.ts logSafeEvent never interpolates user content", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));

    const src = readFileSync(resolve(__dirname, "../router.ts"), "utf-8");
    expect(src).toMatch(/function logSafeEvent/);
    // No interpolation of input/history/reply into console.info calls
    expect(src).not.toMatch(/console\.info\([^)]*\binput\b/);
    expect(src).not.toMatch(/console\.info\([^)]*\bhistory\b/);
    expect(src).not.toMatch(/console\.info\([^)]*\breply\b/);
  });
});

describe("INV: production LLM files import server-only", () => {
  it.each(["../router.ts", "../gemini.ts", "../groq.ts"])(
    "%s imports server-only",
    async (file) => {
      const { readFileSync } = await import("node:fs");
      const { resolve, dirname } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const __dirname = dirname(fileURLToPath(import.meta.url));

      const src = readFileSync(resolve(__dirname, file), "utf-8");
      expect(src).toMatch(/import\s+["']server-only["']/);
    }
  );

  it("errors.ts does NOT import server-only (client-safe for error boundaries)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));

    const src = readFileSync(resolve(__dirname, "../errors.ts"), "utf-8");
    expect(src).not.toMatch(/import\s+["']server-only["']/);
  });
});
