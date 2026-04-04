/**
 * Integration tests for POST /api/resource-click.
 * Validates that only known resource ids are accepted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const insertResourceClickMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  insertResourceClick: (...args: [string, string, "green" | "yellow" | "red"]) =>
    insertResourceClickMock(...args),
}));

import { POST } from "../resource-click/route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/resource-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/resource-click", () => {
  it("accepts a known resource id", async () => {
    insertResourceClickMock.mockResolvedValue(undefined);
    const res = await POST(
      buildRequest({
        sessionId: "11111111-1111-4111-8111-111111111111",
        resourceKey: "helpline_988",
        tier: "red",
      }) as never
    );
    expect(res.status).toBe(204);
    expect(insertResourceClickMock).toHaveBeenCalledOnce();
  });

  it("rejects an unknown resource id", async () => {
    const res = await POST(
      buildRequest({
        sessionId: "11111111-1111-4111-8111-111111111111",
        resourceKey: "fake_resource_xyz",
        tier: "red",
      }) as never
    );
    expect(res.status).toBe(400);
    expect(insertResourceClickMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed resource key", async () => {
    const res = await POST(
      buildRequest({
        sessionId: "11111111-1111-4111-8111-111111111111",
        resourceKey: "Has Spaces And CAPS",
        tier: "red",
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-UUID sessionId", async () => {
    const res = await POST(
      buildRequest({
        sessionId: "not-a-uuid",
        resourceKey: "helpline_988",
        tier: "red",
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
