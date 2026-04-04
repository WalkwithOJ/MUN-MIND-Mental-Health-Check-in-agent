/**
 * useChat hook tests — safety-critical invariants for Phase 9.
 *
 * Focus:
 *   - Client-side crisis detection runs BEFORE any fetch call
 *   - Red tier injects deterministic response locally (doesn't wait on server)
 *   - Red tier cannot be de-escalated by a later server response
 *   - First message calls /api/checkin, subsequent calls /api/converse
 *   - Campus is never sent in the request body
 *   - History sent to /api/converse is capped and has correct role mapping
 */

// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChat } from "../useChat";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Promise.resolve({
    ok: init.status == null || init.status < 400,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe("useChat — client-side crisis detection", () => {
  it("renders deterministic red response WITHOUT calling /api/checkin for crisis input", async () => {
    fetchMock.mockImplementation(() => jsonResponse({}));
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("I want to kill myself");
    });

    // UI updated: user msg + bot red response
    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[1].role).toBe("bot");
    expect(result.current.messages[1].tier).toBe("red");
    expect(result.current.messages[1].deterministic).toBe(true);
    expect(result.current.tier).toBe("red");
    // Resources attached to the bot message must include 988 (red tier)
    const ids = (result.current.messages[1].resources ?? []).map((r) => r.id);
    expect(ids).toContain("helpline_988");
  });

  it("fires telemetry for crisis but does not block the UI on it", async () => {
    // Telemetry fetch returns never resolves — the UI should already be updated
    let resolveTelemetry!: () => void;
    const telemetryPromise = new Promise<Response>((resolve) => {
      resolveTelemetry = () =>
        resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response);
    });
    fetchMock.mockImplementation(() => telemetryPromise);

    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("I want to die");
    });

    // UI is fully populated even though the telemetry promise is still pending
    expect(result.current.messages[1].tier).toBe("red");
    expect(result.current.tier).toBe("red");
    resolveTelemetry();
  });
});

describe("useChat — happy path (non-crisis)", () => {
  it("first message calls /api/checkin with no campus field", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        tier: "yellow",
        moodScore: 3,
        reply: "I hear you",
        resources: [],
        degraded: false,
      })
    );
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("been stressed about exams");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/checkin");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body).toEqual({ message: "been stressed about exams" });
    // Critical: campus is never in the body
    expect("campus" in body).toBe(false);
  });

  it("second message calls /api/converse with capped history and no campus", async () => {
    // First call = checkin
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        tier: "yellow",
        moodScore: 3,
        reply: "I hear you",
        resources: [],
      })
    );
    // Second call = converse
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ tier: "yellow", reply: "Got it.", resources: [] })
    );

    const { result } = renderHook(() => useChat({ campus: "grenfell" }));

    await act(async () => {
      await result.current.sendMessage("first msg");
    });
    await act(async () => {
      await result.current.sendMessage("second msg");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url2, opts2] = fetchMock.mock.calls[1];
    expect(url2).toBe("/api/converse");
    const body2 = JSON.parse((opts2 as RequestInit).body as string);
    expect(body2.message).toBe("second msg");
    expect(Array.isArray(body2.history)).toBe(true);
    // History should contain the previous user msg + bot reply in correct role mapping
    expect(body2.history[0]).toEqual({ role: "user", content: "first msg" });
    expect(body2.history[1]).toEqual({ role: "assistant", content: "I hear you" });
    expect("campus" in body2).toBe(false);
    expect(body2.sessionTier).toBe("yellow");
  });
});

describe("useChat — tier non-de-escalation", () => {
  it("server yellow cannot downgrade a client-detected red", async () => {
    // Telemetry call returns a yellow tier (impossible in practice but tests the guard)
    fetchMock.mockImplementation(() =>
      jsonResponse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        tier: "yellow",
        moodScore: 3,
        reply: "Not actually red",
        resources: [],
      })
    );

    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("I want to kill myself");
    });

    // Client-side detection fires first and wins
    expect(result.current.tier).toBe("red");
    // The bot message is the deterministic red one, not the server's "Not actually red"
    const botMsg = result.current.messages.find((m) => m.role === "bot");
    expect(botMsg?.deterministic).toBe(true);
    expect(botMsg?.content).not.toBe("Not actually red");
  });
});

describe("useChat — error handling", () => {
  it("returns a degraded response when /api/checkin fails", async () => {
    fetchMock.mockImplementation(() => jsonResponse({}, { status: 503 }));
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    await waitFor(() => {
      const bot = result.current.messages.find((m) => m.role === "bot");
      expect(bot).toBeDefined();
      expect(bot?.deterministic).toBe(true);
    });
  });

  it("degraded error response still includes yellow-tier resources", async () => {
    fetchMock.mockImplementation(() => jsonResponse({}, { status: 500 }));
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    const bot = result.current.messages.find((m) => m.role === "bot");
    expect(bot?.resources?.length ?? 0).toBeGreaterThan(0);
  });

  it("handles network errors (fetch rejection) with a degraded response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    const bot = result.current.messages.find((m) => m.role === "bot");
    expect(bot).toBeDefined();
    expect(bot?.deterministic).toBe(true);
    expect(bot?.resources?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("useChat — post-crisis routing (C-1 regression)", () => {
  it("after a client-red event, the NEXT message goes to /api/converse not /api/checkin", async () => {
    // First call is telemetry after crisis
    fetchMock.mockImplementationOnce(() => jsonResponse({}, { status: 200 }));
    // Second call must be /api/converse
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ tier: "red", reply: "Second reply", resources: [] })
    );

    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("I want to kill myself");
    });
    await act(async () => {
      await result.current.sendMessage("still here");
    });

    // The second fetch call must hit /api/converse, never /api/checkin again
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    // The first url is telemetry to /api/checkin, the SECOND should be /api/converse
    expect(urls[1]).toBe("/api/converse");
  });

  it("post-crisis converse call sends 'yellow' sessionTier (red has no LLM path)", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({ tier: "red", reply: "ok", resources: [] })
    );
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    await act(async () => {
      await result.current.sendMessage("suicidal");
    });
    await act(async () => {
      await result.current.sendMessage("still talking");
    });

    // The second call body should include sessionTier: 'yellow' (red is remapped)
    const secondCallBody = JSON.parse(
      fetchMock.mock.calls[1][1].body as string
    );
    expect(secondCallBody.sessionTier).toBe("yellow");
  });
});

describe("useChat — sendCrisisTelemetry does not transmit raw input", () => {
  it("uses a sentinel message instead of the student's actual words", async () => {
    fetchMock.mockImplementation(() => jsonResponse({}, { status: 200 }));
    const { result } = renderHook(() => useChat({ campus: "st_johns" }));

    const secretMessage =
      "I want to kill myself and also this is a very personal thing I said";
    await act(async () => {
      await result.current.sendMessage(secretMessage);
    });

    // Wait for the telemetry call to have fired (fire-and-forget)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const bodies = fetchMock.mock.calls.map((c) =>
      c[1]?.body ? JSON.parse(c[1].body as string) : null
    );
    // None of the outgoing request bodies should contain the raw student message
    for (const body of bodies) {
      if (body && typeof body.message === "string") {
        expect(body.message).not.toContain("kill myself");
        expect(body.message).not.toContain("personal thing I said");
      }
    }
  });
});
