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
 * This prevents emergency services (911, tagged only `"red"`) from showing up as the
 * first result when a student has moderate distress (yellow tier) — showing 911 to
 * a stressed student is alarming and can deter them from engaging with appropriate help.
 *
 * If you want a resource to appear at multiple tiers, tag it with multiple tiers in
 * `resources.json` (e.g., `good2talk_nl` is tagged `["red", "yellow"]` so it shows
 * in both red AND yellow results).
 *
 * If `campus` is provided, resources are filtered to those that list the campus
 * OR have `"any"` in their campuses array.
 *
 * Results are sorted ascending by `priority` (0 = highest).
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

  return resources
    .filter(tierFilter)
    .filter(campusFilter)
    .slice()
    .sort((a, b) => a.priority - b.priority);
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
