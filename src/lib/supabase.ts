/**
 * Supabase clients — anon (for INSERT-only writes from API routes) and
 * service role (for admin aggregate queries only).
 *
 * SERVER-ONLY: the service role key must NEVER reach the browser. The whole
 * module is marked server-only so accidental client imports fail at build time.
 *
 * Schema contract: see supabase/migrations/001_init.sql.
 *   - sessions (id, created_at)
 *   - mood_entries (id, session_id, mood_score, created_at)
 *   - resource_clicks (id, session_id, resource_key, tier, created_at)
 *
 * Anon role has INSERT-only permissions. SELECTs against the anon client
 * return empty (RLS default-deny). If you need aggregate reads, use
 * `getServiceRoleClient()` and enforce k-anonymity in the application layer
 * before returning data from an API route.
 */

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// --- Row shapes (matching supabase/migrations/001_init.sql) ---

export interface SessionRow {
  id: string;
  created_at: string;
}

export interface MoodEntryRow {
  id: string;
  session_id: string;
  mood_score: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface ResourceClickRow {
  id: string;
  session_id: string;
  resource_key: string;
  tier: "green" | "yellow" | "red";
  created_at: string;
}

// Using the untyped SupabaseClient rather than generating a full generated-types
// schema. Our schema is small and stable; the row interfaces above are the
// contract. Individual queries assert return types inline.
export type MunMindClient = SupabaseClient;

// --- Anon client: INSERT only, used by API routes for anonymized writes ---

let _anonClient: MunMindClient | undefined;

/**
 * Returns a Supabase client authenticated with the anon key. This is the client
 * used for writing anonymized session, mood, and resource-click records. It has
 * no SELECT permissions on any table (RLS enforces this).
 *
 * Throws if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.
 */
export function getAnonClient(): MunMindClient {
  if (_anonClient) return _anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    );
  }
  _anonClient = createClient(url, key, {
    auth: {
      // No user sessions — this app is anonymous.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // Minimal headers; no user-identifying content.
      headers: { "x-application-name": "mun-mind" },
    },
  });
  return _anonClient;
}

// --- Service-role client: bypasses RLS, used ONLY for aggregate admin queries ---

let _serviceRoleClient: MunMindClient | undefined;

/**
 * Returns a Supabase client authenticated with the service role key. This
 * client bypasses RLS and can read any row.
 *
 * WARNING: the service role key is a secret. This function must only be called
 * from server-side code (API routes, server components). The application layer
 * is responsible for:
 *   (a) never returning raw rows to clients
 *   (b) enforcing k-anonymity (k >= 15) on any aggregate before serving it
 *
 * Throws if SUPABASE_SERVICE_ROLE_KEY is missing.
 */
export function getServiceRoleClient(): MunMindClient {
  if (_serviceRoleClient) return _serviceRoleClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }
  _serviceRoleClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _serviceRoleClient;
}

// --- Validation helpers ---

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_KEY_RE = /^[a-z0-9_-]{1,64}$/;

function assertUUID(value: string, label: string): void {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`${label} is not a valid UUID`);
  }
}

function assertResourceKey(value: string): void {
  if (typeof value !== "string" || !RESOURCE_KEY_RE.test(value)) {
    throw new Error(
      `Invalid resource_key — must match ${RESOURCE_KEY_RE} (opaque snake_case, ≤64 chars)`
    );
  }
}

// --- High-level anonymized writers (the only API routes should call these) ---

/**
 * Create a new anonymous session row. Returns the generated session id.
 * This id lives in-memory in the chat flow and is used to link mood entries
 * and resource clicks — it is NEVER linked back to a student identity.
 */
export async function createSession(): Promise<string> {
  const client = getAnonClient();
  // Insert with only server-side defaults — id and created_at fill themselves in.
  const { data, error } = await client
    .from("sessions")
    .insert({})
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? "unknown"}`);
  }
  return data.id;
}

/**
 * Insert an anonymized mood entry. If `moodScore` is null (degraded LLM path),
 * this is a no-op to avoid corrupting aggregate metrics with fabricated scores.
 */
export async function insertMoodEntry(
  sessionId: string,
  moodScore: 1 | 2 | 3 | 4 | 5 | null
): Promise<void> {
  if (moodScore === null) return;
  assertUUID(sessionId, "sessionId");
  const client = getAnonClient();
  const { error } = await client
    .from("mood_entries")
    .insert({ session_id: sessionId, mood_score: moodScore });
  if (error) {
    throw new Error(`Failed to insert mood entry: ${error.message}`);
  }
}

/**
 * Record that a student tapped a resource card. Uses the opaque resource id
 * from resources.json — never a human-readable name or phone number.
 */
export async function insertResourceClick(
  sessionId: string,
  resourceKey: string,
  tier: "green" | "yellow" | "red"
): Promise<void> {
  assertUUID(sessionId, "sessionId");
  assertResourceKey(resourceKey);
  const client = getAnonClient();
  const { error } = await client
    .from("resource_clicks")
    .insert({ session_id: sessionId, resource_key: resourceKey, tier });
  if (error) {
    throw new Error(`Failed to insert resource click: ${error.message}`);
  }
}
