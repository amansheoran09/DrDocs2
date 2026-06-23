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
