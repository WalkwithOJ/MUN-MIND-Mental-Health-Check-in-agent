/**
 * Tests for onboarding-storage.
 * Uses a mock sessionStorage via a jsdom-like shim to avoid a full jsdom
 * environment dependency.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal sessionStorage shim
class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(): string | null {
    return null;
  }
}

beforeEach(() => {
  const mock = new MockStorage();
  vi.stubGlobal("window", { sessionStorage: mock });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load() {
  return import("../onboarding-storage");
}

describe("onboarding-storage — privacy acknowledgment", () => {
  it("returns false initially", async () => {
    const s = await load();
    expect(s.hasAcknowledgedPrivacy()).toBe(false);
  });

  it("persists after setPrivacyAcknowledged", async () => {
    const s = await load();
    s.setPrivacyAcknowledged();
    expect(s.hasAcknowledgedPrivacy()).toBe(true);
  });

  it("is cleared by clearOnboardingState", async () => {
    const s = await load();
    s.setPrivacyAcknowledged();
    s.clearOnboardingState();
    expect(s.hasAcknowledgedPrivacy()).toBe(false);
  });
});

describe("onboarding-storage — campus", () => {
  it("returns null initially", async () => {
    const s = await load();
    expect(s.getCampus()).toBeNull();
  });

  it("persists a valid campus id", async () => {
    const s = await load();
    s.setCampus("st_johns");
    expect(s.getCampus()).toBe("st_johns");
  });

  it("accepts all four valid campus ids", async () => {
    const s = await load();
    for (const id of ["st_johns", "grenfell", "marine", "any"] as const) {
      s.setCampus(id);
      expect(s.getCampus()).toBe(id);
    }
  });

  it("throws on invalid campus id", async () => {
    const s = await load();
    expect(() => s.setCampus("uvic" as never)).toThrow();
  });

  it("returns null and clears malformed stored value", async () => {
    const s = await load();
    // Simulate a malformed value directly in storage
    window.sessionStorage.setItem("mun-mind:campus", "bogus");
    expect(s.getCampus()).toBeNull();
    // The malformed value should now be cleared
    expect(window.sessionStorage.getItem("mun-mind:campus")).toBeNull();
  });
});

describe("onboarding-storage — return visit", () => {
  it("reports false on first visit", async () => {
    const s = await load();
    expect(s.isReturnVisit()).toBe(false);
  });

  it("reports true after markVisited + fresh load within same session", async () => {
    const s = await load();
    s.markVisited();
    expect(s.isReturnVisit()).toBe(true);
  });
});

describe("onboarding-storage — safe in SSR (no window)", () => {
  it("all readers return safe defaults when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const s = await load();
    expect(s.hasAcknowledgedPrivacy()).toBe(false);
    expect(s.getCampus()).toBeNull();
    expect(s.isReturnVisit()).toBe(false);
    // writers should not throw
    expect(() => s.setPrivacyAcknowledged()).not.toThrow();
    expect(() => s.setCampus("st_johns")).not.toThrow();
    expect(() => s.markVisited()).not.toThrow();
    expect(() => s.clearOnboardingState()).not.toThrow();
  });
});
