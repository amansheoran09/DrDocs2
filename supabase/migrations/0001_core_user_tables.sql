-- 0001_core_user_tables.sql
-- DocVault — Section 4.1 Core User Tables
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- TABLE: users --------------------------------------------------------------
-- user_id mirrors the id issued by Supabase Auth (auth.users.id).
create table if not exists public.users (
  user_id             uuid        primary key default gen_random_uuid()
                                  references auth.users (id) on delete cascade,
  phone               varchar(10) not null unique,
  full_name           varchar(100) not null,
  dob                 date        not null,
  city                varchar(50) not null default 'Gurgaon',
  email               varchar(100),
  profile_photo_url   text,
  language            varchar(10) not null default 'en'
                                  check (language in ('en', 'hi')),
  referral_code       varchar(12) not null unique,
  referred_by         uuid        references public.users (user_id),
  doc_health_score    integer     not null default 0
                                  check (doc_health_score between 0 and 100),
  subscription_status varchar(20) not null default 'free'
                                  check (subscription_status in ('free', 'member')),
  subscription_expiry date,
  doccash_balance     integer     not null default 0   -- paise
                                  check (doccash_balance >= 0),
  is_agent            boolean     not null default false,
  agent_certified     boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint phone_is_10_digits check (phone ~ '^[0-9]{10}$')
);

comment on table public.users is 'DocVault account holders. user_id == auth.users.id.';
comment on column public.users.doccash_balance is 'DocCash balance in paise (1 rupee = 100 paise).';

-- TABLE: family_members -----------------------------------------------------
create table if not exists public.family_members (
  member_id    uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references public.users (user_id) on delete cascade,
  full_name    varchar(100) not null,
  relationship varchar(20)  not null
               check (relationship in ('Spouse', 'Child', 'Parent', 'Sibling', 'Other')),
  dob          date,
  photo_url    text,
  created_at   timestamptz  not null default now()
);

comment on table public.family_members is
  'Up to 6 sub-profiles per account (enforced in 0008 trigger).';
