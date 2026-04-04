-- MUN MIND — Retention Policy
--
-- Deletes session records (and their cascading mood_entries / resource_clicks)
-- older than 30 days. This enforces the retention policy documented in
-- docs/PRD.md §6 and docs/research-brief.md §4.
--
-- Runs weekly via pg_cron. Supabase Free Tier supports pg_cron — you may need
-- to enable the extension via Database → Extensions in the Supabase dashboard
-- before running this migration.

-- Enable pg_cron if it isn't already (requires database owner privileges).
-- On Supabase, you may need to enable this from the dashboard instead:
--   Database → Extensions → pg_cron → Enable
create extension if not exists pg_cron;

-- Remove any previously scheduled job with the same name so re-running this
-- migration is idempotent.
do $$
begin
  perform cron.unschedule('mun-mind-delete-old-sessions');
exception when others then
  -- Job did not exist — nothing to do.
  null;
end $$;

-- Run every Sunday at 03:00 UTC (quiet hours in Newfoundland).
-- Cascading deletes cover mood_entries and resource_clicks via the foreign key.
select cron.schedule(
  'mun-mind-delete-old-sessions',
  '0 3 * * 0',
  $$ delete from public.sessions where created_at < now() - interval '30 days' $$
);
