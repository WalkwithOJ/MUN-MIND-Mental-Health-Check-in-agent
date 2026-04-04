/**
 * Session-scoped storage for onboarding state.
 *
 * We use `sessionStorage` (not localStorage) so:
 *   - The privacy acknowledgment + campus choice live only for the current tab
 *   - Closing the tab clears everything, honoring the "session-scoped" promise
 *     from the privacy notice
 *   - No persistent cross-session identifier exists (privacy invariant)
 *
 * Campus is NEVER sent to the server. It lives here client-side only, purely
 * to filter the resource directory. See docs/research-brief.md §4.3 and
 * docs/PRD.md §6 (Privacy Architecture).
 */

export type CampusId = "st_johns" | "grenfell" | "marine" | "any";

const KEY_PRIVACY_ACK = "mun-mind:privacy-ack";
const KEY_CAMPUS = "mun-mind:campus";
const KEY_HAS_VISITED = "mun-mind:has-visited";

const VALID_CAMPUSES: readonly CampusId[] = [
  "st_johns",
  "grenfell",
  "marine",
  "any",
] as const;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    // Private browsing modes can throw on storage access.
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage quota exceeded or disabled — silently degrade. The onboarding
    // flow still works, it just won't remember state on page reload.
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// --- Privacy acknowledgment ---

export function hasAcknowledgedPrivacy(): boolean {
  return safeGet(KEY_PRIVACY_ACK) === "1";
}

export function setPrivacyAcknowledged(): void {
  safeSet(KEY_PRIVACY_ACK, "1");
}

// --- Campus selection ---

export function getCampus(): CampusId | null {
  const raw = safeGet(KEY_CAMPUS);
  if (!raw) return null;
  if ((VALID_CAMPUSES as readonly string[]).includes(raw)) {
    return raw as CampusId;
  }
  // Malformed value — clear and return null so the user is re-prompted.
  safeRemove(KEY_CAMPUS);
  return null;
}

export function setCampus(campus: CampusId): void {
  if (!(VALID_CAMPUSES as readonly string[]).includes(campus)) {
    throw new Error(`Invalid campus id: ${campus}`);
  }
  safeSet(KEY_CAMPUS, campus);
}

// --- Return-visit detection ---

export function isReturnVisit(): boolean {
  return safeGet(KEY_HAS_VISITED) === "1";
}

export function markVisited(): void {
  safeSet(KEY_HAS_VISITED, "1");
}

// --- Reset (used by tests and "start over" flows) ---

export function clearOnboardingState(): void {
  safeRemove(KEY_PRIVACY_ACK);
  safeRemove(KEY_CAMPUS);
  safeRemove(KEY_HAS_VISITED);
}
