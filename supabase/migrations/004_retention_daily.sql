-- MUN MIND — Switch retention job to daily
--
-- Previously weekly (worst case: 37-day retention). The PRD commits to 30 days.
-- Switching to daily closes the window to at most 30 days + 24 hours.

do $$
begin
  perform cron.unschedule('mun-mind-delete-old-sessions');
exception when others then
  null;
end $$;

select cron.schedule(
  'mun-mind-delete-old-sessions',
  '0 3 * * *',
  $$ delete from public.sessions where created_at < now() - interval '30 days' $$
);
