-- DrDocs — consolidated schema for a HOSTED Supabase project.
-- Paste this whole file into the Supabase SQL Editor and Run, then run
-- supabase/seed.sql. Excludes the local-only 0000 shim (Supabase already
-- provides the auth schema, roles and auth.uid()).
-- Generated from supabase/migrations/0001..0012 — do not edit by hand.

-- ============================================================
-- 0001_core_user_tables.sql
-- ============================================================
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

-- ============================================================
-- 0002_document_tables.sql
-- ============================================================
-- 0002_document_tables.sql
-- DocVault — Section 4.2 Document Tables
-- ---------------------------------------------------------------------------

-- TABLE: documents ----------------------------------------------------------
create table if not exists public.documents (
  doc_id            uuid         primary key default gen_random_uuid(),
  user_id           uuid         not null references public.users (user_id) on delete cascade,
  member_id         uuid         references public.family_members (member_id) on delete cascade,
  doc_type          varchar(30)  not null
                    check (doc_type in (
                      'aadhaar', 'pan', 'passport', 'driving_license', 'voter_id',
                      'birth_cert', 'marriage_cert', 'class10_cert', 'class12_cert',
                      'vehicle_rc', 'bank_passbook', 'ration_card', 'pension_card',
                      'health_card', 'other')),
  doc_number        varchar(50),
  full_name_on_doc  varchar(100) not null,
  dob_on_doc        date,
  issue_date        date,
  expiry_date       date,                     -- null for non-expiring docs
  issuing_authority varchar(100),
  doc_image_url     text,                     -- encrypted S3 url
  thumbnail_url     text,
  source            varchar(20)  not null
                    check (source in ('camera_scan', 'gallery', 'digilocker', 'manual')),
  ocr_confidence    real         check (ocr_confidence between 0.0 and 1.0),
  is_verified       boolean      not null default false,
  status            varchar(20)  not null default 'valid'
                    check (status in ('valid', 'expiring_soon', 'expired', 'needs_renewal')),
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

comment on column public.documents.doc_number is 'Stored value; always masked to last 4 digits in the UI.';

-- TABLE: alerts -------------------------------------------------------------
create table if not exists public.alerts (
  alert_id           uuid         primary key default gen_random_uuid(),
  user_id            uuid         not null references public.users (user_id) on delete cascade,
  doc_id             uuid         references public.documents (doc_id) on delete cascade,
  alert_type         varchar(40)  not null
                     check (alert_type in (
                       'expiry_180', 'expiry_90', 'expiry_60_dl', 'expiry_30', 'expiry_7',
                       'expiry_overdue', 'link_gap_pan_aadhaar', 'name_mismatch',
                       'doc_missing', 'renewal_due')),
  severity           varchar(10)  not null
                     check (severity in ('critical', 'urgent', 'warning', 'info')),
  title              varchar(100) not null,
  message            text         not null,
  is_read            boolean      not null default false,
  is_dismissed       boolean      not null default false,
  related_service_id uuid,        -- FK added in 0003 after services exists
  created_at         timestamptz  not null default now(),
  fires_at           timestamptz  not null,
  sent_at            timestamptz
);

-- ============================================================
-- 0003_service_order_tables.sql
-- ============================================================
-- 0003_service_order_tables.sql
-- DocVault — Section 4.3 Service and Order Tables
-- ---------------------------------------------------------------------------

-- TABLE: services (catalogue) ----------------------------------------------
create table if not exists public.services (
  service_id    uuid         primary key default gen_random_uuid(),
  category      varchar(30)  not null
                check (category in ('pan', 'aadhaar', 'passport', 'driving_license',
                                    'voter_id', 'certificate', 'nri')),
  name          varchar(100) not null,
  description   text         not null,
  what_we_do    text         not null,
  docs_required jsonb        not null default '[]'::jsonb,
  govt_fee      integer      not null default 0 check (govt_fee >= 0),     -- paise
  service_fee   integer      not null default 0 check (service_fee >= 0),  -- paise
  total_price   integer      not null check (total_price >= 0),            -- paise
  estimated_days integer     not null check (estimated_days >= 0),
  is_active     boolean      not null default true,
  sort_order    integer      not null default 0
);

-- alerts.related_service_id can now reference services -----------------------
alter table public.alerts
  drop constraint if exists alerts_related_service_id_fkey;
alter table public.alerts
  add constraint alerts_related_service_id_fkey
  foreign key (related_service_id) references public.services (service_id) on delete set null;

-- TABLE: orders -------------------------------------------------------------
create table if not exists public.orders (
  order_id             uuid         primary key default gen_random_uuid(),
  user_id              uuid         not null references public.users (user_id) on delete cascade,
  service_id           uuid         not null references public.services (service_id),
  agent_id             uuid         references public.users (user_id),
  status               varchar(30)  not null default 'pending_payment'
                       check (status in ('pending_payment', 'confirmed', 'agent_assigned',
                                         'en_route', 'collected', 'processing',
                                         'completed', 'cancelled')),
  booking_date         date         not null,
  booking_slot         varchar(30)  not null,
  address_line1        text         not null,
  address_city         varchar(50)  not null,
  address_pincode      varchar(6)   not null check (address_pincode ~ '^[0-9]{6}$'),
  total_amount         integer      not null check (total_amount >= 0),   -- paise
  payment_id           varchar(100),
  payment_status       varchar(20)  not null default 'pending'
                       check (payment_status in ('pending', 'paid', 'refunded')),
  promo_code           varchar(20),
  discount_amount      integer      not null default 0 check (discount_amount >= 0),
  doccash_used         integer      not null default 0 check (doccash_used >= 0),
  agent_commission     integer      check (agent_commission >= 0),
  special_instructions text,
  completed_at         timestamptz,
  rating               integer      check (rating between 1 and 5),
  review_text          text,
  created_at           timestamptz  not null default now()
);

-- ============================================================
-- 0004_referral_earnings_tables.sql
-- ============================================================
-- 0004_referral_earnings_tables.sql
-- DocVault — Section 4.4 Referral and Earnings Tables
-- ---------------------------------------------------------------------------

-- TABLE: referrals ----------------------------------------------------------
create table if not exists public.referrals (
  referral_id      uuid         primary key default gen_random_uuid(),
  referrer_user_id uuid         not null references public.users (user_id) on delete cascade,
  referred_user_id uuid         references public.users (user_id) on delete set null,
  referral_code    varchar(12)  not null,
  status           varchar(20)  not null default 'pending'
                   check (status in ('pending', 'registered',
                                     'first_service_completed', 'rewarded')),
  reward_amount    integer      not null default 0 check (reward_amount >= 0),  -- paise
  created_at       timestamptz  not null default now(),
  rewarded_at      timestamptz
);

-- TABLE: doccash_transactions ----------------------------------------------
create table if not exists public.doccash_transactions (
  txn_id       uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references public.users (user_id) on delete cascade,
  amount       integer      not null,   -- paise; +credit / -debit
  type         varchar(30)  not null
               check (type in ('earned_referral', 'earned_review', 'earned_agent',
                               'earned_profile', 'redeemed_service',
                               'redeemed_bank_transfer', 'redeemed_voucher')),
  reference_id uuid,                     -- related order_id or referral_id
  description  varchar(200) not null,
  created_at   timestamptz  not null default now()
);

-- TABLE: agent_profiles -----------------------------------------------------
create table if not exists public.agent_profiles (
  agent_id           uuid        primary key
                                 references public.users (user_id) on delete cascade,
  certification_date date,
  rating             real        not null default 5.0 check (rating between 0 and 5),
  total_orders       integer     not null default 0 check (total_orders >= 0),
  areas_served       text[]      not null default '{}',
  availability       jsonb,
  bio                varchar(50),
  bank_account_number varchar(20),
  bank_ifsc          varchar(11),
  upi_id             varchar(50),
  total_earnings     integer     not null default 0 check (total_earnings >= 0), -- paise
  pending_payout     integer     not null default 0 check (pending_payout >= 0)  -- paise
);

-- ============================================================
-- 0005_security_support_tables.sql
-- ============================================================
-- 0005_security_support_tables.sql
-- DocVault — supporting tables for Section 10 (Security & Privacy) and
-- Section 3.5 (notification preferences) / Section 8 (notification log).
-- ---------------------------------------------------------------------------

-- DPDPA 2023 consent log (Section 10) --------------------------------------
create table if not exists public.consent_log (
  consent_id uuid         primary key default gen_random_uuid(),
  user_id    uuid         not null references public.users (user_id) on delete cascade,
  action     varchar(80)  not null,   -- e.g. 'tnc_accepted', 'digilocker_linked'
  consented  boolean      not null default true,
  ip_address inet,
  created_at timestamptz  not null default now()
);

-- Super-admin audit log (Section 10) ---------------------------------------
create table if not exists public.audit_log (
  audit_id   uuid         primary key default gen_random_uuid(),
  admin_id   uuid,                       -- admin acting; null for system jobs
  action     varchar(120) not null,
  target     varchar(120),
  metadata   jsonb,
  created_at timestamptz  not null default now()
);

-- Per-user notification preferences (Screen PR-03) -------------------------
create table if not exists public.notification_preferences (
  user_id            uuid    primary key references public.users (user_id) on delete cascade,
  expiry_alerts      boolean not null default true,
  order_updates      boolean not null default true,
  referral_updates   boolean not null default true,
  promotional        boolean not null default false,
  -- days-before-expiry timings the user wants to be warned at
  alert_timings      integer[] not null default '{180,90,30,7}',
  updated_at         timestamptz not null default now()
);

-- Outbound push notification log (Section 8) -------------------------------
create table if not exists public.notifications (
  notification_id uuid         primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users (user_id) on delete cascade,
  template_id     varchar(10)  not null,           -- NTF-01 .. NTF-14
  title           varchar(140) not null,
  body            text         not null,
  deep_link       varchar(40),                      -- e.g. 'AL-02'
  is_sent         boolean      not null default false,
  sent_at         timestamptz,
  created_at      timestamptz  not null default now()
);

-- Cross-document linkage status (Screen AL-04) -----------------------------
create table if not exists public.link_status (
  link_id        uuid         primary key default gen_random_uuid(),
  user_id        uuid         not null references public.users (user_id) on delete cascade,
  link_type      varchar(40)  not null
                 check (link_type in ('pan_aadhaar', 'aadhaar_bank',
                                      'aadhaar_mobile', 'dl_aadhaar_address')),
  is_linked      boolean      not null default false,
  last_checked   timestamptz,
  unique (user_id, link_type)
);

-- Agent certification progress (Screen ER-04) ------------------------------
create table if not exists public.agent_certification_progress (
  progress_id  uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (user_id) on delete cascade,
  module_no    integer     not null check (module_no between 1 and 5),
  completed    boolean     not null default false,
  quiz_score   integer     check (quiz_score between 0 and 100),
  completed_at timestamptz,
  unique (user_id, module_no)
);

-- ============================================================
-- 0006_indexes.sql
-- ============================================================
-- 0006_indexes.sql
-- Indexes that back the most frequent access patterns described in Section 3.
-- ---------------------------------------------------------------------------

-- DW-01 "All Documents" — fetch all docs for a user ordered by expiry urgency
create index if not exists idx_documents_user        on public.documents (user_id);
create index if not exists idx_documents_member      on public.documents (member_id);
create index if not exists idx_documents_expiry      on public.documents (expiry_date);
create index if not exists idx_documents_user_status on public.documents (user_id, status);

-- AL-01 "Alerts Centre" — alerts for a user by priority
create index if not exists idx_alerts_user           on public.alerts (user_id);
create index if not exists idx_alerts_fires_at       on public.alerts (fires_at) where sent_at is null;
create index if not exists idx_alerts_user_unread    on public.alerts (user_id) where is_read = false;

-- SV-08 "Order History" — orders by user, newest first
create index if not exists idx_orders_user           on public.orders (user_id, created_at desc);
create index if not exists idx_orders_agent          on public.orders (agent_id);
create index if not exists idx_orders_pincode_open   on public.orders (address_pincode)
  where status in ('confirmed');           -- agent assignment lookup

-- ER-02 referral tracking
create index if not exists idx_referrals_referrer    on public.referrals (referrer_user_id);

-- ER-05 DocCash wallet history
create index if not exists idx_doccash_user          on public.doccash_transactions (user_id, created_at desc);

-- families
create index if not exists idx_family_user           on public.family_members (user_id);

-- services browse (SV-01 / SV-02)
create index if not exists idx_services_category     on public.services (category, sort_order)
  where is_active = true;

-- ============================================================
-- 0007_functions_triggers.sql
-- ============================================================
-- 0007_functions_triggers.sql
-- DocVault — business logic implemented in the database.
--   * Document status derivation       (Section 7.2 colour coding)
--   * Document Health Score algorithm   (Section 6.1)
--   * Family-member 6-profile limit     (Section 2)
--   * updated_at maintenance
-- ---------------------------------------------------------------------------

-- The six "core" Indian documents used by the Completeness sub-score.
create or replace function public.core_doc_types()
returns text[] language sql immutable as $$
  select array['aadhaar','pan','passport','voter_id','driving_license','birth_cert'];
$$;

-- Derive a document's status from its expiry date. -------------------------
-- expiring_soon == within 90 days (matches the orange card border in 7.2).
create or replace function public.compute_doc_status(p_expiry date)
returns varchar language sql immutable as $$
  select case
    when p_expiry is null                       then 'valid'          -- non-expiring
    when p_expiry <  current_date                then 'expired'
    when p_expiry <= current_date + 90           then 'expiring_soon'
    else 'valid'
  end;
$$;

create or replace function public.trg_documents_biu()
returns trigger language plpgsql as $$
begin
  -- Never trust a client-supplied status for an expiring doc; derive it,
  -- but preserve an explicit 'needs_renewal' flag set by the app/agent flow.
  if new.status is distinct from 'needs_renewal' then
    new.status := public.compute_doc_status(new.expiry_date);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists documents_biu on public.documents;
create trigger documents_biu
  before insert or update on public.documents
  for each row execute function public.trg_documents_biu();

-- ---------------------------------------------------------------------------
-- DOCUMENT HEALTH SCORE  (Section 6.1)
-- Computed over the account holder's OWN documents (member_id is null).
-- Returns a jsonb breakdown so screen AL-03 can show the sub-scores too.
-- ---------------------------------------------------------------------------
create or replace function public.health_score_breakdown(p_user_id uuid)
returns jsonb language plpgsql stable as $$
declare
  v_completeness int := 0;
  v_validity     int := 40;
  v_linkage      int := 0;
  v_accuracy     int := 0;
  v_core_present int := 0;
  v_expired      int := 0;
  v_exp30        int := 0;
  v_exp90        int := 0;
  v_links        int := 0;
  v_distinct_names int := 0;
  v_total_named  int := 0;
begin
  -- Completeness: 5 pts per distinct core doc present, capped at 30.
  select count(distinct doc_type)
    into v_core_present
  from public.documents
  where user_id = p_user_id and member_id is null
    and doc_type = any (public.core_doc_types());
  v_completeness := least(v_core_present * 5, 30);

  -- Validity: start 40, deduct per expiry bucket (each doc counts once).
  select
    count(*) filter (where expiry_date < current_date),
    count(*) filter (where expiry_date >= current_date and expiry_date <= current_date + 30),
    count(*) filter (where expiry_date >  current_date + 30 and expiry_date <= current_date + 90)
    into v_expired, v_exp30, v_exp90
  from public.documents
  where user_id = p_user_id and member_id is null and expiry_date is not null;
  v_validity := greatest(0, 40 - (v_expired * 8) - (v_exp30 * 4) - (v_exp90 * 2));

  -- Linkage: 5 pts for each verified cross-link.
  select count(*) into v_links
  from public.link_status
  where user_id = p_user_id and is_linked = true;
  v_linkage := least(v_links * 5, 20);

  -- Accuracy: compare names across the user's own documents.
  select count(distinct lower(btrim(full_name_on_doc))), count(*)
    into v_distinct_names, v_total_named
  from public.documents
  where user_id = p_user_id and member_id is null
    and full_name_on_doc is not null and btrim(full_name_on_doc) <> '';

  if v_total_named = 0 or v_distinct_names <= 1 then
    v_accuracy := 10;                       -- consistent (or nothing to compare)
  elsif exists (                            -- minor mismatch: shared surname
    select 1 from (
      select split_part(lower(btrim(full_name_on_doc)), ' ',
               array_length(string_to_array(btrim(full_name_on_doc), ' '), 1)) as surname
      from public.documents
      where user_id = p_user_id and member_id is null
        and full_name_on_doc is not null and btrim(full_name_on_doc) <> ''
    ) s group by surname having count(*) = v_total_named
  ) then
    v_accuracy := 5;
  else
    v_accuracy := 0;                        -- major mismatch
  end if;

  return jsonb_build_object(
    'completeness', v_completeness,
    'validity',     v_validity,
    'linkage',      v_linkage,
    'accuracy',     v_accuracy,
    'total',        v_completeness + v_validity + v_linkage + v_accuracy,
    'detail', jsonb_build_object(
      'core_docs_present', v_core_present,
      'expired',           v_expired,
      'expiring_30',       v_exp30,
      'expiring_90',       v_exp90,
      'links_verified',    v_links
    )
  );
end;
$$;

create or replace function public.calc_health_score(p_user_id uuid)
returns integer language sql stable as $$
  select (public.health_score_breakdown(p_user_id) ->> 'total')::int;
$$;

-- Persist the recomputed score onto users.doc_health_score.
create or replace function public.refresh_health_score(p_user_id uuid)
returns void language sql as $$
  update public.users
     set doc_health_score = public.calc_health_score(p_user_id),
         updated_at = now()
   where user_id = p_user_id;
$$;

-- Recalculate whenever a document or a link changes. -----------------------
create or replace function public.trg_recalc_health()
returns trigger language plpgsql as $$
begin
  perform public.refresh_health_score(coalesce(new.user_id, old.user_id));
  return null;   -- AFTER trigger
end;
$$;

drop trigger if exists documents_recalc_health on public.documents;
create trigger documents_recalc_health
  after insert or update or delete on public.documents
  for each row execute function public.trg_recalc_health();

drop trigger if exists link_status_recalc_health on public.link_status;
create trigger link_status_recalc_health
  after insert or update or delete on public.link_status
  for each row execute function public.trg_recalc_health();

-- Family-member cap: max 6 sub-profiles per account (Section 2). -----------
create or replace function public.trg_family_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.family_members where user_id = new.user_id) >= 6 then
    raise exception 'Family limit reached: a maximum of 6 family members is allowed per account';
  end if;
  return new;
