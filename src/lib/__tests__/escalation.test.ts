/**
 * Escalation tier → resource mapping tests.
 *
 * Critical tests:
 *   - Red tier contains 988 and NL Crisis Line
 *   - Yellow tier does NOT contain 911 / Waterford / HSC (alarming for moderate distress)
 *   - Campus filtering preserves 24/7 national resources
 */

import { describe, it, expect } from "vitest";

import {
  getResourcesForTier,
  getResourceById,
  getAllResources,
} from "../escalation";

describe("getResourcesForTier — red tier", () => {
  it("contains 988 Suicide Crisis Helpline", () => {
    const red = getResourcesForTier("red");
    expect(red.some((r) => r.id === "helpline_988")).toBe(true);
  });

  it("contains NL Provincial Crisis Line", () => {
    const red = getResourcesForTier("red");
    expect(red.some((r) => r.id === "nl_crisis_line")).toBe(true);
  });

  it("contains 911", () => {
    const red = getResourcesForTier("red");
    expect(red.some((r) => r.id === "emergency_911")).toBe(true);
  });

  it("is non-empty for any campus", () => {
    expect(getResourcesForTier("red", "st_johns").length).toBeGreaterThan(0);
    expect(getResourcesForTier("red", "grenfell").length).toBeGreaterThan(0);
    expect(getResourcesForTier("red", "marine").length).toBeGreaterThan(0);
    expect(getResourcesForTier("red", "any").length).toBeGreaterThan(0);
  });

  it("is sorted by priority ascending", () => {
    const red = getResourcesForTier("red");
    for (let i = 1; i < red.length; i++) {
      expect(red[i].priority).toBeGreaterThanOrEqual(red[i - 1].priority);
    }
  });
});

describe("getResourcesForTier — yellow tier (must NOT alarm)", () => {
  it("does NOT contain 911 (alarming for moderate distress)", () => {
    const yellow = getResourcesForTier("yellow");
    expect(yellow.some((r) => r.id === "emergency_911")).toBe(false);
  });

  it("does NOT contain Waterford psychiatric emergency", () => {
    const yellow = getResourcesForTier("yellow");
    expect(yellow.some((r) => r.id === "waterford_hospital_psych")).toBe(false);
  });

  it("does NOT contain HSC emergency", () => {
    const yellow = getResourcesForTier("yellow");
    expect(yellow.some((r) => r.id === "hsc_emergency")).toBe(false);
  });

  it("does NOT contain MUN Campus Enforcement (red only)", () => {
    const yellow = getResourcesForTier("yellow");
    expect(yellow.some((r) => r.id === "mun_campus_enforcement")).toBe(false);
  });

  it("DOES contain MUN Student Wellness Centre", () => {
    const yellow = getResourcesForTier("yellow", "st_johns");
    expect(yellow.some((r) => r.id === "mun_wellness_stjohns")).toBe(true);
  });

  it("DOES contain Good2Talk NL (tagged red+yellow)", () => {
    const yellow = getResourcesForTier("yellow");
    expect(yellow.some((r) => r.id === "good2talk_nl")).toBe(true);
  });
});

describe("getResourcesForTier — green tier (routine wellness)", () => {
  it("does NOT contain 911, 988, or NL Crisis Line", () => {
    const green = getResourcesForTier("green");
    expect(green.some((r) => r.id === "emergency_911")).toBe(false);
    expect(green.some((r) => r.id === "helpline_988")).toBe(false);
    expect(green.some((r) => r.id === "nl_crisis_line")).toBe(false);
  });

  it("contains self-help resources", () => {
    const green = getResourcesForTier("green");
    expect(green.some((r) => r.id === "bridge_the_gapp")).toBe(true);
    expect(green.some((r) => r.id === "mindshift_cbt")).toBe(true);
  });
});

describe("getResourcesForTier — campus filtering", () => {
  it("Grenfell students still get national 24/7 resources", () => {
    const red = getResourcesForTier("red", "grenfell");
    // National resources tagged with 'any' campus must still appear
    expect(red.some((r) => r.id === "helpline_988")).toBe(true);
    expect(red.some((r) => r.id === "nl_crisis_line")).toBe(true);
    expect(red.some((r) => r.id === "emergency_911")).toBe(true);
  });

  it("Grenfell students get Grenfell-specific counselling, not St. John's", () => {
    const yellow = getResourcesForTier("yellow", "grenfell");
    expect(yellow.some((r) => r.id === "grenfell_wellness")).toBe(true);
    expect(yellow.some((r) => r.id === "mun_wellness_stjohns")).toBe(false);
  });

  it("St. John's students get St. John's counselling, not Grenfell", () => {
    const yellow = getResourcesForTier("yellow", "st_johns");
    expect(yellow.some((r) => r.id === "mun_wellness_stjohns")).toBe(true);
    expect(yellow.some((r) => r.id === "grenfell_wellness")).toBe(false);
  });
});

describe("getResourceById", () => {
  it("returns 988 when requested by id", () => {
    const r = getResourceById("helpline_988");
    expect(r).toBeDefined();
    expect(r?.phone).toBe("988");
  });

  it("returns undefined for unknown id", () => {
    expect(getResourceById("nonexistent_resource")).toBeUndefined();
  });
});

describe("getAllResources", () => {
  it("returns all resources when no campus filter", () => {
    const all = getAllResources();
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it("is sorted by priority", () => {
    const all = getAllResources();
    for (let i = 1; i < all.length; i++) {
      expect(all[i].priority).toBeGreaterThanOrEqual(all[i - 1].priority);
    }
  });
});
