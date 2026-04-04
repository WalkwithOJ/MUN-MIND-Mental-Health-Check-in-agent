/**
 * Escalation: maps a crisis tier to the resource bundle that should be surfaced.
 *
 * Client-safe — reads resources.json directly, not through @/lib/config. This
 * module runs in the browser and in API routes alike.
 *
 * Resources are ordered by their `priority` field (ascending — 0 is highest).
 * Red-tier escalations always surface resources with `"red"` in their `tiers`
 * array; Yellow gets both yellow and green; Green gets green only.
 */

import resourcesJson from "@/config/resources.json";

import type { CrisisTier } from "./crisis-detector";

export type CampusId = "st_johns" | "grenfell" | "marine" | "any";

export interface Resource {
  id: string;
  name: string;
  description: string;
  phone: string | null;
  text?: string | null;
  url: string | null;
  hours: string;
  campuses: CampusId[];
  tiers: CrisisTier[];
  category: string;
  priority: number;
}

interface ResourcesFile {
  resources: Resource[];
}

const resources = (resourcesJson as unknown as ResourcesFile).resources;

/**
 * Return the list of resources appropriate for a given tier and optional campus.
 *
 * A resource is only included if its `tiers` array contains the exact requested tier.
 * This prevents emergency services (911, tagged only `"red"`) from showing up when a
 * student has moderate distress.
 *
 * Sort order:
 *   - Red tier: by priority ascending (911, 988, NL Crisis Line first)
 *   - Yellow/Green: resources that are NOT also red-tagged come first (so MUN
 *     Student Wellness and Togetherall rank above crisis lines that happen to
 *     also apply), then red-tagged resources, each group sorted by priority.
 *     This ensures campus counselling surfaces ahead of crisis hotlines at
 *     moderate distress levels, per PRD §7.
 *
 * If `campus` is provided, resources are filtered to those that list the campus
 * or have `"any"` in their campuses array.
 */
export function getResourcesForTier(
  tier: CrisisTier,
  campus?: CampusId
): Resource[] {
  const tierFilter = (r: Resource): boolean => r.tiers.includes(tier);

  const campusFilter = (r: Resource): boolean => {
    if (!campus) return true;
    return r.campuses.includes(campus) || r.campuses.includes("any");
  };

  const filtered = resources.filter(tierFilter).filter(campusFilter);

  if (tier === "red") {
    return filtered.slice().sort((a, b) => a.priority - b.priority);
  }

  // For yellow/green, split into two buckets and put tier-native resources first.
  const tierNative = filtered.filter((r) => !r.tiers.includes("red"));
  const alsoRed = filtered.filter((r) => r.tiers.includes("red"));
  tierNative.sort((a, b) => a.priority - b.priority);
  alsoRed.sort((a, b) => a.priority - b.priority);
  return [...tierNative, ...alsoRed];
}

/**
 * Get a single resource by its opaque id. Returns undefined if not found.
 */
export function getResourceById(id: string): Resource | undefined {
  return resources.find((r) => r.id === id);
}

/**
 * All resources (for the directory page). Sorted by priority.
 */
export function getAllResources(campus?: CampusId): Resource[] {
  return resources
    .filter((r) => {
      if (!campus) return true;
      return r.campuses.includes(campus) || r.campuses.includes("any");
    })
    .slice()
    .sort((a, b) => a.priority - b.priority);
}