end;
$$;

drop trigger if exists family_members_limit on public.family_members;
create trigger family_members_limit
  before insert on public.family_members
  for each row execute function public.trg_family_limit();

-- Generic updated_at touch trigger. ----------------------------------------
create or replace function public.trg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_touch on public.users;
create trigger users_touch
  before update on public.users
  for each row execute function public.trg_touch_updated_at();

-- ============================================================
-- 0008_rls_policies.sql
-- ============================================================
-- 0008_rls_policies.sql
-- DocVault — Row Level Security (Section 5.1 + Section 10, P0).
-- Principle: an authenticated user may only read/write rows that belong to
-- them (matched on user_id == auth.uid()). The `services` catalogue is the
-- only public-readable table. Edge Functions use the service_role key, which
-- bypasses RLS, for system jobs (alert generation, payouts, etc).
-- ---------------------------------------------------------------------------

alter table public.users                       enable row level security;
alter table public.family_members              enable row level security;
alter table public.documents                   enable row level security;
alter table public.alerts                       enable row level security;
alter table public.services                      enable row level security;
alter table public.orders                        enable row level security;
alter table public.referrals                     enable row level security;
alter table public.doccash_transactions          enable row level security;
alter table public.agent_profiles                enable row level security;
alter table public.consent_log                   enable row level security;
alter table public.notification_preferences      enable row level security;
alter table public.notifications                 enable row level security;
alter table public.link_status                   enable row level security;
alter table public.agent_certification_progress  enable row level security;
-- audit_log is intentionally NOT user-readable (admin/service_role only).
alter table public.audit_log                     enable row level security;

