/**
 * Integration tests for POST /api/converse.
 * Safety focus: crisis detection before any LLM call; history cap enforcement.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const routeConverseMock = vi.fn();
vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return {
    ...actual,
    routeConverse: (...args: unknown[]) => routeConverseMock(...args),
  };
});

import { POST } from "../converse/route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/converse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/converse — crisis path", () => {
  it("returns deterministic red without calling the LLM", async () => {
    const res = await POST(
      buildRequest({
        message: "I can't go on anymore",
        history: [],
      }) as never
    );
    const json = await res.json();
    expect(json.tier).toBe("red");
    expect(json.deterministic).toBe(true);
    expect(routeConverseMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/converse — happy path", () => {
  beforeEach(() => {
    routeConverseMock.mockResolvedValue({
      reply: "That makes sense.",
      degraded: false,
    });
  });

  it("calls the router and returns yellow tier", async () => {
    const res = await POST(
      buildRequest({
        message: "tell me more",
        history: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hey" },
        ],
      }) as never
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.tier).toBe("yellow");
    expect(json.reply).toBe("That makes sense.");
    expect(routeConverseMock).toHaveBeenCalledOnce();
  });
});

describe("POST /api/converse — yellow resources (INV-6)", () => {
  beforeEach(() => {
    routeConverseMock.mockResolvedValue({
      reply: "Got it.",
      degraded: false,
    });
  });

  it("yellow-tier converse response never contains 911 or campus emergency", async () => {
    const res = await POST(
      buildRequest({
        message: "still stressed",
        history: [],
        sessionTier: "yellow",
      }) as never
    );
    const json = await res.json();
    const ids = json.resources.map((r: { id: string }) => r.id);
    expect(ids).not.toContain("emergency_911");
    expect(ids).not.toContain("mun_campus_enforcement");
    expect(ids).not.toContain("waterford_hospital_psych");
    expect(ids).not.toContain("hsc_emergency");
  });

  it("respects sessionTier green vs yellow for resource selection", async () => {
    const resGreen = await POST(
      buildRequest({
        message: "doing okay",
        history: [],
        sessionTier: "green",
      }) as never
    );
    const green = await resGreen.json();
    expect(green.tier).toBe("green");
    const greenIds = green.resources.map((r: { id: string }) => r.id);
    // Green resources should NOT include crisis lines
    expect(greenIds).not.toContain("helpline_988");
    expect(greenIds).not.toContain("nl_crisis_line");
  });
});

describe("POST /api/converse — LLM unexpected throw", () => {
  it("returns 503 with fallback resources when routeConverse throws", async () => {
    routeConverseMock.mockRejectedValue(new Error("unexpected"));
    const res = await POST(
      buildRequest({ message: "hi", history: [] }) as never
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.fallbackResources).toBeDefined();
    expect(json.fallbackResources.length).toBeGreaterThan(0);
  });
});

describe("POST /api/converse — validation", () => {
  it("rejects history arrays longer than the transport limit", async () => {
    const longHistory = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i}`,
    }));
    const res = await POST(
      buildRequest({ message: "hi", history: longHistory }) as never
    );
    expect(res.status).toBe(400);
  });

  it("rejects oversized message", async () => {
    const res = await POST(
      buildRequest({ message: "a".repeat(5000), history: [] }) as never
    );
    expect(res.status).toBe(400);
  });
});
