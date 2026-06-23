-- 0011_email_auth.sql
-- Support email + password login alongside the original phone-OTP design.
-- The users.phone column was NOT NULL (login was phone-only); email users
-- have no phone, so relax it. UNIQUE still holds (Postgres allows multiple
-- NULLs under a UNIQUE constraint), and the 10-digit CHECK only applies to
-- non-null values.
-- ---------------------------------------------------------------------------

alter table public.users alter column phone drop not null;

-- Make email the alternate unique identifier for email-based accounts.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_email_key'
  ) then
    alter table public.users add constraint users_email_key unique (email);
  end if;
end$$;
