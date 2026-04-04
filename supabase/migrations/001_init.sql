-- MUN MIND — Initial Schema
--
-- PRIVACY INVARIANTS (see docs/PRD.md §6 and docs/research-brief.md §4):
--   1. NO personally identifiable information is ever stored.
--      No names, emails, student numbers, IP addresses, device IDs, or persistent cookies.
--   2. NO quasi-identifiers.
--      No campus, program, year, or demographic columns that could re-identify
--      a student in NL's small population. Campus is stored client-side only.
--   3. NO conversation text.
--      Messages and LLM replies are never persisted server-side.
--   4. Session IDs are random UUIDs with NO external link to identity.
--
-- Row Level Security:
--   - The `anon` role (used by the public-facing app via the anon key) is
--     allowed to INSERT into all three tables and cannot SELECT anything.
--   - The `service_role` (server-only, used by the admin dashboard) bypasses
--     RLS for aggregate queries. The application layer enforces k-anonymity.
--
-- Retention: 30 days, enforced by 002_retention_policy.sql.

-- Sessions — the only table that represents "a student visit"
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Mood entries — anonymized 1-5 scores tied to a session
create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  mood_score smallint not null check (mood_score between 1 and 5),
  created_at timestamptz not null default now()
);

-- Resource clicks — opaque resource ids, never human-readable names
create table if not exists public.resource_clicks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  resource_key text not null,
  tier text not null check (tier in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now()
);

-- Indexes for retention and admin aggregate queries.
-- Nothing is ever queried by individual session id from the app side.
create index if not exists sessions_created_at_idx on public.sessions (created_at);
create index if not exists mood_entries_created_at_idx on public.mood_entries (created_at);
create index if not exists resource_clicks_created_at_idx on public.resource_clicks (created_at);

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.sessions enable row level security;
alter table public.mood_entries enable row level security;
alter table public.resource_clicks enable row level security;

-- Anon role: INSERT only. No SELECT, UPDATE, or DELETE.
-- The app never reads rows back — it only writes anonymized records.

drop policy if exists "anon insert sessions" on public.sessions;
create policy "anon insert sessions"
  on public.sessions
  for insert
  to anon
  with check (true);

drop policy if exists "anon insert mood_entries" on public.mood_entries;
create policy "anon insert mood_entries"
  on public.mood_entries
  for insert
  to anon
  with check (true);

drop policy if exists "anon insert resource_clicks" on public.resource_clicks;
create policy "anon insert resource_clicks"
  on public.resource_clicks
  for insert
  to anon
  with check (true);

-- No SELECT policies are defined for the anon role. RLS default-deny means
-- `select * from sessions` as anon returns an empty result (RLS-filtered) and
-- no individual row is ever exposed to the browser.

-- service_role bypasses RLS automatically and is used server-side only for
-- the admin aggregate dashboard (Phase 15.4). It is never exposed to the
-- browser. See .env.local SUPABASE_SERVICE_ROLE_KEY.
