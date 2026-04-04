-- MUN MIND — Resource key format constraint
--
-- Prevents abuse/DoS by constraining resource_key to opaque snake_case ids up
-- to 64 characters. Matches the format enforced in src/config/resources.json
-- and src/lib/config.ts's Zod validator.
--
-- Rationale: WITH CHECK (true) on the anon INSERT policy is intentional (we
-- have no user identity to filter on), but it means a buggy client or a
-- direct POST could spam arbitrarily long strings into this column. The DB
-- constraint is the authoritative guard.

alter table public.resource_clicks
  drop constraint if exists resource_clicks_resource_key_format;

alter table public.resource_clicks
  add constraint resource_clicks_resource_key_format
  check (length(resource_key) <= 64 and resource_key ~ '^[a-z0-9_-]+$');