-- Helper macro pattern: "own row" == user_id = auth.uid() ------------------

-- users: read & update own profile; insert handled at signup (id = auth.uid)
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (user_id = auth.uid());
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (user_id = auth.uid());

-- A generic owner policy for the user-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'family_members','documents','alerts','orders',
    'doccash_transactions','consent_log','notification_preferences',
    'notifications','link_status','agent_certification_progress'
  ] loop
    execute format('drop policy if exists %1$s_owner on public.%1$s;', t);
    execute format($f$
      create policy %1$s_owner on public.%1$s
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end$$;

-- referrals: the referrer owns the row (user_id alias = referrer_user_id).
drop policy if exists referrals_owner on public.referrals;
create policy referrals_owner on public.referrals
  for all using (referrer_user_id = auth.uid())
  with check (referrer_user_id = auth.uid());

-- agent_profiles keyed on agent_id ( == user_id ).
drop policy if exists agent_profiles_owner on public.agent_profiles;
create policy agent_profiles_owner on public.agent_profiles
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- orders: customer owns the order; an assigned agent may read & update it.
drop policy if exists orders_agent_rw on public.orders;
create policy orders_agent_rw on public.orders
  for update using (agent_id = auth.uid()) with check (agent_id = auth.uid());
drop policy if exists orders_agent_read on public.orders;
create policy orders_agent_read on public.orders
  for select using (agent_id = auth.uid());

-- services: catalogue is world-readable to any authenticated user.
drop policy if exists services_read_all on public.services;
create policy services_read_all on public.services
  for select using (true);

-- agent public profiles: any authenticated user may read agent profiles
-- (needed for SV-07 "agent name & photo" and AG-04 public profile).
drop policy if exists agent_profiles_read_all on public.agent_profiles;
create policy agent_profiles_read_all on public.agent_profiles
  for select using (true);

-- ============================================================
-- 0009_grants.sql
-- ============================================================
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

-- ============================================================
-- 0010_doccash_rpc.sql
-- ============================================================
-- 0010_doccash_rpc.sql
-- Atomic DocCash mutation helpers (Section 6.5). Called by Edge Functions
-- (service_role) and by the app via RPC. Doing the ledger insert and the
-- balance update in one function keeps users.doccash_balance consistent with
-- the doccash_transactions ledger.
-- ---------------------------------------------------------------------------

-- Credit (positive) or debit (negative) DocCash, writing a ledger row and
-- updating the cached balance in a single statement-atomic call.
create or replace function public.credit_doccash(
  p_user_id     uuid,
  p_amount      integer,             -- paise; +credit / -debit
  p_type        varchar,
  p_description varchar,
  p_reference_id uuid default null
)
returns integer                       -- new balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  -- Guard against overdrawing on a debit.
  update public.users
     set doccash_balance = doccash_balance + p_amount,
         updated_at = now()
   where user_id = p_user_id
     and doccash_balance + p_amount >= 0
  returning doccash_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'Insufficient DocCash balance for user %', p_user_id
      using errcode = 'check_violation';
  end if;

  insert into public.doccash_transactions(user_id, amount, type, description, reference_id)
  values (p_user_id, p_amount, p_type, p_description, p_reference_id);

  return v_new_balance;
end;
$$;

-- Only the service_role (Edge Functions) may move money directly. End users
-- earn/spend DocCash exclusively through server-side flows, never client RPC.
revoke execute on function public.credit_doccash(uuid, integer, varchar, varchar, uuid)
  from anon, authenticated;
grant execute on function public.credit_doccash(uuid, integer, varchar, varchar, uuid)
  to service_role;

-- ============================================================
-- 0011_email_auth.sql
-- ============================================================
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

-- ============================================================
-- 0012_referral_rpc.sql
-- ============================================================
-- 0012_referral_rpc.sql
-- Make a referral code fully usable at signup. A new user can't write to the
-- referrer's rows under RLS, so this SECURITY DEFINER function performs the
-- whole exchange atomically when the new user submits a code:
--   * validates the code (must exist, can't be your own, one referral per user)
--   * links referred_by on the new user
--   * inserts the referrals row (status 'registered')
--   * credits the referrer Rs.50 DocCash (Section 6.5) via credit_doccash
-- ---------------------------------------------------------------------------

create or replace function public.apply_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
  v_referral_id uuid;
begin
  if v_uid is null then
    return 'not_authenticated';
  end if;

  -- One referral per user.
  if exists (select 1 from public.users where user_id = v_uid and referred_by is not null) then
    return 'already_referred';
  end if;

  select user_id into v_ref
  from public.users
  where referral_code = upper(btrim(p_code)) and user_id <> v_uid;

  if v_ref is null then
    return 'invalid_code';
  end if;

  update public.users set referred_by = v_ref where user_id = v_uid;

  insert into public.referrals (referrer_user_id, referred_user_id, referral_code, status, reward_amount)
  values (v_ref, v_uid, upper(btrim(p_code)), 'registered', 5000)
  returning referral_id into v_referral_id;

  perform public.credit_doccash(v_ref, 5000, 'earned_referral', 'Referral signup bonus', v_referral_id);

  return 'ok';
end;
$$;

revoke execute on function public.apply_referral(text) from anon;
grant execute on function public.apply_referral(text) to authenticated;

