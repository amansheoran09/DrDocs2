-- 0000_supabase_shim.sql
-- ---------------------------------------------------------------------------
-- LOCAL-ONLY SHIM.
--
-- On the real Supabase platform, the `auth` schema, the `auth.users` table,
-- the `auth.uid()` / `auth.role()` helper functions and the `anon`,
-- `authenticated` and `service_role` roles already exist. This file
-- re-creates just enough of them so that the rest of the migrations in this
-- folder can be applied (and the RLS policies exercised) against a plain
-- PostgreSQL instance for local development and CI.
--
-- DO NOT run this migration against a hosted Supabase project — guard with
-- the IF NOT EXISTS clauses so it is a harmless no-op if it ever is.
-- ---------------------------------------------------------------------------

create schema if not exists auth;

-- Supabase roles ------------------------------------------------------------
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end$$;

-- Minimal stand-in for Supabase's auth.users table --------------------------
create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  phone text unique
);

-- auth.uid(): on Supabase this reads the `sub` claim from the request JWT.
-- Locally we read it from a GUC so tests can impersonate a user with
--   set local request.jwt.claim.sub = '<uuid>';
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;
