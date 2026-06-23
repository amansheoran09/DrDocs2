-- 0009_grants.sql
-- Base table/role privileges.
--
-- Supabase normally provisions these grants automatically for the anon,
-- authenticated and service_role roles. We declare them explicitly so the
-- schema is self-contained and behaves identically on a vanilla PostgreSQL
-- instance: privileges grant *table* access, RLS policies (0008) then filter
-- which *rows* each authenticated user may touch.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

-- authenticated users operate through RLS-protected tables.
grant select, insert, update, delete
  on all tables in schema public to authenticated;

-- anon (pre-login) can read the public service catalogue only; RLS on every
-- other table denies access because anon has no auth.uid().
grant select on all tables in schema public to anon;

-- service_role (Edge Functions / cron) bypasses RLS entirely.
grant all on all tables in schema public to service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- Make the same grants apply to objects created later in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
