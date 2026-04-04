/**
 * Integration tests for POST /api/checkin.
 *
 * These tests verify the safety-critical ordering: crisis detection runs
 * before any LLM or Supabase call, and the no-logging invariant holds.
 *
 * The LLM router and Supabase writers are mocked via vi.mock so these tests
 * never hit the network or the database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM router — tests import the checkin route which transitively
// pulls in the router. We replace it with a controllable stub.
const routeAssessMock = vi.fn();
vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return {
    ...actual,
    routeAssess: (...args: unknown[]) => routeAssessMock(...args),
  };
});

// Mock Supabase so createSession / insertMoodEntry don't hit the DB
const createSessionMock = vi.fn();
const insertMoodEntryMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createSession: () => createSessionMock(),
  insertMoodEntry: (
    ...args: [string, 1 | 2 | 3 | 4 | 5 | null]
  ) => insertMoodEntryMock(...args),
}));

// Must be imported AFTER mocks
import { POST } from "../checkin/route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Silence console.info spam from logApiEvent during tests
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/checkin — crisis path", () => {
  it("returns deterministic red response WITHOUT calling the LLM", async () => {
    const res = await POST(
      buildRequest({ message: "I want to kill myself" }) as never
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tier).toBe("red");
    expect(json.deterministic).toBe(true);
    expect(json.reply).toBeTruthy();
    expect(json.resources.length).toBeGreaterThan(0);
    expect(json.sessionId).toBeNull();

    // Critical: no LLM call, no DB call for the red path
    expect(routeAssessMock).not.toHaveBeenCalled();
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(insertMoodEntryMock).not.toHaveBeenCalled();
  });

  it("does NOT leak message content into response (only the deterministic reply)", async () => {
    const secret = "please help me I told no one else";
    const res = await POST(
      buildRequest({ message: `${secret} I want to die` }) as never
    );
    const json = await res.json();
    expect(json.reply).not.toContain(secret);
  });

  it("surfaces 988 as a red-tier resource", async () => {
    const res = await POST(
      buildRequest({ message: "I'm going to end my life" }) as never
    );
    const json = await res.json();
    const ids = json.resources.map((r: { id: string }) => r.id);
    expect(ids).toContain("helpline_988");
    expect(ids).toContain("nl_crisis_line");
  });
});

describe("POST /api/checkin — happy path", () => {
  beforeEach(() => {
    createSessionMock.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    routeAssessMock.mockResolvedValue({
      tier: "yellow",
      moodScore: 3,
      reply: "I hear you, that sounds really stressful.",
      topicTags: ["academic_stress"],
      degraded: false,
    });
    insertMoodEntryMock.mockResolvedValue(undefined);
  });

  it("creates a session, calls the LLM, and persists the mood entry", async () => {
    const res = await POST(
      buildRequest({ message: "been really stressed about midterms" }) as never
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tier).toBe("yellow");
    expect(json.moodScore).toBe(3);
    expect(json.sessionId).toBe("11111111-1111-4111-8111-111111111111");
    expect(createSessionMock).toHaveBeenCalledOnce();
    expect(routeAssessMock).toHaveBeenCalledOnce();
    expect(insertMoodEntryMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      3
    );
    expect(json.resources.length).toBeGreaterThan(0);
  });

  it("returns yellow-tier resources that do NOT include 911", async () => {
    const res = await POST(
      buildRequest({ message: "feeling overwhelmed" }) as never
    );
    const json = await res.json();
    const ids = json.resources.map((r: { id: string }) => r.id);
    expect(ids).not.toContain("emergency_911");
  });
});

describe("POST /api/checkin — degraded LLM path", () => {
  it("does NOT persist a real mood score when moodScore is null", async () => {
    createSessionMock.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    routeAssessMock.mockResolvedValue({
      tier: "yellow",
      moodScore: null,
      reply: "degraded reply",
      topicTags: [],
      degraded: true,
    });

    const res = await POST(buildRequest({ message: "hi" }) as never);
    const json = await res.json();

    expect(json.moodScore).toBeNull();
    expect(json.degraded).toBe(true);
    // Route calls insertMoodEntry unconditionally; supabase.ts's insertMoodEntry
    // no-ops when moodScore is null (see src/lib/supabase.ts). We assert here
    // that the null is passed through — the supabase-level no-op is tested
    // elsewhere. This test enforces INV-3 at the route boundary.
    expect(insertMoodEntryMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      null
    );
  });
});

describe("POST /api/checkin — validation", () => {
  it("rejects empty message", async () => {
    const res = await POST(buildRequest({ message: "" }) as never);
    expect(res.status).toBe(400);
  });

  it("rejects missing message", async () => {
    const res = await POST(buildRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it("rejects oversized message", async () => {
    const huge = "a".repeat(5000);
    const res = await POST(buildRequest({ message: huge }) as never);
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("http://localhost/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("400 response includes fallback crisis resources", async () => {
    const res = await POST(buildRequest({ message: "" }) as never);
    const json = await res.json();
    expect(json.fallbackResources).toBeDefined();
    expect(json.fallbackResources.length).toBeGreaterThan(0);
  });
});

describe("POST /api/checkin — DB failure", () => {
  it("returns 503 with fallback resources when session creation fails", async () => {
    createSessionMock.mockRejectedValue(new Error("db down"));
    const res = await POST(
      buildRequest({ message: "just need to vent" }) as never
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.fallbackResources.length).toBeGreaterThan(0);
  });

  it("returns success even if mood insert fails (telemetry-only failure)", async () => {
    createSessionMock.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    routeAssessMock.mockResolvedValue({
      tier: "yellow",
      moodScore: 3,
      reply: "I hear you",
      topicTags: [],
      degraded: false,
    });
    insertMoodEntryMock.mockRejectedValue(new Error("telemetry write failed"));

    const res = await POST(
      buildRequest({ message: "feeling off today" }) as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe("I hear you");
  });
});
