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
