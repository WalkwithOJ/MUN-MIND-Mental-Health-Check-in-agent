# Supabase Setup — MUN MIND

This folder holds the versioned database schema for MUN MIND. The app uses a single Supabase project (free tier) for anonymized aggregate metrics only. No personally identifiable information is ever stored.

## What's in here

- `migrations/001_init.sql` — schema for `sessions`, `mood_entries`, `resource_clicks` + Row Level Security policies
- `migrations/002_retention_policy.sql` — `pg_cron` job that deletes sessions older than 30 days

## One-time project setup

### 1. Create a Supabase project

1. Sign up / log in at https://supabase.com
2. Create a new project. Name: `mun-mind`. Region: **Canada (Central)** (required for data residency per the privacy architecture).
3. Choose a strong database password and store it in a password manager.
4. Under **Security**, enable *"Enable automatic RLS"*.

### 2. Grab the three API values

From **Project Settings → API Keys**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- **Publishable key** (the `sb_publishable_...` one) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Secret key** (the `sb_secret_...` one, marked SECRET) → `SUPABASE_SERVICE_ROLE_KEY`

The publishable key is safe for client use because Row Level Security restricts it to INSERT-only on our tables. The secret key bypasses RLS and must NEVER be exposed to the browser.

### 3. Run the migrations

In the Supabase dashboard → **SQL Editor** → **New query**:

1. Paste the full contents of `migrations/001_init.sql`, click **Run**. You should see "Success. No rows returned."
2. Paste the full contents of `migrations/002_retention_policy.sql`, click **Run**.
3. If step 2 errors saying `pg_cron` is not available: go to **Database → Extensions**, search for `pg_cron`, and enable it. Then re-run the file.

### 4. Verify the schema is correct

In **SQL Editor**, run:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

You should see exactly three tables: `sessions`, `mood_entries`, `resource_clicks`. **There should be no `campus`, `ip`, `user_id`, `email`, `message`, `conversation`, or similar identifying columns.** If you see any, something is wrong.

### 5. Verify RLS is active

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
```

All three tables should have `rowsecurity = true`. If any say `false`, RLS is not enforced and the anon key would leak data.

### 6. Verify no UPDATE/DELETE policies exist for anon

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and roles @> ARRAY['anon']
  and cmd in ('UPDATE', 'DELETE');
```

Expected: **zero rows**. If any UPDATE or DELETE policy exists for `anon`, that's a privacy regression — the anon role should only be able to INSERT.

## Operational notes

### Rotating the service role key

If `SUPABASE_SERVICE_ROLE_KEY` is rotated (e.g., suspected compromise), you **must** trigger a Vercel redeployment after updating the env var. The Supabase client is memoized per serverless function instance, so warm instances will continue using the old key until they cold-start. Rotating the key without a redeploy creates a transitional window where admin queries may still use the compromised credential.

### Using the Supabase CLI (alternative setup)

Instead of pasting SQL into the dashboard, MUN IT can use the official CLI for a reproducible migration workflow:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The `supabase/migrations/` directory is ordered by numeric prefix, so migrations run in the intended sequence.

## Updating the schema later

- Never edit existing migration files after they've been run. Create a new file `003_*.sql` for the next change.
- Test migrations on a staging project before running them in production.
- Supabase also supports the `supabase` CLI for migration management, which MUN IT may want to adopt long-term. For the hackathon this dashboard-driven flow is simpler.

## Retention

The `pg_cron` job in `002_retention_policy.sql` deletes sessions older than 30 days every Sunday at 03:00 UTC. Cascading foreign keys remove their mood entries and resource clicks automatically.

To verify the cron job is scheduled:

```sql
select jobname, schedule, command from cron.job where jobname = 'mun-mind-delete-old-sessions';
```

To manually test the deletion:

```sql
insert into public.sessions (id, created_at) values (gen_random_uuid(), now() - interval '31 days');
delete from public.sessions where created_at < now() - interval '30 days';
-- Should delete the row above.
```

## Privacy invariants (do not relax without legal review)

1. **No PII columns** — names, emails, student numbers, IP addresses, device IDs
2. **No quasi-identifiers** — campus, program, year, demographic fields
3. **No conversation text** — messages and LLM replies never persisted
4. **Session IDs are random UUIDs** with no link to identity
5. **Retention: 30 days** — enforced by `pg_cron`
6. **Anon role: INSERT only, no SELECT** — enforced by RLS policies

See `docs/PRD.md` §6 and `docs/research-brief.md` §4 for the full architecture rationale.
